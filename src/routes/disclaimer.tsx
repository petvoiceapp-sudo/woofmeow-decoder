import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope, AlertTriangle, Heart } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Aviso veterinario — Pawlingo" },
      { name: "description", content: "Pawlingo es una herramienta informativa y de entretenimiento. No sustituye el diagnóstico de un veterinario profesional." },
      { property: "og:title", content: "Aviso veterinario — Pawlingo" },
      { property: "og:description", content: "Pawlingo no sustituye al veterinario. Léelo antes de usar." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Pawlingo" width={36} height={36} className="rounded-xl" />
          <span className="text-base font-semibold">Pawlingo</span>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Inicio</Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-300">
          <AlertTriangle className="h-4 w-4" /> Información importante
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Aviso veterinario</h1>
        <p className="mt-4 text-base text-muted-foreground">
          Pawlingo es una herramienta <strong className="text-foreground">informativa y de entretenimiento</strong> basada en principios etológicos e inteligencia artificial. <strong className="text-foreground">No es un dispositivo médico</strong> y <strong className="text-foreground">no sustituye</strong> la valoración, diagnóstico ni tratamiento de un veterinario colegiado.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Card icon={<Stethoscope className="h-5 w-5" />} title="Ante síntomas, consulta">
            Si tu mascota muestra signos de dolor, cambios bruscos de comportamiento, dificultad para respirar o comer, acude a tu veterinario.
          </Card>
          <Card icon={<AlertTriangle className="h-5 w-5" />} title="Precisión limitada">
            La IA analiza patrones acústicos y contexto declarado; sus interpretaciones son probabilísticas y pueden equivocarse.
          </Card>
          <Card icon={<Heart className="h-5 w-5" />} title="Bienestar animal">
            Usa la app para conocer mejor a tu mascota, nunca para forzar comportamientos, castigos o autotratamientos.
          </Card>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card/50 p-6 text-sm text-muted-foreground">
          <p>Al usar Pawlingo aceptas este aviso y entiendes que los resultados son orientativos. Ante cualquier duda sobre la salud o el bienestar de tu mascota, consulta a un profesional veterinario.</p>
        </div>

        <div className="mt-14 flex flex-wrap gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Términos</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacidad</Link>
          <Link to="/" className="hover:text-foreground">Inicio</Link>
        </div>
      </main>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 shadow-card">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-primary-foreground">{icon}</div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-xs text-muted-foreground">{children}</p>
    </div>
  );
}
