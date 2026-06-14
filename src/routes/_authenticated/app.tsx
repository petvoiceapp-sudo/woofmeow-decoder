import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dog, Cat, History as HistoryIcon, MessagesSquare, Mic, Plus, Trash2,
  Sparkles, Lightbulb, LogOut, Send, Loader2, PawPrint, Camera, Heart,
  Brain, Activity, Volume2, ImagePlus,
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
  avatar_url: string | null;
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

/* ---------- Helpers: signed avatar URLs ---------- */
function useAvatarUrls(pets: Pet[]): Record<string, string> {
  const paths = pets.map((p) => p.avatar_url).filter(Boolean) as string[];
  const key = paths.join("|");
  const { data } = useQuery({
    queryKey: ["avatar-urls", key],
    enabled: paths.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("pet-avatars").createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((d) => { if (d.path && d.signedUrl) map[d.path] = d.signedUrl; });
      return map;
    },
  });
  return data ?? {};
}

function PetAvatar({ pet, url, size = 44, ring = false }: { pet: Pet | null; url?: string; size?: number; ring?: boolean }) {
  if (!pet) return null;
  const cls = `relative flex items-center justify-center overflow-hidden rounded-2xl bg-brand text-2xl shadow-glow ${ring ? "ring-2 ring-primary/40" : ""}`;
  return (
    <div className={cls} style={{ width: size, height: size, fontSize: size * 0.55 }}>
      {url ? (
        <img src={url} alt={pet.name} className="h-full w-full object-cover" />
      ) : (
        <span>{pet.species === "dog" ? "🐶" : "🐱"}</span>
      )}
    </div>
  );
}

/* ---------- Mood / Intent visual mapping (premium icons) ---------- */
function moodVisual(mood: string | null | undefined) {
  const m = (mood ?? "").toLowerCase();
  if (/(felic|alegr|content|jugue|excit)/.test(m)) return { emoji: "😄", color: "from-amber-400 to-orange-500" };
  if (/(triste|melanc|solo)/.test(m)) return { emoji: "🥺", color: "from-sky-400 to-indigo-500" };
  if (/(enoj|molest|frust|agresi|enfad)/.test(m)) return { emoji: "😤", color: "from-rose-500 to-red-600" };
  if (/(miedo|asust|ansios|nervi|estres)/.test(m)) return { emoji: "😨", color: "from-violet-400 to-purple-600" };
  if (/(relaj|calm|tranq|som)/.test(m)) return { emoji: "😌", color: "from-emerald-400 to-teal-500" };
  if (/(curi|alert|atent)/.test(m)) return { emoji: "🧐", color: "from-cyan-400 to-blue-500" };
  if (/(hambr|comida|sed)/.test(m)) return { emoji: "🍖", color: "from-amber-500 to-rose-500" };
  if (/(cariñ|amor|afect)/.test(m)) return { emoji: "🥰", color: "from-pink-400 to-rose-500" };
  return { emoji: "🐾", color: "from-primary to-accent" };
}

function intentEmoji(intent: string | null | undefined) {
  const i = (intent ?? "").toLowerCase();
  if (/(juga|jueg)/.test(i)) return "🎾";
  if (/(comer|comid|hambr)/.test(i)) return "🍖";
  if (/(salir|paseo|caminar)/.test(i)) return "🚶";
  if (/(atenc|mira|cari)/.test(i)) return "💖";
  if (/(alerta|aviso|vigil|defen|protec)/.test(i)) return "🛡️";
  if (/(miedo|huir|escond)/.test(i)) return "🙈";
  if (/(saluda|hola)/.test(i)) return "👋";
  if (/(dorm|descan|sue)/.test(i)) return "😴";
  if (/(agua|sed|beber)/.test(i)) return "💧";
  return "🎯";
}

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
  const avatarUrls = useAvatarUrls(pets);

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
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" width={36} height={36} className="rounded-lg" />
            <div>
              <div className="text-sm font-semibold tracking-tight">Pawlingo</div>
              <div className="text-[11px] text-muted-foreground">Traductor científico</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PetSwitcher pets={pets} active={activePet} avatarUrls={avatarUrls} onChange={setActivePetId} />
            <button onClick={signOut} className="rounded-full border border-border p-2 text-muted-foreground transition hover:text-foreground" title="Salir">
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
        {tab === "translate" && <TranslateTab activePet={activePet} pets={pets} avatarUrls={avatarUrls} />}
        {tab === "pets" && <PetsTab pets={pets} avatarUrls={avatarUrls} />}
        {tab === "history" && <HistoryTab pets={pets} avatarUrls={avatarUrls} />}
        {tab === "chat" && <ChatTab activePet={activePet} avatarUrls={avatarUrls} />}
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
function PetSwitcher({ pets, active, avatarUrls, onChange }: { pets: Pet[]; active: Pet | null; avatarUrls: Record<string, string>; onChange: (id: string) => void }) {
  if (pets.length === 0) return <span className="text-xs text-muted-foreground hidden md:inline">Aún sin mascotas</span>;
  const url = active?.avatar_url ? avatarUrls[active.avatar_url] : undefined;
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 py-1 pl-1 pr-3">
      <PetAvatar pet={active} url={url} size={28} />
      <select
        value={active?.id ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer bg-transparent text-sm outline-none"
      >
        {pets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/* -------- Translate Tab -------- */
function TranslateTab({ activePet, pets, avatarUrls }: { activePet: Pet | null; pets: Pet[]; avatarUrls: Record<string, string> }) {
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

  const petUrl = activePet?.avatar_url ? avatarUrls[activePet.avatar_url] : undefined;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
      <div className="glass rounded-3xl p-8 shadow-card">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Volume2 className="h-4 w-4 text-primary" /> Grabar sonido
          </h2>
          <div className="flex rounded-full bg-muted p-1 text-xs">
            <button
              onClick={() => setSpecies("dog")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${species === "dog" ? "bg-brand text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Dog className="h-3.5 w-3.5" /> Perro
            </button>
            <button
              onClick={() => setSpecies("cat")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${species === "cat" ? "bg-brand text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Cat className="h-3.5 w-3.5" /> Gato
            </button>
          </div>
        </div>

        {activePet && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3">
            <PetAvatar pet={activePet} url={petUrl} size={40} />
            <div className="text-sm">
              <div className="font-medium">Traduciendo a {activePet.name}</div>
              <div className="text-xs text-muted-foreground">{activePet.breed || (activePet.species === "dog" ? "Perro" : "Gato")}</div>
            </div>
          </div>
        )}

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
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-4 w-4 text-accent" /> Resultado
        </h2>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
              <Loader2 className="relative h-8 w-8 animate-spin text-primary" />
            </div>
            <span className="text-sm">Analizando con etología...</span>
          </div>
        )}

        {!loading && !result && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
            <div className="text-5xl">🐾</div>
            <p className="max-w-xs text-sm">Graba un sonido para descubrir qué intenta decirte tu mascota.</p>
          </div>
        )}

        {result && <ResultCard result={result} pet={activePet} petUrl={petUrl} />}
      </div>
    </div>
  );
}

function ResultCard({ result, pet, petUrl }: { result: TranslationResult; pet: Pet | null; petUrl?: string }) {
  const m = moodVisual(result.mood);
  return (
    <div className="space-y-5">
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${m.color} p-6 text-white shadow-glow`}>
        <div className="absolute -right-6 -top-6 text-[140px] leading-none opacity-20 select-none">{m.emoji}</div>
        <div className="relative flex items-start gap-4">
          {pet && <PetAvatar pet={pet} url={petUrl} size={56} ring />}
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-widest opacity-80">
              {pet ? `${pet.name} dice` : "Tu mascota dice"}
            </div>
            <p className="mt-1 text-xl font-semibold leading-snug drop-shadow">"{result.translation}"</p>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2 text-xs">
          {result.mood && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 backdrop-blur">
              <span>{m.emoji}</span> {result.mood}
            </span>
          )}
          {result.intent && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 backdrop-blur">
              <span>{intentEmoji(result.intent)}</span> {result.intent}
            </span>
          )}
          {typeof result.confidence === "number" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 backdrop-blur">
              <Activity className="h-3 w-3" /> {result.confidence}%
            </span>
          )}
        </div>
      </div>

      {result.scientific_basis && (
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Brain className="h-4 w-4" />
            </span>
            Base científica
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{result.scientific_basis}</p>
        </div>
      )}

      {result.tips && result.tips.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Lightbulb className="h-4 w-4" />
            </span>
            Consejos
          </div>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {result.tips.map((t, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-accent/20 text-[10px] font-semibold text-accent">{i + 1}</span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* -------- Pets Tab -------- */
function PetsTab({ pets, avatarUrls }: { pets: Pet[]; avatarUrls: Record<string, string> }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"dog" | "cat">("dog");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function onPickPhoto(file: File | null) {
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  function resetForm() {
    setName(""); setBreed(""); setAge(""); setSpecies("dog");
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null); setPhotoPreview(null);
  }

  async function addPet(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      let avatarPath: string | null = null;
      if (photoFile) {
        const ext = (photoFile.name.split(".").pop() || "jpg").toLowerCase();
        avatarPath = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("pet-avatars").upload(avatarPath, photoFile, {
          upsert: false,
          contentType: photoFile.type,
        });
        if (upErr) throw upErr;
      }

      const { error } = await supabase.from("pets").insert({
        user_id: u.user.id,
        name,
        species,
        breed: breed || null,
        age_years: age ? Number(age) : null,
        avatar_url: avatarPath,
      });
      if (error) throw error;

      toast.success(`${name} agregad${species === "dog" ? "o" : "a"} 🐾`);
      resetForm();
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["pets"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function deletePet(p: Pet) {
    if (!confirm("¿Eliminar esta mascota?")) return;
    if (p.avatar_url) {
      await supabase.storage.from("pet-avatars").remove([p.avatar_url]).catch(() => {});
    }
    const { error } = await supabase.from("pets").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["pets"] });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Mis mascotas</h2>
        <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:scale-[1.02]">
          <Plus className="h-4 w-4" /> {open ? "Cancelar" : "Agregar"}
        </button>
      </div>

      {open && (
        <form onSubmit={addPet} className="glass mb-6 rounded-3xl p-6 shadow-card">
          <div className="flex flex-col items-start gap-6 md:flex-row">
            <label className="group relative flex h-28 w-28 flex-none cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card/40 transition hover:border-primary">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-[10px]">Subir foto</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="grid w-full flex-1 gap-3 md:grid-cols-2">
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="rounded-xl border border-border bg-input/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <select value={species} onChange={(e) => setSpecies(e.target.value as "dog" | "cat")} className="rounded-xl border border-border bg-input/40 px-3 py-2.5 text-sm">
                <option value="dog">🐶 Perro</option>
                <option value="cat">🐱 Gato</option>
              </select>
              <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Raza (opcional)" className="rounded-xl border border-border bg-input/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <input type="number" min={0} max={40} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Edad (años)" className="rounded-xl border border-border bg-input/40 px-3 py-2.5 text-sm" />
              <button disabled={saving} className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Heart className="h-4 w-4" /> Guardar mascota</>}
              </button>
            </div>
          </div>
        </form>
      )}

      {pets.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <div className="text-5xl">🐾</div>
          <p className="mt-3">Aún no has agregado ninguna mascota.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pets.map((p) => {
            const url = p.avatar_url ? avatarUrls[p.avatar_url] : undefined;
            return (
              <div key={p.id} className="glass group relative overflow-hidden rounded-3xl p-5 shadow-card transition hover:shadow-glow">
                <div className="flex items-center gap-4">
                  <PetAvatar pet={p} url={url} size={64} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.breed || (p.species === "dog" ? "Perro" : "Gato")}{p.age_years ? ` · ${p.age_years} años` : ""}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {p.species === "dog" ? <Dog className="h-3 w-3" /> : <Cat className="h-3 w-3" />}
                      {p.species === "dog" ? "Perro" : "Gato"}
                    </div>
                  </div>
                  <button onClick={() => deletePet(p)} className="opacity-0 transition group-hover:opacity-100" title="Eliminar">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------- History Tab -------- */
function HistoryTab({ pets, avatarUrls }: { pets: Pet[]; avatarUrls: Record<string, string> }) {
  const { data: items, isLoading } = useQuery({
    queryKey: ["translations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("translations").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as Translation[];
    },
  });

  const petById = useMemo(() => Object.fromEntries(pets.map((p) => [p.id, p])), [pets]);

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold tracking-tight">Historial</h2>
      {isLoading && <div className="text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin" /> Cargando...</div>}
      {!isLoading && (!items || items.length === 0) && (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <HistoryIcon className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3">Tus traducciones aparecerán aquí.</p>
        </div>
      )}
      <div className="space-y-3">
        {items?.map((t) => {
          const m = moodVisual(t.mood);
          const pet = t.pet_id ? petById[t.pet_id] : null;
          const url = pet?.avatar_url ? avatarUrls[pet.avatar_url] : undefined;
          return (
            <div key={t.id} className="glass rounded-2xl p-5 shadow-card transition hover:shadow-glow">
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  {pet ? <PetAvatar pet={pet} url={url} size={28} /> : <span className="text-lg">{t.species === "dog" ? "🐶" : "🐱"}</span>}
                  <span className="font-medium text-foreground">{pet?.name ?? "Sin asignar"}</span>
                </span>
                <span>{new Date(t.created_at).toLocaleString("es")}</span>
              </div>
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br ${m.color} text-lg shadow-glow`}>
                  {m.emoji}
                </div>
                <p className="text-base font-medium leading-snug">"{t.translation}"</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {t.mood && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">{m.emoji} {t.mood}</span>}
                {t.intent && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">{intentEmoji(t.intent)} {t.intent}</span>}
                {typeof t.confidence === "number" && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><Activity className="h-3 w-3" /> {t.confidence}%</span>}
              </div>
              {t.scientific_basis && (
                <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                  <Brain className="h-3.5 w-3.5 flex-none text-primary" />
                  <span>{t.scientific_basis}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------- Chat Tab -------- */
function ChatTab({ activePet, avatarUrls }: { activePet: Pet | null; avatarUrls: Record<string, string> }) {
  const chat = useServerFn(chatWithPet);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const petUrl = activePet?.avatar_url ? avatarUrls[activePet.avatar_url] : undefined;

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
        <PetAvatar pet={activePet} url={petUrl} size={48} ring />
        <div>
          <h2 className="text-xl font-bold tracking-tight">Conversa con {activePet?.name ?? "tu mascota"}</h2>
          <p className="text-xs text-muted-foreground">Chatea con la "voz" de tu peludo, basada en su personalidad.</p>
        </div>
      </div>

      <div ref={scrollRef} className="glass max-h-[55vh] min-h-[40vh] overflow-y-auto rounded-3xl p-5 shadow-card">
        {(!messages || messages.length === 0) && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <div className="mb-2 text-4xl">🐾</div>
            ¡Saluda a {activePet?.name ?? "tu mascota"}!
          </div>
        )}
        <div className="space-y-3">
          {messages?.map((m) => (
            <div key={m.id} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "pet" && <PetAvatar pet={activePet} url={petUrl} size={28} />}
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-brand text-primary-foreground shadow-glow" : "bg-card/80 border border-border"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-end gap-2">
              <PetAvatar pet={activePet} url={petUrl} size={28} />
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
        <button disabled={sending || !input.trim()} className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-primary-foreground shadow-glow transition hover:scale-[1.04] disabled:opacity-60">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
