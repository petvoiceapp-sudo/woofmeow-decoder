import { useEffect, useState } from "react";
import { Mic, PawPrint, Sparkles, X, ChevronRight } from "lucide-react";

const STORAGE_KEY = "pawlingo.onboarding.v1";

const STEPS = [
  {
    icon: PawPrint,
    title: "Registra tu mascota",
    desc: "Añade nombre, especie y (si quieres) una foto. Puedes tener varias.",
  },
  {
    icon: Mic,
    title: "Graba 3-5 segundos",
    desc: "Acerca el micrófono a tu mascota, evita ruido de fondo y captura un ladrido, maullido o gemido claro.",
  },
  {
    icon: Sparkles,
    title: "Descubre qué te dice",
    desc: "La IA analiza frecuencia, patrón y contexto y te da la interpretación más probable con consejos.",
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {}
  }, []);

  function close() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card/90 p-8 shadow-glow">
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-primary-foreground shadow-glow">
            <Icon className="h-7 w-7" />
          </div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Paso {step + 1} de {STEPS.length}
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">{s.title}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{s.desc}</p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-brand" : "w-1.5 bg-muted"}`}
            />
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            onClick={close}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Saltar
          </button>
          <button
            onClick={() => (isLast ? close() : setStep((v) => v + 1))}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            {isLast ? "Empezar" : "Siguiente"} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
