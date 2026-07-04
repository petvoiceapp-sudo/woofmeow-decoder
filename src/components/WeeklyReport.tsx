import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, FileText, Printer } from "lucide-react";
import { getPeriodicReport } from "@/lib/report.functions";

type ReportData = Awaited<ReturnType<typeof getPeriodicReport>>;

export function WeeklyReportButton({ isPro, onUpgrade }: { isPro: boolean; onUpgrade: () => void }) {
  const fetchReport = useServerFn(getPeriodicReport);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);

  async function generate() {
    if (!isPro) {
      onUpgrade();
      return;
    }
    setLoading(true);
    try {
      const r = await fetchReport({ data: { days: 7 } });
      setData(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el informe");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={generate}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Generar informe semanal
      </button>
      {data && <ReportModal data={data} onClose={() => setData(null)} />}
    </>
  );
}

function ReportModal({ data, onClose }: { data: ReportData; onClose: () => void }) {
  const pets = new Map(data.pets.map((p) => [p.id, p]));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm print:static print:bg-white print:p-0">
      <div className="my-8 w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl print:m-0 print:max-w-none print:rounded-none print:border-0 print:bg-white">
        <div className="flex items-center justify-between border-b border-border p-4 print:hidden">
          <div className="text-sm font-semibold">Informe semanal — vista previa</div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir / Guardar PDF
            </button>
            <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-xs">
              Cerrar
            </button>
          </div>
        </div>

        <div className="p-8 text-neutral-900 print:text-black" style={{ colorScheme: "light" }}>
          <div className="bg-white p-2">
            <div className="mb-6 flex items-center justify-between border-b pb-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-neutral-500">Pawlingo</div>
                <h1 className="text-2xl font-bold">Informe de {data.days} días</h1>
              </div>
              <div className="text-right text-xs text-neutral-500">
                Generado {new Date(data.generatedAt).toLocaleString()}
              </div>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-4">
              <Stat label="Traducciones" value={String(data.total)} />
              <Stat label="Ánimo dominante" value={data.dominantMood ?? "—"} />
              <Stat label="Confianza media" value={data.avgConfidence != null ? `${data.avgConfidence}%` : "—"} />
            </div>

            {data.total === 0 ? (
              <p className="text-sm text-neutral-600">
                No hubo traducciones en los últimos {data.days} días. Graba a tu mascota para empezar a construir su historial.
              </p>
            ) : (
              <>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                  Distribución emocional
                </h2>
                <div className="mb-6 space-y-1.5">
                  {Object.entries(data.moodCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([mood, count]) => {
                      const pct = Math.round((count / data.total) * 100);
                      return (
                        <div key={mood}>
                          <div className="flex justify-between text-xs">
                            <span className="capitalize">{mood}</span>
                            <span className="text-neutral-500">
                              {count} · {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                            <div className="h-full rounded-full bg-neutral-900" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>

                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                  Traducciones recientes
                </h2>
                <div className="space-y-3">
                  {data.translations.slice(0, 20).map((t) => {
                    const pet = t.pet_id ? pets.get(t.pet_id) : null;
                    return (
                      <div key={t.id} className="rounded-lg border border-neutral-200 p-3 text-sm">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-neutral-500">
                          <span>
                            {pet?.name ?? "Mascota"} · {t.species === "dog" ? "🐶" : "🐱"} · {t.mood ?? "—"}
                            {t.intent ? ` · ${t.intent}` : ""}
                          </span>
                          <span>{new Date(t.created_at).toLocaleString()}</span>
                        </div>
                        <div className="text-neutral-900">"{t.translation}"</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <p className="mt-8 border-t pt-4 text-[10px] text-neutral-500">
              Este informe se basa en interpretaciones probabilísticas de IA. No sustituye la consulta veterinaria.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-bold capitalize">{value}</div>
    </div>
  );
}
