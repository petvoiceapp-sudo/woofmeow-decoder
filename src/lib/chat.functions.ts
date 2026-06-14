import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ChatInput = z.object({
  petId: z.string().nullable().optional(),
  petName: z.string().optional(),
  species: z.enum(["dog", "cat"]),
  message: z.string().min(1).max(2000),
});

export const chatWithPet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // Save user message
    await context.supabase.from("conversations").insert({
      user_id: context.userId,
      pet_id: data.petId ?? null,
      role: "user",
      content: data.message,
    });

    // Fetch last 12 messages for context
    const { data: history } = await context.supabase
      .from("conversations")
      .select("role, content")
      .eq("user_id", context.userId)
      .eq("pet_id", data.petId ?? "00000000-0000-0000-0000-000000000000")
      .order("created_at", { ascending: false })
      .limit(12);

    const ordered = (history ?? []).reverse();
    const speciesEs = data.species === "dog" ? "perro" : "gato";
    const name = data.petName || (data.species === "dog" ? "Firulais" : "Michi");

    const messages = [
      {
        role: "system",
        content: `Eres ${name}, un ${speciesEs} cariñoso y curioso. Respondes en español en primera persona, con personalidad y emojis sutiles propios de tu especie (🐾). Mantén respuestas naturales, breves (1-3 oraciones) y basadas en comportamiento real de ${speciesEs}s. No rompas el personaje.`,
      },
      ...ordered.map((m) => ({ role: m.role === "pet" ? "assistant" : "user", content: m.content })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
    });

    if (res.status === 429) throw new Error("Demasiadas solicitudes. Espera un momento.");
    if (res.status === 402) throw new Error("Se agotaron los créditos de IA.");
    if (!res.ok) throw new Error(`Error de IA (${res.status})`);

    const json = await res.json();
    const reply: string = json?.choices?.[0]?.message?.content ?? "...";

    await context.supabase.from("conversations").insert({
      user_id: context.userId,
      pet_id: data.petId ?? null,
      role: "pet",
      content: reply,
    });

    return { reply };
  });
