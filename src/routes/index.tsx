import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Mic, Sparkles, History, MessagesSquare, ShieldCheck, Cat, Dog,
  Waves, Brain, LineChart, Crown, Check, Loader2, HelpCircle,
} from "lucide-react";
import logo from "@/assets/logo.png";
import hero from "@/assets/hero.jpg";
import { joinWaitlist } from "@/lib/waitlist.functions";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Pawlingo" width={40} height={40} className="rounded-xl" />
          <span className="text-lg font-semibold tracking-tight">Pawlingo</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground">Cómo funciona</a>
          <a href="#science" className="hover:text-foreground">Ciencia</a>
          <a href="#pricing" className="hover:text-foreground">Precios</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <nav className="flex items-center gap-2">
          <Link to="/auth" className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            Iniciar sesión
          </Link>
          <Link to="/auth" className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow">
            Empezar gratis
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-10 pb-24 md:pt-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> IA + Etología
            </span>
            <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Descubre qué te dice<br />
              <span className="text-brand">tu perro o gato</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Graba un sonido, ladrido o maullido y Pawlingo lo traduce con análisis científico basado en etología, frecuencia y patrón vocal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow">
                <Mic className="h-4 w-4" /> Probar gratis
              </Link>
              <a href="#how" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-6 py-3 text-sm font-medium hover:bg-card">
                Ver cómo funciona
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Datos privados</div>
              <div className="flex items-center gap-2"><Dog className="h-4 w-4 text-primary" /> Perros</div>
              <div className="flex items-center gap-2"><Cat className="h-4 w-4 text-accent" /> Gatos</div>
              <div className="flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Basado en ciencia</div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-brand opacity-30 blur-3xl" />
            <div className="overflow-hidden rounded-[2rem] glass shadow-glow">
              <img src={hero} alt="Perro y gato escuchando" width={1536} height={1024} className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 pb-24">
        <SectionHeader eyebrow="Cómo funciona" title="Traduce a tu mascota en 3 pasos" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {HOW.map((h, i) => (
            <div key={h.title} className="glass relative rounded-2xl p-6 shadow-card">
              <div className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground">
                Paso {i + 1}
              </div>
              <div className="mt-2 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/20 text-primary">
                <h.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold">{h.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <SectionHeader eyebrow="Funciones" title="Todo lo que necesitas para entender a tu peludo" />
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 shadow-card">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Science */}
      <section id="science" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="glass rounded-3xl p-10 shadow-card">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
                <Brain className="h-3.5 w-3.5 text-primary" /> Basado en ciencia
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Etología + IA multimodal</h2>
              <p className="mt-4 text-muted-foreground">
                Nuestros análisis combinan principios de etología reconocidos (Coren, Bradshaw, Yin, Mills) con modelos de IA capaces de escuchar frecuencia fundamental, duración, ritmo, modulación e intensidad del sonido.
              </p>
              <p className="mt-3 text-muted-foreground">
                Cada resultado incluye la <strong className="text-foreground">base científica</strong> del análisis: qué patrones acústicos se detectaron y por qué corresponden a esa emoción o intención.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Pawlingo es una herramienta informativa. <Link to="/disclaimer" className="text-primary hover:underline">No sustituye al veterinario</Link>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SCIENCE.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-card/40 p-4">
                  <div className="text-2xl font-bold text-primary">{s.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24">
        <SectionHeader eyebrow="Precios" title="Empieza gratis. Sube a Premium cuando quieras." />
        <div className="mt-10 glass rounded-3xl p-4 md:p-8 shadow-glow">
          <StripePricingTable />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Pago 100% seguro con Stripe · Cancela cuando quieras
        </p>
      </section>


      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 pb-24">
        <SectionHeader eyebrow="Dudas" title="Preguntas frecuentes" />
        <div className="mt-10 space-y-3">
          {FAQ.map((q) => (
            <details key={q.q} className="glass group rounded-2xl p-5 shadow-card">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                <span className="flex items-center gap-2"><HelpCircle className="h-4 w-4 text-primary" /> {q.q}</span>
                <span className="text-muted-foreground transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{q.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="glass rounded-3xl p-10 text-center shadow-glow">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">¿Listo para entender a tu mejor amigo?</h2>
          <p className="mt-3 text-muted-foreground">Crea tu cuenta gratis y guarda el historial de traducciones de todas tus mascotas.</p>
          <Link to="/auth" className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3 text-sm font-medium text-primary-foreground shadow-glow">
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} Pawlingo · Hecho con cariño 🐾</div>
          <div className="flex flex-wrap gap-5">
            <Link to="/terms" className="hover:text-foreground">Términos</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacidad</Link>
            <Link to="/disclaimer" className="hover:text-foreground">Aviso veterinario</Link>
            <a href="mailto:soporte@pawlingo.app" className="hover:text-foreground">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
    </div>
  );
}

function WaitlistForm() {
  const join = useServerFn(joinWaitlist);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await join({ data: { email, source: "landing_pricing" } });
      setDone(true);
      toast.success("¡Listo! Te avisaremos cuando Premium esté disponible.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos guardar tu email.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 rounded-full border border-primary/40 bg-primary/10 px-4 py-3 text-center text-sm text-primary">
        ✓ Estás en la lista de espera
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        className="flex-1 rounded-full border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Avísame
      </button>
    </form>
  );
}

const HOW = [
  { icon: Dog, title: "Registra a tu mascota", desc: "Añade su nombre, especie y foto opcional. Puedes registrar todas las que quieras." },
  { icon: Mic, title: "Graba 3-5 segundos", desc: "Toca el micrófono cuando ladre o maúlle. Añade postura y contexto para mayor precisión." },
  { icon: Sparkles, title: "Recibe la traducción", desc: "La IA analiza el audio y te devuelve la interpretación más probable con consejos." },
];

const FEATURES = [
  { icon: Mic, title: "Graba & traduce", desc: "Captura ladridos o maullidos en un toque y obtén la traducción en segundos." },
  { icon: Sparkles, title: "Base científica", desc: "Cada interpretación incluye la etología y patrón acústico que la respalda." },
  { icon: History, title: "Historial completo", desc: "Guarda todas las traducciones de cada mascota y revísalas cuando quieras." },
  { icon: LineChart, title: "Diario de ánimo", desc: "Visualiza cómo cambia el estado emocional de tu mascota a lo largo del tiempo." },
];

const SCIENCE = [
  { value: "20+", label: "Emociones detectables por especie" },
  { value: "Hz", label: "Análisis de frecuencia fundamental" },
  { value: "IA", label: "Modelo multimodal de última generación" },
  { value: "4", label: "Referentes en etología aplicada" },
];

const FREE = [
  "3 traducciones al día por mascota",
  "Mascotas ilimitadas",
  "Historial completo",
  "Diario de ánimo",
  "Conversación con tu mascota",
];

const PREMIUM = [
  "Traducciones ilimitadas",
  "Análisis de mayor precisión",
  "Informe semanal en PDF",
  "Alertas de posibles problemas de salud",
  "Sin publicidad",
  "Soporte prioritario",
];

const FAQ = [
  { q: "¿Realmente entiende a mi mascota?", a: "Pawlingo no traduce palabras — analiza patrones acústicos (frecuencia, duración, modulación) y los relaciona con estados emocionales estudiados por la etología. Es una interpretación probabilística, no una traducción literal." },
  { q: "¿Se guardan los audios que grabo?", a: "Los audios se envían al modelo de IA solo para generar el resultado. En tu historial únicamente conservamos el texto de la interpretación, no el audio." },
  { q: "¿Reemplaza al veterinario?", a: "No. Pawlingo es una herramienta informativa. Ante cualquier signo de dolor, cambio brusco de conducta o enfermedad, consulta a tu veterinario." },
  { q: "¿Cuántas mascotas puedo registrar?", a: "Todas las que quieras, en cualquiera de los planes." },
  { q: "¿Puedo cancelar Premium?", a: "Sí, cuando esté disponible podrás cancelar cuando quieras desde Ajustes. Mientras tanto puedes apuntarte a la lista de espera." },
];
