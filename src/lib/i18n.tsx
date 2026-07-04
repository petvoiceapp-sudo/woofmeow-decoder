import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "es" | "en";

const DICT = {
  es: {
    "nav.how": "Cómo funciona",
    "nav.science": "Ciencia",
    "nav.pricing": "Precios",
    "nav.faq": "FAQ",
    "nav.signin": "Iniciar sesión",
    "nav.start": "Empezar gratis",

    "hero.tag": "IA + Etología",
    "hero.title1": "Descubre qué te dice",
    "hero.title2": "tu perro o gato",
    "hero.subtitle":
      "Graba un sonido, ladrido o maullido y Pawlingo lo traduce con análisis científico basado en etología, frecuencia y patrón vocal.",
    "hero.try": "Probar gratis",
    "hero.seehow": "Ver cómo funciona",

    "pricing.title": "Empieza gratis. Sube a Pro cuando quieras.",
    "pricing.free": "Gratis",
    "pricing.pro": "Pro",
    "pricing.month": "/mes",
    "pricing.free.sub": "Perfecto para empezar",
    "pricing.pro.sub": "Todo lo de Gratis, más:",
    "pricing.cta.free": "Empezar gratis",
    "pricing.cta.pro": "Hazte Pro",

    "settings.language": "Idioma",
    "settings.subscription": "Suscripción",
    "settings.plan.free": "Plan Gratis",
    "settings.plan.pro": "Plan Pro",
    "settings.upgrade": "Hazte Pro",
    "settings.manage": "Gestionar suscripción",
    "settings.report": "Descargar informe semanal (PDF)",
    "settings.report.hint": "Genera un informe imprimible con la evolución de tu mascota.",
  },
  en: {
    "nav.how": "How it works",
    "nav.science": "Science",
    "nav.pricing": "Pricing",
    "nav.faq": "FAQ",
    "nav.signin": "Sign in",
    "nav.start": "Start free",

    "hero.tag": "AI + Ethology",
    "hero.title1": "Find out what",
    "hero.title2": "your pet is telling you",
    "hero.subtitle":
      "Record a sound, bark or meow and Pawlingo translates it using scientific analysis based on ethology, frequency and vocal pattern.",
    "hero.try": "Try free",
    "hero.seehow": "See how it works",

    "pricing.title": "Start free. Upgrade to Pro whenever you want.",
    "pricing.free": "Free",
    "pricing.pro": "Pro",
    "pricing.month": "/mo",
    "pricing.free.sub": "Perfect to get started",
    "pricing.pro.sub": "Everything in Free, plus:",
    "pricing.cta.free": "Start free",
    "pricing.cta.pro": "Go Pro",

    "settings.language": "Language",
    "settings.subscription": "Subscription",
    "settings.plan.free": "Free plan",
    "settings.plan.pro": "Pro plan",
    "settings.upgrade": "Go Pro",
    "settings.manage": "Manage subscription",
    "settings.report": "Download weekly report (PDF)",
    "settings.report.hint": "Generate a printable report with your pet's evolution.",
  },
} as const;

type Key = keyof (typeof DICT)["es"];

const Ctx = createContext<{ lang: Lang; t: (k: Key) => string; setLang: (l: Lang) => void }>({
  lang: "es",
  t: (k) => k,
  setLang: () => {},
});

const STORAGE_KEY = "pawlingo.lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === "es" || saved === "en") setLangState(saved);
      else {
        const nav = typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "es";
        setLangState(nav === "en" ? "en" : "es");
      }
    } catch {}
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang: (l: Lang) => {
        setLangState(l);
        try {
          localStorage.setItem(STORAGE_KEY, l);
        } catch {}
      },
      t: (k: Key) => DICT[lang][k] ?? DICT.es[k] ?? k,
    }),
    [lang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT() {
  return useContext(Ctx);
}
