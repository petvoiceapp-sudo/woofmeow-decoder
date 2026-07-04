import { createFileRoute } from "@tanstack/react-router";

/**
 * Stripe webhook. Configure in Stripe Dashboard → Developers → Webhooks:
 *   Endpoint: https://<your-domain>/api/public/stripe/webhook
 *   Events: checkout.session.completed, customer.subscription.updated,
 *           customer.subscription.deleted, invoice.payment_failed
 * Secrets needed: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */
export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_SECRET_KEY;
        const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret || !whSecret) {
          return new Response("Stripe not configured", { status: 500 });
        }

        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("Missing signature", { status: 400 });

        const body = await request.text();

        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(secret, { apiVersion: "2024-06-20" as never });

        let event: import("stripe").Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
        } catch (err) {
          console.error("[stripe/webhook] Invalid signature", err);
          return new Response("Invalid signature", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        async function upsertFromSubscription(sub: import("stripe").Stripe.Subscription) {
          let userId = sub.metadata?.supabase_user_id as string | undefined;
          if (!userId && typeof sub.customer !== "string" && !("deleted" in sub.customer)) {
            userId = sub.customer.metadata?.supabase_user_id as string | undefined;
          }
          if (!userId) {
            const customer = await stripe.customers.retrieve(
              typeof sub.customer === "string" ? sub.customer : sub.customer.id,
            );
            if (!("deleted" in customer)) {
              userId = customer.metadata?.supabase_user_id as string | undefined;
            }
          }
          if (!userId) {
            console.error("[stripe/webhook] Missing supabase_user_id metadata for sub", sub.id);
            return;
          }
          await writeRow(userId, sub);
        }

        async function writeRow(userId: string, sub: import("stripe").Stripe.Subscription) {
          const active = ["active", "trialing"].includes(sub.status);
          // In Stripe API 2024-06-20+, current_period_end lives on the first subscription item
          const periodEndUnix =
            (sub as unknown as { current_period_end?: number }).current_period_end ??
            sub.items?.data?.[0]?.current_period_end;
          const periodEnd =
            typeof periodEndUnix === "number" ? new Date(periodEndUnix * 1000).toISOString() : null;
          const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

          const { error } = await supabaseAdmin
            .from("subscriptions")
            .upsert(
              {
                user_id: userId,
                plan: active ? "pro" : "free",
                status: sub.status,
                stripe_customer_id: customerId,
                stripe_subscription_id: sub.id,
                current_period_end: periodEnd,
                cancel_at_period_end: !!sub.cancel_at_period_end,
              },
              { onConflict: "user_id" },
            );
          if (error) console.error("[stripe/webhook] upsert failed", error);
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as import("stripe").Stripe.Checkout.Session;
              if (session.subscription) {
                const sub = await stripe.subscriptions.retrieve(
                  typeof session.subscription === "string"
                    ? session.subscription
                    : session.subscription.id,
                );
                await upsertFromSubscription(sub);
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              const sub = event.data.object as import("stripe").Stripe.Subscription;
              await upsertFromSubscription(sub);
              break;
            }
            case "invoice.payment_failed": {
              // Optional: notify user; subscription status will update via subscription.updated
              break;
            }
          }
        } catch (err) {
          console.error("[stripe/webhook] handler error", err);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
