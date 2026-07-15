import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  petId: z.string().uuid().nullable().optional(),
  days: z.number().int().min(1).max(90).optional(),
});

/**
 * Weekly / periodic report data for the signed-in user. Requires Pro.
 * Client renders it as a printable page (save as PDF).
 */
export const getPeriodicReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan,status,current_period_end")
      .eq("user_id", userId)
      .maybeSingle();
    const isPro =
      !!sub &&
      sub.plan === "pro" &&
      ["active", "trialing"].includes(sub.status) &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
    if (!isPro) {
      throw new Error("Esta función requiere el plan Pro.");
    }

    const days = data.days ?? 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let q = supabase
      .from("translations")
      .select("id,pet_id,species,mood,intent,translation,confidence,tips,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.petId) q = q.eq("pet_id", data.petId);

    const [{ data: rows }, { data: pets }] = await Promise.all([
      q,
      supabase.from("pets").select("id,name,species,breed"),
    ]);

    const translations = rows ?? [];
    const moodCounts: Record<string, number> = {};
    let confSum = 0;
    let confN = 0;
    for (const t of translations) {
      if (t.mood) moodCounts[t.mood] = (moodCounts[t.mood] ?? 0) + 1;
      if (typeof t.confidence === "number") {
        confSum += t.confidence;
        confN++;
      }
    }
    const dominant = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      generatedAt: new Date().toISOString(),
      days,
      total: translations.length,
      avgConfidence: confN ? Math.round(confSum / confN) : null,
      dominantMood: dominant,
      moodCounts,
      pets: pets ?? [],
      translations,
    };
  });
