import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, Sparkles, History, MessagesSquare, ShieldCheck, Cat, Dog } from "lucide-react";
import logo from "@/assets/logo.png";
import hero from "@/assets/hero.jpg";

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
                <Mic className="h-4 w-4" /> Probar ahora
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-6 py-3 text-sm font-medium hover:bg-card">
                Ver cómo funciona
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Datos privados</div>
              <div className="flex items-center gap-2"><Dog className="h-4 w-4 text-primary" /> Perros</div>
              <div className="flex items-center gap-2"><Cat className="h-4 w-4 text-accent" /> Gatos</div>
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

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 md:grid-cols-4">
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

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Pawlingo · Hecho con cariño 🐾
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: Mic, title: "Graba & traduce", desc: "Captura ladridos o maullidos en un toque y obtén la traducción en segundos." },
  { icon: Sparkles, title: "Base científica", desc: "Cada interpretación incluye la etología y patrón acústico que la respalda." },
  { icon: History, title: "Historial", desc: "Guarda todas las traducciones de cada mascota y revísalas cuando quieras." },
  { icon: MessagesSquare, title: "Conversa con tu mascota", desc: "Chatea con la 'voz' de tu peludo en un asistente con su personalidad." },
];
