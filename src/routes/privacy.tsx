import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidad — Pawlingo" },
      { name: "description", content: "Cómo Pawlingo recopila, usa y protege tus datos y las grabaciones de tu mascota." },
      { property: "og:title", content: "Política de Privacidad — Pawlingo" },
      { property: "og:description", content: "Cómo Pawlingo recopila, usa y protege tus datos." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
        <h1 className="text-4xl font-bold tracking-tight">Política de Privacidad</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualización: {new Date().toLocaleDateString("es-ES")}</p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Quiénes somos</h2>
            <p>Pawlingo es una aplicación web que ofrece análisis de sonidos de mascotas mediante inteligencia artificial. Puedes contactarnos en <a className="text-primary hover:underline" href="mailto:soporte@pawlingo.app">soporte@pawlingo.app</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Datos que recopilamos</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li><strong className="text-foreground">Cuenta:</strong> email, nombre y (opcional) foto de perfil si usas Google.</li>
              <li><strong className="text-foreground">Mascotas:</strong> nombre, especie, raza, edad y fotos que tú decidas subir.</li>
              <li><strong className="text-foreground">Grabaciones y traducciones:</strong> audios enviados para análisis y los resultados generados por la IA, junto con la fecha, postura y contexto que declares.</li>
              <li><strong className="text-foreground">Datos técnicos mínimos:</strong> logs de errores para mantener el servicio.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Para qué los usamos</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Ofrecerte el servicio de traducción, historial, diario de ánimo y conversación.</li>
              <li>Mejorar la precisión de los análisis y la experiencia general.</li>
              <li>Comunicaciones esenciales (verificación, seguridad, cambios importantes).</li>
            </ul>
            <p className="mt-2"><strong className="text-foreground">No vendemos tus datos ni los cedemos con fines publicitarios.</strong></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Grabaciones de audio</h2>
            <p>Los audios se procesan mediante un proveedor de IA únicamente para generar el resultado. Solo guardamos el <strong className="text-foreground">resultado textual</strong> del análisis en tu historial, salvo que elijas conservar el audio en el futuro.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Proveedores</h2>
            <p>Utilizamos servicios de terceros de confianza para hosting, autenticación, base de datos e IA. Estos proveedores están sujetos a sus propias políticas de privacidad y aplican medidas de seguridad estándar de la industria.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Tus derechos (GDPR y similares)</h2>
            <p>Puedes acceder, corregir, exportar o eliminar tus datos desde la sección <em>Ajustes</em> de la app, o escribiéndonos. Eliminar tu cuenta borra tus mascotas, historial y conversaciones de forma permanente.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Menores</h2>
            <p>El servicio no está dirigido a menores de 16 años.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Cookies</h2>
            <p>Usamos únicamente cookies técnicas necesarias para mantener tu sesión iniciada. No usamos cookies publicitarias ni de seguimiento de terceros.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Cambios</h2>
            <p>Si actualizamos esta política publicaremos la nueva versión aquí con su fecha.</p>
          </section>
        </div>

        <div className="mt-14 flex flex-wrap gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Términos</Link>
          <Link to="/disclaimer" className="hover:text-foreground">Aviso veterinario</Link>
          <Link to="/" className="hover:text-foreground">Inicio</Link>
        </div>
      </main>
    </div>
  );
}
