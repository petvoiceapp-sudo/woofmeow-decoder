import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CheckoutInput = z.object({
  returnUrl: z.string().url().max(500),
});

/** Create a Stripe Checkout Session for the Pro plan. */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CheckoutInput.parse(d))
  .handler(async ({ data, context }) => {
    const secret = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!secret || !priceId) {
      throw new Error(
        "Los pagos aún no están configurados. Añade STRIPE_SECRET_KEY y STRIPE_PRICE_ID en Ajustes → Backend.",
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secret, { apiVersion: "2024-06-20" as never });

    const { userId, supabase } = context;
    const { data: userRes } = await supabase.auth.getUser();
    const email = userRes.user?.email ?? undefined;

    // Reuse Stripe customer if we already have one
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${data.returnUrl}?checkout=success`,
      cancel_url: `${data.returnUrl}?checkout=cancel`,
      subscription_data: { metadata: { supabase_user_id: userId } },
      metadata: { supabase_user_id: userId },
    });

    return { url: session.url };
  });

/** Open Stripe billing portal for the signed-in user. */
export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CheckoutInput.parse(d))
  .handler(async ({ data, context }) => {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new Error("Stripe no está configurado.");

    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      throw new Error("No tienes una suscripción todavía.");
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secret, { apiVersion: "2024-06-20" as never });

    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: data.returnUrl,
    });
    return { url: portal.url };
  });

/** Read the current user's subscription snapshot. */
export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("plan,status,current_period_end,cancel_at_period_end")
      .eq("user_id", context.userId)
      .maybeSingle();

    const isPro =
      !!data &&
      data.plan === "pro" &&
      ["active", "trialing"].includes(data.status) &&
      (!data.current_period_end || new Date(data.current_period_end) > new Date());

    return {
      plan: (isPro ? "pro" : "free") as "pro" | "free",
      status: data?.status ?? "inactive",
      currentPeriodEnd: data?.current_period_end ?? null,
      cancelAtPeriodEnd: !!data?.cancel_at_period_end,
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
    };
  });
