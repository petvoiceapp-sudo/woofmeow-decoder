import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dog, Cat, History as HistoryIcon, MessagesSquare, Mic, Plus, Trash2,
  Sparkles, Lightbulb, LogOut, Send, Loader2, PawPrint, Camera, Heart,
  Brain, Activity, Volume2, ImagePlus, Settings as SettingsIcon, LineChart,
  Smile, Frown, ShieldAlert, Moon, Utensils, Eye, Zap, HelpCircle, Flame,
  HeartHandshake, Wind, Sun, Bone, Footprints, Save,
  Laugh, Beef, Droplets, Bell, Hand, Gamepad2, Cookie, MessageCircle,
  AlertOctagon, PartyPopper,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { translateSound, type TranslationResult } from "@/lib/translate.functions";
import { chatWithPet } from "@/lib/chat.functions";
import { createCheckoutSession, createBillingPortalSession } from "@/lib/stripe.functions";
import { useSubscription } from "@/hooks/useSubscription";
import { Recorder } from "@/components/Recorder";
import { OnboardingModal } from "@/components/OnboardingModal";
import { WeeklyReportButton } from "@/components/WeeklyReport";
import logo from "@/assets/logo.png";
import dogCard from "@/assets/dog-card.png";
import catCard from "@/assets/cat-card.png";

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

type Tab = "translate" | "pets" | "history" | "chat" | "diary" | "settings";

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

/* ---------- Mood / Intent visual mapping (premium Lucide icons) ---------- */
type LucideType = typeof Smile;
type MoodVis = { Icon: LucideType; color: string; label: string; glow: string; accent: string };
function moodVisual(mood: string | null | undefined): MoodVis {
  const m = (mood ?? "").toLowerCase();
  // glow = rgba color used in box-shadow; accent = solid hex for icon tint
  if (/(felic|alegr|content|satisf)/.test(m)) return { Icon: Laugh, color: "from-emerald-400 via-green-500 to-teal-500", label: "feliz", glow: "16,185,129", accent: "#34d399" };
  if (/(jugue|jueg|excit|party)/.test(m)) return { Icon: PartyPopper, color: "from-amber-400 via-orange-500 to-rose-500", label: "juguetón", glow: "249,115,22", accent: "#fb923c" };
  if (/(saluda|hola)/.test(m)) return { Icon: MessageCircle, color: "from-teal-400 via-cyan-500 to-sky-500", label: "saludando", glow: "14,165,233", accent: "#22d3ee" };
  if (/(triste|melanc|solitar|solo|aburri)/.test(m)) return { Icon: Frown, color: "from-sky-400 via-indigo-500 to-blue-600", label: "triste", glow: "59,130,246", accent: "#60a5fa" };
  if (/(enoj|molest|frust|agresi|enfad|irrit|territ|advert)/.test(m)) return { Icon: AlertOctagon, color: "from-rose-500 via-red-500 to-orange-600", label: "molesto", glow: "239,68,68", accent: "#f87171" };
  if (/(miedo|asust|ansios|nervi|estres|defens)/.test(m)) return { Icon: ShieldAlert, color: "from-violet-400 via-purple-500 to-fuchsia-600", label: "asustado", glow: "168,85,247", accent: "#c084fc" };
  if (/(relaj|calm|tranq|ronron|bienes)/.test(m)) return { Icon: Sun, color: "from-teal-400 via-emerald-500 to-green-600", label: "relajado", glow: "20,184,166", accent: "#2dd4bf" };
  if (/(curi|alert|atent|vigil)/.test(m)) return { Icon: Eye, color: "from-cyan-400 via-sky-500 to-blue-500", label: "alerta", glow: "6,182,212", accent: "#22d3ee" };
  if (/(rasc|pica|prurit|comez|comec|escoz|escos|irrit\s*pi|molestia\s*cut|piel)/.test(m)) return { Icon: Hand, color: "from-lime-400 via-emerald-500 to-teal-500", label: "con picazón", glow: "132,204,22", accent: "#a3e635" };
  if (/(hambr|comid|apetit|sed|^demand)/.test(m)) return { Icon: Beef, color: "from-amber-500 via-orange-500 to-red-500", label: "hambriento", glow: "245,158,11", accent: "#fbbf24" };
  if (/(cariñ|amor|afect|sumis)/.test(m)) return { Icon: Heart, color: "from-pink-400 via-rose-500 to-fuchsia-500", label: "cariñoso", glow: "236,72,153", accent: "#f472b6" };
  if (/(energ|hiper)/.test(m)) return { Icon: Zap, color: "from-yellow-400 via-amber-500 to-orange-500", label: "enérgico", glow: "234,179,8", accent: "#facc15" };
  if (/(sueño|dorm|descan|cansad)/.test(m)) return { Icon: Moon, color: "from-indigo-400 via-violet-500 to-purple-600", label: "con sueño", glow: "139,92,246", accent: "#a78bfa" };
  if (/(dolor|herid|molestia\sfis)/.test(m)) return { Icon: Flame, color: "from-red-500 via-rose-600 to-pink-600", label: "dolorido", glow: "244,63,94", accent: "#fb7185" };
  if (/(celo)/.test(m)) return { Icon: HeartHandshake, color: "from-pink-500 via-rose-500 to-red-500", label: "en celo", glow: "236,72,153", accent: "#f472b6" };
  return { Icon: Sparkles, color: "from-emerald-500 via-teal-500 to-orange-500", label: mood ?? "indefinido", glow: "16,185,129", accent: "#34d399" };
}

function intentIcon(intent: string | null | undefined): LucideType {
  const i = (intent ?? "").toLowerCase();
  if (/(juga|jueg)/.test(i)) return Gamepad2;
  if (/(rasc|pica|prurit|comez|comec|escoz|piel)/.test(i)) return Hand;
  if (/(comer|comid|hambr|apetit)/.test(i)) return Beef;
  if (/(salir|paseo|caminar)/.test(i)) return Footprints;
  if (/(atenc|mira|cari)/.test(i)) return Heart;
  if (/(alerta|aviso|vigil|defen|protec)/.test(i)) return Bell;
  if (/(miedo|huir|escond)/.test(i)) return Wind;
  if (/(saluda|hola)/.test(i)) return MessageCircle;
  if (/(dorm|descan|sue)/.test(i)) return Moon;
  if (/(agua|sed|beber)/.test(i)) return Droplets;
  return HelpCircle;
}

/* ---------- Postura y contexto por especie (con icono) ---------- */
type ChipOption = { label: string; Icon: LucideType };
const POSTURES: Record<"dog" | "cat", ChipOption[]> = {
  dog: [
    { label: "Relajado", Icon: Sun },
    { label: "Alerta", Icon: Eye },
    { label: "Juguetón", Icon: Gamepad2 },
    { label: "Sumiso", Icon: Hand },
    { label: "Agresivo", Icon: AlertOctagon },
    { label: "Asustado", Icon: ShieldAlert },
    { label: "Cansado", Icon: Moon },
  ],
  cat: [
    { label: "Relajado", Icon: Sun },
    { label: "Alerta", Icon: Eye },
    { label: "Defensivo", Icon: ShieldAlert },
    { label: "Juguetón", Icon: Gamepad2 },
    { label: "Asustado", Icon: Wind },
    { label: "Cazando", Icon: Zap },
    { label: "Acurrucado", Icon: Heart },
  ],
};
const CONTEXTS: Record<"dog" | "cat", ChipOption[]> = {
  dog: [
    { label: "Llegada a casa", Icon: Bell },
    { label: "Hora de comida", Icon: Beef },
    { label: "Hora del paseo", Icon: Footprints },
    { label: "Jugando", Icon: Gamepad2 },
    { label: "A dormir", Icon: Moon },
    { label: "Visitas", Icon: Hand },
    { label: "Solo en casa", Icon: Wind },
    { label: "Después del baño", Icon: Droplets },
    { label: "En el parque", Icon: Sun },
  ],
  cat: [
    { label: "Hora de comida", Icon: Beef },
    { label: "Jugando", Icon: Gamepad2 },
    { label: "Caja de arena", Icon: Cookie },
    { label: "En la ventana", Icon: Eye },
    { label: "Despertando", Icon: Sun },
    { label: "Visitas", Icon: Hand },
    { label: "Pidiendo caricias", Icon: Heart },
    { label: "Después de cazar", Icon: Zap },
  ],
};

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
      <OnboardingModal />
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
        {/* Desktop nav */}
        <nav className="hidden md:mx-auto md:flex md:max-w-6xl md:gap-1 md:overflow-x-auto md:px-4 md:pb-3">
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

      <main className="mx-auto max-w-6xl px-4 py-8 pb-28 md:pb-8">
        {tab === "translate" && <TranslateTab activePet={activePet} pets={pets} avatarUrls={avatarUrls} onChangeActive={setActivePetId} />}
        {tab === "pets" && <PetsTab pets={pets} avatarUrls={avatarUrls} />}
        {tab === "history" && <HistoryTab pets={pets} avatarUrls={avatarUrls} activePet={activePet} onChangeActive={setActivePetId} />}
        {tab === "chat" && <ChatTab activePet={activePet} avatarUrls={avatarUrls} />}
        {tab === "diary" && <DiaryTab pets={pets} avatarUrls={avatarUrls} activePet={activePet} onChangeActive={setActivePetId} />}
        {tab === "settings" && <SettingsTab onSignOut={signOut} />}
      </main>

      {/* Mobile bottom nav dock */}
      <nav className="fixed bottom-4 left-4 right-4 z-40 rounded-3xl border border-border/50 bg-background/70 backdrop-blur-2xl shadow-glow md:hidden">
        <div className="flex items-center justify-around px-1 py-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition min-w-[3.2rem] ${
                tab === t.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                tab === t.id ? "bg-brand text-primary-foreground shadow-glow" : "bg-card/60"
              }`}>
                <t.icon className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[9px] font-semibold tracking-wide">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: typeof Mic }[] = [
  { id: "translate", label: "Traducir", icon: Mic },
  { id: "pets", label: "Mascotas", icon: PawPrint },
  { id: "history", label: "Historial", icon: HistoryIcon },
  { id: "diary", label: "Diario", icon: LineChart },
  { id: "chat", label: "Conversación", icon: MessagesSquare },
  { id: "settings", label: "Ajustes", icon: SettingsIcon },
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
        className="cursor-pointer bg-transparent text-sm font-medium text-foreground outline-none"
      >
        {pets.map((p) => (
          <option key={p.id} value={p.id} className="bg-card text-foreground">
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/* -------- Freemium daily limit (server-backed premium) -------- */
const FREE_DAILY_LIMIT = 3;
function todayKey() { return new Date().toISOString().slice(0, 10); }
function usageKey(petId: string | null | undefined) {
  return `pawlingo_uses_${petId ?? "guest"}_${todayKey()}`;
}
function getUsageCount(petId: string | null | undefined): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(usageKey(petId)) || "0");
}
function bumpUsage(petId: string | null | undefined) {
  if (typeof window === "undefined") return;
  localStorage.setItem(usageKey(petId), String(getUsageCount(petId) + 1));
  window.dispatchEvent(new Event("pawlingo:usage"));
}
function useUsage(petId: string | null | undefined) {
  const { data: sub } = useSubscription();
  const premium = sub?.plan === "pro";
  const [used, setUsed] = useState(() => getUsageCount(petId));
  useEffect(() => {
    const sync = () => setUsed(getUsageCount(petId));
    sync();
    window.addEventListener("pawlingo:usage", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pawlingo:usage", sync);
      window.removeEventListener("storage", sync);
    };
  }, [petId]);
  return { used, remaining: Math.max(0, FREE_DAILY_LIMIT - used), premium, limit: FREE_DAILY_LIMIT };
}

/* -------- Translate Tab -------- */
function TranslateTab({ activePet, pets, avatarUrls, onChangeActive }: { activePet: Pet | null; pets: Pet[]; avatarUrls: Record<string, string>; onChangeActive: (id: string) => void }) {
  const qc = useQueryClient();
  const translate = useServerFn(translateSound);
  const [species, setSpecies] = useState<"dog" | "cat">(activePet?.species ?? "dog");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [posture, setPosture] = useState<string>("");
  const [context, setContext] = useState<string>("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const usage = useUsage(activePet?.id);

  useEffect(() => { if (activePet) setSpecies(activePet.species); }, [activePet]);
  useEffect(() => { setPosture(""); setContext(""); }, [species]);
  // Limpiar resultado anterior si se cambia de mascota o especie
  useEffect(() => { setResult(null); setAudioUrl(null); }, [activePet?.id, species]);

  // Cuando el usuario cambia la especie manualmente, mover la mascota activa a una de esa especie
  function changeSpecies(next: "dog" | "cat") {
    setSpecies(next);
    if (activePet?.species !== next) {
      const match = pets.find((p) => p.species === next);
      if (match) onChangeActive(match.id);
    }
  }

  async function onRecorded({ base64, format, durationMs, blobUrl }: { base64: string; format: string; durationMs: number; blobUrl: string }) {
    if (!usage.premium && usage.remaining <= 0) {
      setShowUpgrade(true);
      toast.error("Alcanzaste el límite gratis de hoy para esta mascota");
      return;
    }
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
          posture: posture || undefined,
          context: context || undefined,
        },
      });
      setResult(res.result);
      if (!usage.premium) bumpUsage(activePet?.id);
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
      <div className="glass-card rounded-3xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Volume2 className="h-4 w-4 text-primary" /> Grabar sonido
          </h2>
          <div className="flex rounded-full bg-muted p-1 text-xs">
            <button
              onClick={() => changeSpecies("dog")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${species === "dog" ? "bg-brand text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Dog className="h-3.5 w-3.5" /> Perro
            </button>
            <button
              onClick={() => changeSpecies("cat")}
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

        <div className="mb-4 rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 p-4 backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold">Contexto del momento</div>
              <div className="text-[10px] text-muted-foreground">Opcional — mejora la precisión</div>
            </div>
          </div>

          <ChipPicker
            label="Postura"
            icon={<PawPrint className="h-3 w-3" />}
            value={posture}
            onChange={setPosture}
            options={POSTURES[species]}
          />
          <div className="my-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <ChipPicker
            label="Situación"
            icon={<Activity className="h-3 w-3" />}
            value={context}
            onChange={setContext}
            options={CONTEXTS[species]}
          />
        </div>

        <div className="flex flex-col items-center gap-6 py-6">
          <Recorder onRecorded={onRecorded} disabled={loading || (!usage.premium && usage.remaining <= 0)} />
          {audioUrl && <audio src={audioUrl} controls className="w-full" />}
        </div>

        <UsageBanner usage={usage} onUpgrade={() => setShowUpgrade(true)} petName={activePet?.name} />

        {pets.length === 0 && (
          <p className="mt-2 rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">
            💡 Agrega una mascota para guardar traducciones asociadas a ella.
          </p>
        )}
      </div>


      <div className="glass-card rounded-3xl p-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-4 w-4 text-accent" /> Resultado
        </h2>

        {loading && <AnalyzingScreen petName={activePet?.name ?? "tu mascota"} />}

        {!loading && !result && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
            <PawPrint className="h-12 w-12 text-primary/60" />
            <p className="max-w-xs text-sm">Selecciona postura y contexto (opcional), graba un sonido y descubre qué intenta decirte tu mascota.</p>
          </div>
        )}

        {result && <ResultCard result={result} pet={activePet} petUrl={petUrl} posture={posture} context={context} />}
      </div>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}

/* -------- Usage banner + Upgrade modal -------- */
function UsageBanner({ usage, onUpgrade, petName }: { usage: ReturnType<typeof useUsage>; onUpgrade: () => void; petName?: string }) {
  if (usage.premium) {
    return (
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/10 via-orange-400/10 to-rose-400/10 px-4 py-2.5 text-xs">
        <span className="flex items-center gap-2 font-semibold text-amber-300">
          <Sparkles className="h-3.5 w-3.5" /> Plan Premium activo · traducciones ilimitadas
        </span>
      </div>
    );
  }
  const pct = Math.min(100, (usage.used / usage.limit) * 100);
  const out = usage.remaining <= 0;
  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-card/50 p-3 backdrop-blur">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="font-semibold text-muted-foreground">
          Plan Gratis · {usage.remaining}/{usage.limit} traducciones hoy{petName ? ` para ${petName}` : ""}
        </span>
        <button
          onClick={onUpgrade}
          className="rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-1 text-[10px] font-bold text-black shadow-glow transition hover:brightness-110"
        >
          ✨ Hazte Premium
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${out ? "bg-gradient-to-r from-rose-500 to-red-500" : "bg-gradient-to-r from-emerald-400 via-teal-400 to-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {out && (
        <p className="mt-2 text-[10px] text-rose-300">
          Llegaste al límite gratis de hoy. Vuelve mañana o hazte Premium para traducir sin límite.
        </p>
      )}
    </div>
  );
}

function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const checkout = useServerFn(createCheckoutSession);
  const [loading, setLoading] = useState(false);
  if (!open) return null;
  const features: { free: string; premium: string }[] = [
    { free: "3 traducciones/día por mascota", premium: "Traducciones ilimitadas" },
    { free: "Con publicidad", premium: "Sin publicidad" },
    { free: "Historial 30 días", premium: "Historial ilimitado + export PDF" },
    { free: "Análisis estándar", premium: "IA científica avanzada (Pro)" },
    { free: "1 mascota destacada", premium: "Mascotas ilimitadas + diario avanzado" },
    { free: "Sin alertas veterinarias", premium: "Alertas de salud y bienestar" },
  ];

  async function upgrade() {
    setLoading(true);
    try {
      const { url } = await checkout({ data: { returnUrl: window.location.origin + "/app" } });
      if (url) window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo iniciar el pago");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-400/30 bg-card/95 p-6 shadow-2xl backdrop-blur-2xl"
        style={{ boxShadow: "0 30px 80px -20px rgba(251,191,36,0.35)" }}
      >
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-amber-400/40 via-orange-500/30 to-rose-500/20 blur-3xl" />
        <div className="relative">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-1 text-[10px] font-bold text-black">
            <Sparkles className="h-3 w-3" /> PAWLINGO PRO
          </div>
          <h3 className="mt-2 text-2xl font-bold">Desbloquea todo el potencial</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Traduce sin límites, sin publicidad y con análisis científico avanzado.
          </p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
            <div className="grid grid-cols-2 border-b border-border/60 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="p-3">Gratis</div>
              <div className="p-3 text-amber-300">Pro</div>
            </div>
            {features.map((f, i) => (
              <div key={i} className="grid grid-cols-2 border-b border-border/40 text-xs last:border-0">
                <div className="p-3 text-muted-foreground">{f.free}</div>
                <div className="p-3 font-medium text-foreground">✨ {f.premium}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={upgrade}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-3 text-sm font-bold text-black shadow-glow transition hover:brightness-110 disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Hazte Pro ahora
            </button>
            <button
              onClick={onClose}
              className="rounded-2xl border border-border/60 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Ahora no
            </button>
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            Pago seguro procesado por Stripe. Cancela cuando quieras.
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------- ChipPicker (postura / contexto) -------- */
function ChipPicker({ label, icon, value, onChange, options }: { label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void; options: ChipOption[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {icon} {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = value === o.label;
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => onChange(active ? "" : o.label)}
              className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-brand text-primary-foreground shadow-glow ring-1 ring-primary/50 scale-[1.03]"
                  : "border border-border/60 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-card/80"
              }`}
            >
              <o.Icon className={`h-3.5 w-3.5 ${active ? "" : "text-primary/70"}`} />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultCard({ result, pet, petUrl, posture, context }: { result: TranslationResult; pet: Pet | null; petUrl?: string; posture?: string; context?: string }) {
  const results = result.results ?? [];
  const top = results[0];
  

  if (!top) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
        <PawPrint className="h-12 w-12 text-primary/60" />
        <p className="max-w-xs text-sm">No se pudieron generar interpretaciones para este sonido.</p>
      </div>
    );
  }

  const m = moodVisual(top.mood);
  const IIcon = intentIcon(top.intent);

  return (
    <div className="space-y-5">
      {/* Top result — translucent glass with mood-tinted glow */}
      <div
        className="group relative overflow-hidden rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5"
        style={{
          background: `linear-gradient(135deg, rgba(${m.glow},0.22), rgba(${m.glow},0.08) 60%, hsl(var(--card) / 0.55))`,
          borderColor: `rgba(${m.glow},0.35)`,
          boxShadow: `0 24px 70px -22px rgba(${m.glow},0.6), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
      >
        {/* soft tinted wash, very subtle */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `radial-gradient(120% 80% at 100% 0%, rgba(${m.glow},0.28), transparent 60%)` }}
        />
        <m.Icon className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 opacity-[0.12]" strokeWidth={1.2} style={{ color: m.accent }} />
        <div className="relative flex items-start gap-4">
          {pet && <PetAvatar pet={pet} url={petUrl} size={56} ring />}
          <div className="flex-1">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              <m.Icon className="h-3.5 w-3.5" style={{ color: m.accent }} />
              {pet ? `${pet.name} dice` : "Tu mascota dice"}
            </div>
            <p className="mt-1 text-xl font-semibold leading-snug text-foreground">"{top.translation}"</p>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2 text-xs">
          {top.mood && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-background/40 px-3 py-1.5 text-foreground/90 backdrop-blur">
              <m.Icon className="h-4 w-4" style={{ color: m.accent }} /> {top.mood}
            </span>
          )}
          {top.intent && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-background/40 px-3 py-1.5 text-foreground/90 backdrop-blur">
              <IIcon className="h-4 w-4 text-accent" /> {top.intent}
            </span>
          )}
          {typeof top.confidence === "number" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-background/40 px-3 py-1.5 text-foreground/90 backdrop-blur">
              <Activity className="h-3.5 w-3.5" style={{ color: m.accent }} /> {top.confidence}%
            </span>
          )}
        </div>
      </div>


      {(posture || context) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {posture && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-muted-foreground">
              <PawPrint className="h-3.5 w-3.5 text-primary" /> Postura: <strong className="text-foreground">{posture}</strong>
            </span>
          )}
          {context && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Contexto: <strong className="text-foreground">{context}</strong>
            </span>
          )}
        </div>
      )}

      {top.scientific_basis && (
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Brain className="h-4 w-4" />
            </span>
            Base científica
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{top.scientific_basis}</p>
        </div>
      )}

      {top.tips && top.tips.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Lightbulb className="h-4 w-4" />
            </span>
            Consejos
          </div>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {top.tips.map((t: string, i: number) => (
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
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="rounded-xl border border-border bg-input/40 px-3 py-2.5 text-sm outline-none focus:border-primary md:col-span-2" />
              <div className="md:col-span-2">
                <SpeciesPicker value={species} onChange={setSpecies} />
              </div>
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
function HistoryTab({ pets, avatarUrls, activePet, onChangeActive }: { pets: Pet[]; avatarUrls: Record<string, string>; activePet: Pet | null; onChangeActive: (id: string) => void }) {
  const [filterPetId, setFilterPetId] = useState<string | "all">(activePet?.id ?? "all");
  useEffect(() => { if (activePet && filterPetId === "all") setFilterPetId(activePet.id); }, [activePet?.id]);

  const { data: items, isLoading } = useQuery({
    queryKey: ["translations", filterPetId],
    queryFn: async () => {
      let q = supabase.from("translations").select("*").order("created_at", { ascending: false }).limit(50);
      if (filterPetId !== "all") q = q.eq("pet_id", filterPetId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Translation[];
    },
  });

  const petById = useMemo(() => Object.fromEntries(pets.map((p) => [p.id, p])), [pets]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Historial</h2>
        {pets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setFilterPetId("all")} className={`rounded-full px-3 py-1.5 text-xs transition ${filterPetId === "all" ? "bg-brand text-primary-foreground shadow-glow" : "bg-card/60 text-muted-foreground hover:text-foreground"}`}>Todas</button>
            {pets.map((p) => {
              const u = p.avatar_url ? avatarUrls[p.avatar_url] : undefined;
              const active = filterPetId === p.id;
              return (
                <button key={p.id} onClick={() => { setFilterPetId(p.id); onChangeActive(p.id); }} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${active ? "bg-brand text-primary-foreground shadow-glow" : "bg-card/60 text-muted-foreground hover:text-foreground"}`}>
                  <PetAvatar pet={p} url={u} size={20} />
                  {p.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {!isLoading && items && items.length > 0 && (
        <p className="mb-3 text-xs text-muted-foreground">{items.length} traducción{items.length === 1 ? "" : "es"} {filterPetId !== "all" ? "para esta mascota" : "en total"}</p>
      )}
      {isLoading && <div className="text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin" /> Cargando...</div>}
      {!isLoading && (!items || items.length === 0) && (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <HistoryIcon className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3">Aún no hay traducciones guardadas.</p>
        </div>
      )}
      <div className="space-y-3">
        {items?.map((t) => {
          const m = moodVisual(t.mood);
          const IIcon = intentIcon(t.intent);
          const pet = t.pet_id ? petById[t.pet_id] : null;
          const url = pet?.avatar_url ? avatarUrls[pet.avatar_url] : undefined;
          return (
            <div
              key={t.id}
              className="group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, rgba(${m.glow},0.2), rgba(${m.glow},0.07) 60%, hsl(var(--card) / 0.55))`,
                borderColor: `rgba(${m.glow},0.32)`,
                boxShadow: `0 18px 55px -20px rgba(${m.glow},0.55), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)`,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(120% 80% at 100% 0%, rgba(${m.glow},0.24), transparent 60%)` }}
              />
              <m.Icon className="pointer-events-none absolute -right-4 -top-4 h-32 w-32 opacity-[0.1]" strokeWidth={1.2} style={{ color: m.accent }} />
              <div className="relative mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  {pet ? <PetAvatar pet={pet} url={url} size={28} /> : (t.species === "dog" ? <Dog className="h-5 w-5" /> : <Cat className="h-5 w-5" />)}
                  <span className="font-semibold text-foreground">{pet?.name ?? "Sin asignar"}</span>
                </span>
                <span className="opacity-80">{new Date(t.created_at).toLocaleString("es")}</span>
              </div>
              <div className="relative flex items-start gap-3">
                <div
                  className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-white/10 bg-background/40 backdrop-blur"
                  style={{ boxShadow: `inset 0 0 20px rgba(${m.glow},0.25)` }}
                >
                  <m.Icon className="h-6 w-6" style={{ color: m.accent }} />
                </div>
                <p className="text-base font-semibold leading-snug text-foreground">"{t.translation}"</p>
              </div>
              <div className="relative mt-3 flex flex-wrap gap-2 text-xs">
                {t.mood && <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-background/40 px-2.5 py-1 text-foreground/90 backdrop-blur"><m.Icon className="h-4 w-4" style={{ color: m.accent }} /> {t.mood}</span>}
                {t.intent && <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-background/40 px-2.5 py-1 text-foreground/90 backdrop-blur"><IIcon className="h-4 w-4 text-accent" /> {t.intent}</span>}
                {typeof t.confidence === "number" && <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-background/40 px-2.5 py-1 text-foreground/90 backdrop-blur"><Activity className="h-3.5 w-3.5" style={{ color: m.accent }} /> {t.confidence}%</span>}
              </div>
              {t.scientific_basis && (
                <p className="relative mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                  <Brain className="h-3.5 w-3.5 flex-none" style={{ color: m.accent }} />
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

/* -------- Species Picker (big visual cards) -------- */
function SpeciesPicker({ value, onChange }: { value: "dog" | "cat"; onChange: (s: "dog" | "cat") => void }) {
  const options: { id: "dog" | "cat"; label: string; img: string; gradient: string }[] = [
    { id: "dog", label: "Perro", img: dogCard, gradient: "from-amber-500/30 via-orange-500/20 to-rose-500/30" },
    { id: "cat", label: "Gato", img: catCard, gradient: "from-violet-500/30 via-fuchsia-500/20 to-indigo-500/30" },
  ];
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">¿Qué tipo de mascota es?</div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={`group relative overflow-hidden rounded-2xl border-2 p-4 text-center transition ${
                active ? "border-primary shadow-glow scale-[1.02]" : "border-border bg-card/40 hover:border-primary/40"
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${o.gradient} opacity-${active ? "100" : "60"} transition`} />
              <div className="relative">
                <img src={o.img} alt={o.label} width={140} height={140} loading="lazy" className="mx-auto h-28 w-28 object-contain drop-shadow-xl transition group-hover:scale-105" />
                <div className="mt-2 text-base font-semibold">{o.label}</div>
              </div>
              {active && (
                <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-glow">✓</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------- Analyzing Screen (premium multi-step) -------- */
function AnalyzingScreen({ petName }: { petName: string }) {
  const steps = [
    "Capturando muestra de audio…",
    "Filtrando ruido y calculando F0…",
    "Detectando patrones bioacústicos…",
    "Comparando con base etológica…",
    "Interpretando intención y emoción…",
    "Generando traducción final…",
  ];
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(2);
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 36 }, () => 20 + Math.random() * 60));

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) return p;
        // Curva suave: avanza más rápido al inicio, más lento al final
        const remaining = 95 - p;
        const next = p + Math.max(0.4, remaining * 0.025);
        return Math.min(95, next);
      });
      setBars(Array.from({ length: 36 }, () => 15 + Math.random() * 75));
    }, 320);
    return () => clearInterval(t);
  }, []);

  // El paso visible se deriva del progreso real (no aleatorio)
  useEffect(() => {
    const idx = Math.min(steps.length - 1, Math.floor((progress / 95) * steps.length));
    setStep(idx);
  }, [progress, steps.length]);

  return (
    <div className="relative flex flex-col items-center gap-6 py-6">
      <div className="relative flex h-44 w-44 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
        <div className="absolute inset-4 animate-pulse rounded-full bg-primary/20" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-accent shadow-glow">
          <Activity className="h-10 w-10 text-primary-foreground" />
        </div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold tracking-tight">Analizando</div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          {petName} · PetVoice AI
        </div>
      </div>

      <div className="flex h-10 w-full max-w-xs items-end justify-center gap-[3px]">
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-1.5 rounded-full bg-gradient-to-t from-primary to-accent transition-all duration-500"
            style={{ height: `${h}%`, opacity: 0.5 + (h / 200) }}
          />
        ))}
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Paso {step + 1} / {steps.length}</span>
          <span className="font-semibold text-foreground">{Math.min(99, Math.round(progress))}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/60 p-4">
        <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
          <Brain className="h-3.5 w-3.5" /> Etología computacional
        </div>
        <div className="text-sm leading-snug text-foreground/90">{steps[step]}</div>
      </div>
    </div>
  );
}

/* -------- Diary Tab (mood diary) -------- */
function DiaryTab({ pets, avatarUrls, activePet, onChangeActive }: { pets: Pet[]; avatarUrls: Record<string, string>; activePet: Pet | null; onChangeActive: (id: string) => void }) {
  const [filterPetId, setFilterPetId] = useState<string | "all">(activePet?.id ?? "all");
  const [range, setRange] = useState<7 | 30 | 90>(30);
  useEffect(() => { if (activePet && filterPetId === "all") setFilterPetId(activePet.id); }, [activePet?.id]);

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - range);
    return d.toISOString();
  }, [range]);

  const { data: items, isLoading } = useQuery({
    queryKey: ["diary", filterPetId, range],
    queryFn: async () => {
      let q = supabase.from("translations").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500);
      if (filterPetId !== "all") q = q.eq("pet_id", filterPetId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Translation[];
    },
  });

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    const byDay: Record<string, { date: string; moods: Record<string, number> }> = {};
    let total = 0;
    let confidenceSum = 0;
    let confidenceCount = 0;
    (items ?? []).forEach((t) => {
      const key = moodVisual(t.mood).label;
      counts[key] = (counts[key] ?? 0) + 1;
      total++;
      if (typeof t.confidence === "number") { confidenceSum += t.confidence; confidenceCount++; }
      const day = new Date(t.created_at).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, moods: {} };
      byDay[day].moods[key] = (byDay[day].moods[key] ?? 0) + 1;
    });
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const daysSorted = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    return { counts, total, dominant, daysSorted, avgConfidence: confidenceCount ? Math.round(confidenceSum / confidenceCount) : null };
  }, [items]);

  const dominantVisual = stats.dominant ? moodVisual(stats.dominant) : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Diario del ánimo</h2>
          <p className="text-xs text-muted-foreground">Evolución emocional de tu mascota basada en sus traducciones.</p>
        </div>
        <div className="flex gap-1.5">
          {([7, 30, 90] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`rounded-full px-3 py-1.5 text-xs transition ${range === r ? "bg-brand text-primary-foreground shadow-glow" : "bg-card/60 text-muted-foreground hover:text-foreground"}`}>
              {r} días
            </button>
          ))}
        </div>
      </div>

      {pets.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <button onClick={() => setFilterPetId("all")} className={`rounded-full px-3 py-1.5 text-xs transition ${filterPetId === "all" ? "bg-brand text-primary-foreground shadow-glow" : "bg-card/60 text-muted-foreground hover:text-foreground"}`}>Todas</button>
          {pets.map((p) => {
            const u = p.avatar_url ? avatarUrls[p.avatar_url] : undefined;
            const active = filterPetId === p.id;
            return (
              <button key={p.id} onClick={() => { setFilterPetId(p.id); onChangeActive(p.id); }} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${active ? "bg-brand text-primary-foreground shadow-glow" : "bg-card/60 text-muted-foreground hover:text-foreground"}`}>
                <PetAvatar pet={p} url={u} size={20} />
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      {isLoading && <div className="text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin" /> Cargando diario...</div>}

      {!isLoading && stats.total === 0 && (
        <div className="glass-card rounded-3xl p-12 text-center text-muted-foreground">
          <LineChart className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3">Aún no hay datos en el periodo seleccionado.</p>
        </div>
      )}

      {!isLoading && stats.total > 0 && (
        <>
          <div className="mb-5 grid gap-4 md:grid-cols-3">
            <div className="glass-card rounded-2xl p-5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Registros</div>
              <div className="mt-2 text-3xl font-bold">{stats.total}</div>
              <div className="mt-1 text-xs text-muted-foreground">en los últimos {range} días</div>
            </div>
            {dominantVisual && (
              <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${dominantVisual.color} p-5 text-white shadow-glow`}>
                <dominantVisual.Icon className="absolute -right-3 -top-3 h-24 w-24 text-white/20" strokeWidth={1.4} />
                <div className="relative text-[10px] uppercase tracking-widest opacity-80">Ánimo dominante</div>
                <div className="relative mt-2 text-2xl font-bold capitalize">{stats.dominant}</div>
                <div className="relative mt-1 text-xs opacity-90">{stats.counts[stats.dominant!]} de {stats.total} registros</div>
              </div>
            )}
            {stats.avgConfidence !== null && (
              <div className="glass-card rounded-2xl p-5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Confianza promedio</div>
                <div className="mt-2 text-3xl font-bold">{stats.avgConfidence}%</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${stats.avgConfidence}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="glass-card mb-5 rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><Heart className="h-4 w-4 text-primary" /> Distribución emocional</div>
            <div className="space-y-3">
              {Object.entries(stats.counts).sort((a, b) => b[1] - a[1]).map(([mood, count]) => {
                const v = moodVisual(mood);
                const pct = Math.round((count / stats.total) * 100);
                return (
                  <div key={mood}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 capitalize text-foreground"><v.Icon className="h-3.5 w-3.5" /> {mood}</span>
                      <span className="text-muted-foreground">{count} · {pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full bg-gradient-to-r ${v.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><LineChart className="h-4 w-4 text-accent" /> Línea de tiempo</div>
            <div className="flex items-end gap-1 overflow-x-auto pb-2">
              {stats.daysSorted.map((d) => {
                const total = Object.values(d.moods).reduce((a, b) => a + b, 0);
                const top = Object.entries(d.moods).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "indefinido";
                const v = moodVisual(top);
                const h = 16 + total * 14;
                return (
                  <div key={d.date} className="flex flex-col items-center gap-1" title={`${d.date}: ${total} registros, ${top}`}>
                    <div className={`w-5 rounded-md bg-gradient-to-t ${v.color} shadow-glow`} style={{ height: `${Math.min(h, 120)}px` }} />
                    <span className="text-[9px] text-muted-foreground">{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* -------- Settings Tab -------- */
function SettingsTab({ onSignOut }: { onSignOut: () => void }) {
  const qc = useQueryClient();
  const { data: sub } = useSubscription();
  const portal = useServerFn(createBillingPortalSession);
  const checkout = useServerFn(createCheckoutSession);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const isPro = sub?.plan === "pro";

  async function openPortal() {
    setPortalLoading(true);
    try {
      const { url } = await portal({ data: { returnUrl: window.location.origin + "/app" } });
      if (url) window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo abrir el portal");
    } finally { setPortalLoading(false); }
  }

  async function startCheckout() {
    setCheckoutLoading(true);
    try {
      const { url } = await checkout({ data: { returnUrl: window.location.origin + "/app" } });
      if (url) window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo iniciar el pago");
      setCheckoutLoading(false);
    }
  }

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return { user: u.user, profile: data };
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (profile?.profile?.display_name) setDisplayName(profile.profile.display_name); }, [profile]);

  async function save() {
    if (!profile?.user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", profile.user.id);
      if (error) throw error;
      toast.success("Perfil actualizado");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally { setSaving(false); }
  }

  async function clearHistory() {
    if (!confirm("¿Eliminar TODO tu historial de traducciones? Esta acción no se puede deshacer.")) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("translations").delete().eq("user_id", u.user.id);
    if (error) return toast.error(error.message);
    toast.success("Historial eliminado");
    qc.invalidateQueries({ queryKey: ["translations"] });
    qc.invalidateQueries({ queryKey: ["diary"] });
  }

  async function clearChats() {
    if (!confirm("¿Eliminar todas las conversaciones?")) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("conversations").delete().eq("user_id", u.user.id);
    if (error) return toast.error(error.message);
    toast.success("Conversaciones eliminadas");
    qc.invalidateQueries({ queryKey: ["conversations"] });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ajustes</h2>
        <p className="text-xs text-muted-foreground">Administra tu perfil, suscripción y datos.</p>
      </div>

      {/* Subscription */}
      <div className={`relative overflow-hidden rounded-3xl border p-6 ${isPro ? "border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent" : "glass-card"}`}>
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Sparkles className={`h-4 w-4 ${isPro ? "text-amber-400" : "text-primary"}`} /> Suscripción
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold">{isPro ? "Plan Pro ✨" : "Plan Gratis"}</div>
            <div className="text-xs text-muted-foreground">
              {isPro
                ? sub?.currentPeriodEnd
                  ? `Se renueva el ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                  : "Activo"
                : "3 traducciones/día por mascota"}
            </div>
          </div>
          {isPro ? (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm font-medium hover:bg-accent/10 disabled:opacity-60"
            >
              {portalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Gestionar
            </button>
          ) : (
            <button
              onClick={startCheckout}
              disabled={checkoutLoading}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-5 py-2 text-sm font-bold text-black shadow-glow disabled:opacity-70"
            >
              {checkoutLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Hazte Pro
            </button>
          )}
        </div>
        {sub?.stripeConfigured === false && (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            Los pagos aún no están configurados. Añade <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_PRICE_ID</code> y <code>STRIPE_WEBHOOK_SECRET</code> en los secretos del backend.
          </p>
        )}
      </div>

      {/* Weekly report */}
      <div className="glass-card rounded-3xl p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <LineChart className="h-4 w-4 text-accent" /> Informe semanal (Pro)
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Genera un informe imprimible con la evolución emocional de los últimos 7 días. Guárdalo como PDF o compártelo con tu veterinario.
        </p>
        <WeeklyReportButton isPro={isPro} onUpgrade={() => setShowUpgrade(true)} />
      </div>

      {/* Profile */}
      <div className="glass-card rounded-3xl p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><SettingsIcon className="h-4 w-4 text-primary" /> Perfil</div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Email</label>
            <input value={profile?.user.email ?? ""} disabled className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nombre para mostrar</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-xl border border-border bg-input/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><Trash2 className="h-4 w-4 text-destructive" /> Datos</div>
        <div className="grid gap-2 md:grid-cols-2">
          <button onClick={clearHistory} className="rounded-xl border border-border bg-card/60 px-4 py-3 text-left text-sm transition hover:border-destructive/60 hover:text-destructive">
            <div className="font-medium">Borrar historial</div>
            <div className="text-xs text-muted-foreground">Elimina todas las traducciones</div>
          </button>
          <button onClick={clearChats} className="rounded-xl border border-border bg-card/60 px-4 py-3 text-left text-sm transition hover:border-destructive/60 hover:text-destructive">
            <div className="font-medium">Borrar conversaciones</div>
            <div className="text-xs text-muted-foreground">Elimina los chats con tus mascotas</div>
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><LogOut className="h-4 w-4 text-muted-foreground" /> Sesión</div>
        <button onClick={onSignOut} className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-2 text-sm text-muted-foreground transition hover:text-foreground">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
