import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dog, Cat, History as HistoryIcon, MessagesSquare, Mic, Plus, Trash2,
  Sparkles, Lightbulb, LogOut, Send, Loader2, PawPrint,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { translateSound, type TranslationResult } from "@/lib/translate.functions";
import { chatWithPet } from "@/lib/chat.functions";
import { Recorder } from "@/components/Recorder";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppPage,
});

type Pet = {
  id: string;
  name: string;
  species: "dog" | "cat";
  breed: string | null;
  age_years: number | null;
};

type Translation = {
  id: string;
  pet_id: string | null;
  species: "dog" | "cat";
  mood: string | null;
  intent: string | null;
  translation: string;
  confidence: number | null;
  scientific_basis: string | null;
  tips: string[] | null;
  created_at: string;
};

type Message = { id: string; role: "user" | "pet"; content: string; created_at: string };

type Tab = "translate" | "pets" | "history" | "chat";

function AppPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("translate");
  const [activePetId, setActivePetId] = useState<string | null>(null);

  const { data: petsData } = useQuery({
    queryKey: ["pets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pets").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Pet[];
    },
  });
  const pets = petsData ?? [];
  const activePet = pets.find((p) => p.id === activePetId) ?? pets[0] ?? null;

  useEffect(() => {
    if (!activePetId && pets[0]) setActivePetId(pets[0].id);
  }, [pets, activePetId]);

  async function signOut() {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" width={36} height={36} className="rounded-lg" />
            <div>
              <div className="text-sm font-semibold">Pawlingo</div>
              <div className="text-[11px] text-muted-foreground">Traductor científico</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PetSwitcher pets={pets} active={activePet} onChange={setActivePetId} />
            <button onClick={signOut} className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground" title="Salir">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                tab === t.id ? "bg-brand text-primary-foreground shadow-glow" : "bg-card/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === "translate" && <TranslateTab activePet={activePet} pets={pets} />}
        {tab === "pets" && <PetsTab pets={pets} />}
        {tab === "history" && <HistoryTab pets={pets} />}
        {tab === "chat" && <ChatTab activePet={activePet} />}
      </main>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: typeof Mic }[] = [
  { id: "translate", label: "Traducir", icon: Mic },
  { id: "pets", label: "Mascotas", icon: PawPrint },
  { id: "history", label: "Historial", icon: HistoryIcon },
  { id: "chat", label: "Conversación", icon: MessagesSquare },
];

/* -------- Pet switcher -------- */
function PetSwitcher({ pets, active, onChange }: { pets: Pet[]; active: Pet | null; onChange: (id: string) => void }) {
  if (pets.length === 0) return <span className="text-xs text-muted-foreground hidden md:inline">Aún sin mascotas</span>;
  return (
    <select
      value={active?.id ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-sm outline-none focus:border-primary"
    >
      {pets.map((p) => (
        <option key={p.id} value={p.id}>
          {p.species === "dog" ? "🐶" : "🐱"} {p.name}
        </option>
      ))}
    </select>
  );
}

/* -------- Translate Tab -------- */
function TranslateTab({ activePet, pets }: { activePet: Pet | null; pets: Pet[] }) {
  const qc = useQueryClient();
  const translate = useServerFn(translateSound);
  const [species, setSpecies] = useState<"dog" | "cat">(activePet?.species ?? "dog");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => { if (activePet) setSpecies(activePet.species); }, [activePet]);

  async function onRecorded({ base64, format, durationMs, blobUrl }: { base64: string; format: string; durationMs: number; blobUrl: string }) {
    setAudioUrl(blobUrl);
    setLoading(true);
    setResult(null);
    try {
      const res = await translate({
        data: {
          audioBase64: base64,
          format,
          species,
          petId: activePet?.id ?? null,
          petName: activePet?.name,
          durationMs,
        },
      });
      setResult(res.result);
      qc.invalidateQueries({ queryKey: ["translations"] });
      toast.success("¡Traducción lista!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al traducir");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
      <div className="glass rounded-3xl p-8 shadow-card">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Grabar sonido</h2>
          <div className="flex rounded-full bg-muted p-1 text-xs">
            <button
              onClick={() => setSpecies("dog")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${species === "dog" ? "bg-brand text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Dog className="h-3.5 w-3.5" /> Perro
            </button>
            <button
              onClick={() => setSpecies("cat")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${species === "cat" ? "bg-brand text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Cat className="h-3.5 w-3.5" /> Gato
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 py-6">
          <Recorder onRecorded={onRecorded} disabled={loading} />
          {audioUrl && <audio src={audioUrl} controls className="w-full" />}
        </div>

        {pets.length === 0 && (
          <p className="mt-4 rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">
            💡 Agrega una mascota para guardar traducciones asociadas a ella.
          </p>
        )}
      </div>

      <div className="glass rounded-3xl p-8 shadow-card">
        <h2 className="mb-4 text-lg font-semibold">Resultado</h2>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm">Analizando con etología...</span>
          </div>
        )}

        {!loading && !result && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 text-accent" />
            <p className="text-sm">Graba un sonido para ver qué intenta decirte tu mascota.</p>
          </div>
        )}

        {result && <ResultCard result={result} />}
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: TranslationResult }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-brand p-6 text-primary-foreground shadow-glow">
        <div className="text-xs uppercase tracking-wide opacity-80">Tu mascota dice</div>
        <p className="mt-2 text-xl font-semibold leading-snug">"{result.translation}"</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {result.mood && <span className="rounded-full bg-black/20 px-3 py-1">😶 {result.mood}</span>}
          {result.intent && <span className="rounded-full bg-black/20 px-3 py-1">🎯 {result.intent}</span>}
          {typeof result.confidence === "number" && <span className="rounded-full bg-black/20 px-3 py-1">📊 {result.confidence}% confianza</span>}
        </div>
      </div>

      {result.scientific_basis && (
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" /> Base científica
          </div>
          <p className="text-sm text-muted-foreground">{result.scientific_basis}</p>
        </div>
      )}

      {result.tips && result.tips.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4 text-accent" /> Consejos
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {result.tips.map((t, i) => (
              <li key={i} className="flex gap-2"><span className="text-accent">•</span>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* -------- Pets Tab -------- */
function PetsTab({ pets }: { pets: Pet[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"dog" | "cat">("dog");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [saving, setSaving] = useState(false);

  async function addPet(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("pets").insert({
      user_id: u.user.id,
      name,
      species,
      breed: breed || null,
      age_years: age ? Number(age) : null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`${name} agregad${species === "dog" ? "o" : "a"} 🐾`);
    setName(""); setBreed(""); setAge(""); setOpen(false);
    qc.invalidateQueries({ queryKey: ["pets"] });
  }

  async function deletePet(id: string) {
    if (!confirm("¿Eliminar esta mascota?")) return;
    const { error } = await supabase.from("pets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["pets"] });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Mis mascotas</h2>
        <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4" /> {open ? "Cancelar" : "Agregar"}
        </button>
      </div>

      {open && (
        <form onSubmit={addPet} className="glass mb-6 grid gap-3 rounded-2xl p-5 md:grid-cols-4">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="rounded-xl border border-border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary" />
          <select value={species} onChange={(e) => setSpecies(e.target.value as "dog" | "cat")} className="rounded-xl border border-border bg-input/40 px-3 py-2 text-sm">
            <option value="dog">🐶 Perro</option>
            <option value="cat">🐱 Gato</option>
          </select>
          <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Raza (opcional)" className="rounded-xl border border-border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary" />
          <div className="flex gap-2">
            <input type="number" min={0} max={40} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Edad" className="w-full rounded-xl border border-border bg-input/40 px-3 py-2 text-sm" />
            <button disabled={saving} className="rounded-xl bg-brand px-4 text-sm font-medium text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {pets.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <PawPrint className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3">Aún no has agregado ninguna mascota.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pets.map((p) => (
            <div key={p.id} className="glass group rounded-2xl p-5 shadow-card transition hover:shadow-glow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-2xl">
                    {p.species === "dog" ? "🐶" : "🐱"}
                  </div>
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.breed || (p.species === "dog" ? "Perro" : "Gato")}{p.age_years ? ` · ${p.age_years} años` : ""}</div>
                  </div>
                </div>
                <button onClick={() => deletePet(p.id)} className="opacity-0 transition group-hover:opacity-100" title="Eliminar">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------- History Tab -------- */
function HistoryTab({ pets }: { pets: Pet[] }) {
  const { data: items, isLoading } = useQuery({
    queryKey: ["translations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("translations").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as Translation[];
    },
  });

  const petName = (id: string | null) => pets.find((p) => p.id === id)?.name ?? "Sin asignar";

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Historial</h2>
      {isLoading && <div className="text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin" /> Cargando...</div>}
      {!isLoading && (!items || items.length === 0) && (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <HistoryIcon className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3">Tus traducciones aparecerán aquí.</p>
        </div>
      )}
      <div className="space-y-3">
        {items?.map((t) => (
          <div key={t.id} className="glass rounded-2xl p-5 shadow-card">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                {t.species === "dog" ? "🐶" : "🐱"} {petName(t.pet_id)}
              </span>
              <span>{new Date(t.created_at).toLocaleString("es")}</span>
            </div>
            <p className="text-base font-medium">"{t.translation}"</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {t.mood && <span className="rounded-full bg-muted px-2.5 py-1">{t.mood}</span>}
              {t.intent && <span className="rounded-full bg-muted px-2.5 py-1">{t.intent}</span>}
              {typeof t.confidence === "number" && <span className="rounded-full bg-muted px-2.5 py-1">{t.confidence}%</span>}
            </div>
            {t.scientific_basis && <p className="mt-3 text-xs text-muted-foreground">🔬 {t.scientific_basis}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------- Chat Tab -------- */
function ChatTab({ activePet }: { activePet: Pet | null }) {
  const chat = useServerFn(chatWithPet);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, refetch } = useQuery({
    queryKey: ["conversations", activePet?.id ?? "none"],
    queryFn: async () => {
      let q = supabase.from("conversations").select("*").order("created_at", { ascending: true }).limit(100);
      if (activePet) q = q.eq("pet_id", activePet.id);
      else q = q.is("pet_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const message = input.trim();
    setInput("");
    setSending(true);
    try {
      await chat({
        data: {
          petId: activePet?.id ?? null,
          petName: activePet?.name,
          species: activePet?.species ?? "dog",
          message,
        },
      });
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-2xl">
          {activePet?.species === "cat" ? "🐱" : "🐶"}
        </div>
        <div>
          <h2 className="text-xl font-bold">Conversa con {activePet?.name ?? "tu mascota"}</h2>
          <p className="text-xs text-muted-foreground">Chatea con la "voz" de tu peludo, basada en su personalidad.</p>
        </div>
      </div>

      <div ref={scrollRef} className="glass max-h-[55vh] min-h-[40vh] overflow-y-auto rounded-3xl p-5 shadow-card">
        {(!messages || messages.length === 0) && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            ¡Saluda a {activePet?.name ?? "tu mascota"}! 🐾
          </div>
        )}
        <div className="space-y-3">
          {messages?.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user" ? "bg-brand text-primary-foreground" : "bg-card/80 border border-border"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-border bg-card/80 px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> {activePet?.name ?? "tu mascota"} está pensando...
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Escribe a ${activePet?.name ?? "tu mascota"}...`}
          className="flex-1 rounded-full border border-border bg-card/60 px-5 py-3 text-sm outline-none focus:border-primary"
          autoFocus
        />
        <button disabled={sending || !input.trim()} className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-primary-foreground shadow-glow disabled:opacity-60">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
