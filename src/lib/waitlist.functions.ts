import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const Input = z.object({
  email: z.string().email().max(320),
  source: z.string().max(64).optional(),
});

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anon) throw new Error("Missing Supabase config");

    const supa = createClient(url, anon, { auth: { persistSession: false } });
    const { error } = await supa
      .from("premium_waitlist")
      .insert({ email: data.email.trim().toLowerCase(), source: data.source ?? "landing" });

    if (error && !/duplicate|unique/i.test(error.message)) {
      console.error("[waitlist]", error);
      throw new Error("No pudimos guardar tu email. Inténtalo de nuevo.");
    }
    return { ok: true };
  });
