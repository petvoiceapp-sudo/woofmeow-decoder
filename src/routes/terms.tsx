import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Términos y Condiciones — Pawlingo" },
      { name: "description", content: "Términos y condiciones de uso de Pawlingo, el traductor de perros y gatos con IA." },
      { property: "og:title", content: "Términos y Condiciones — Pawlingo" },
      { property: "og:description", content: "Términos y condiciones de uso de Pawlingo." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen">
      <LegalHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-4xl font-bold tracking-tight">Términos y Condiciones</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualización: {new Date().toLocaleDateString("es-ES")}</p>

        <div className="prose prose-invert mt-10 max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Aceptación</h2>
            <p>Al crear una cuenta o utilizar Pawlingo aceptas estos Términos. Si no estás de acuerdo, no utilices el servicio.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Descripción del servicio</h2>
            <p>Pawlingo es una aplicación de entretenimiento e información que utiliza inteligencia artificial para analizar sonidos de perros y gatos e interpretar posibles estados emocionales e intenciones basándose en principios de etología.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Uso apropiado</h2>
            <p>Te comprometes a usar el servicio de forma legal, sin subir contenido de terceros sin permiso, sin intentar vulnerar la seguridad de la plataforma y sin utilizarlo para fines dañinos hacia animales o personas.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. No sustituye asesoramiento veterinario</h2>
            <p>Las interpretaciones de Pawlingo son <strong className="text-foreground">orientativas</strong> y <strong className="text-foreground">no reemplazan</strong> el diagnóstico ni el tratamiento de un veterinario profesional. Si tu mascota presenta signos de dolor, enfermedad o angustia, consulta a un profesional.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Cuentas</h2>
            <p>Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra en tu cuenta. Debes tener al menos 16 años para usar el servicio.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Contenido del usuario</h2>
            <p>Conservas la propiedad de las grabaciones y fotos que subas. Nos concedes una licencia limitada para procesarlas con el único fin de ofrecerte el servicio.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Plan gratuito y Premium</h2>
            <p>El plan gratuito incluye un número limitado de traducciones diarias por mascota. El plan Premium ofrece funciones adicionales. Los precios y condiciones podrán actualizarse con aviso previo.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Limitación de responsabilidad</h2>
            <p>Pawlingo se ofrece "tal cual". No garantizamos la exactitud absoluta de las interpretaciones. En la medida permitida por la ley, no somos responsables de daños indirectos o consecuentes derivados del uso del servicio.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Modificaciones</h2>
            <p>Podemos actualizar estos Términos. Publicaremos la nueva versión en esta página con su fecha de actualización.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Contacto</h2>
            <p>Para cualquier consulta escríbenos a <a className="text-primary hover:underline" href="mailto:soporte@pawlingo.app">soporte@pawlingo.app</a>.</p>
          </section>
        </div>

        <LegalFooterNav />
      </main>
    </div>
  );
}

function LegalHeader() {
  return (
    <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
      <Link to="/" className="flex items-center gap-3">
        <img src={logo} alt="Pawlingo" width={36} height={36} className="rounded-xl" />
        <span className="text-base font-semibold">Pawlingo</span>
      </Link>
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Inicio</Link>
    </header>
  );
}

function LegalFooterNav() {
  return (
    <div className="mt-14 flex flex-wrap gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground">
      <Link to="/privacy" className="hover:text-foreground">Privacidad</Link>
      <Link to="/disclaimer" className="hover:text-foreground">Aviso veterinario</Link>
      <Link to="/" className="hover:text-foreground">Inicio</Link>
    </div>
  );
}
