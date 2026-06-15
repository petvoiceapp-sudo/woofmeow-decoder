import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TranslateInput = z.object({
  audioBase64: z.string().min(10),
  format: z.string().default("webm"),
  species: z.enum(["dog", "cat"]),
  petId: z.string().nullable().optional(),
  petName: z.string().optional(),
  durationMs: z.number().optional(),
  posture: z.string().optional(),
  context: z.string().optional(),
});

export type SingleResult = {
  translation: string;
  mood: string;
  intent: string;
  confidence: number;
  scientific_basis: string;
  tips: string[];
};

export type TranslationResult = {
  results: SingleResult[];
};

export const translateSound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TranslateInput.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const speciesEs = data.species === "dog" ? "perro" : "gato";
    const ctxBits: string[] = [];
    if (data.posture) ctxBits.push(`postura corporal observada: ${data.posture}`);
    if (data.context) ctxBits.push(`situación: ${data.context}`);
    const ctxLine = ctxBits.length
      ? `\nContexto extra reportado por el dueño: ${ctxBits.join("; ")}. Úsalo para refinar la interpretación.`
      : "";

    const system = `Eres un etólogo profesional con base científica (Coren, Bradshaw, Yin, Mills). Analiza el sonido de un ${speciesEs}${data.petName ? ` llamado ${data.petName}` : ""} y devuelve UNICAMENTE un JSON válido sin texto extra con esta forma exacta:
{
  "results": [
    {
      "translation": "frase corta en español en primera persona como si la mascota hablara, máximo 2 oraciones, cálida y natural",
      "mood": "una sola palabra en español que describa la emoción dominante",
      "intent": "intención principal en pocas palabras",
      "confidence": número entero 0-100 según la claridad acústica,
      "scientific_basis": "1-2 oraciones citando frecuencia, duración, patrón vocal o etología que respaldan la interpretación",
      "tips": ["3 consejos prácticos y accionables para el dueño en español"]
    },
    ... (mínimo 10 resultados diferentes ordenados de mayor a menor confidence)
  ]
}${ctxLine}

Reglas:
- Genera EXACTAMENTE 10 resultados posibles diferentes.
- Varía los moods: hambriento, asustado, alerta, con sueño, nervioso, feliz, juguetón, enojado, cariñoso, curioso, etc.
- El primero es el más probable (confidence más alto). El último es el menos probable.
- Cada resultado debe ser una interpretación distinta del mismo sonido.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: "Analiza este audio y responde solo con el JSON pedido." },
              { type: "input_audio", input_audio: { data: data.audioBase64, format: data.format } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Demasiadas solicitudes. Espera un momento e intenta de nuevo.");
    if (res.status === 402) throw new Error("Se agotaron los créditos de IA. Agrega créditos para continuar.");
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Error de IA (${res.status}): ${t.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: TranslationResult;
    try {
      const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        translation: content || "No pude interpretar el sonido.",
        mood: "indefinido",
        intent: "indefinido",
        confidence: 0,
        scientific_basis: "",
        tips: [],
      };
    }

    const { data: saved, error } = await context.supabase
      .from("translations")
      .insert({
        user_id: context.userId,
        pet_id: data.petId ?? null,
        species: data.species,
        mood: parsed.mood ?? null,
        intent: parsed.intent ?? null,
        translation: parsed.translation ?? "",
        confidence: typeof parsed.confidence === "number" ? Math.round(parsed.confidence) : null,
        scientific_basis: parsed.scientific_basis ?? null,
        tips: Array.isArray(parsed.tips) ? parsed.tips : null,
        duration_ms: data.durationMs ?? null,
      })
      .select()
      .single();

    if (error) console.error("[translate] save error", error);

    return { result: parsed, savedId: saved?.id ?? null };
  });
