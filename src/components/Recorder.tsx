import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

type Props = {
  onRecorded: (data: { base64: string; format: string; durationMs: number; blobUrl: string }) => void;
  disabled?: boolean;
};

export function Recorder({ onRecorded, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
  }, []);

  async function start() {
    try {
      setPreparing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        const format = blob.type.includes("mp4") ? "m4a" : "webm";
        const blobUrl = URL.createObjectURL(blob);
        const base64 = await blobToBase64(blob);
        onRecorded({ base64, format, durationMs: Date.now() - startRef.current, blobUrl });
      };
      rec.start();
      mediaRef.current = rec;
      startRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      timerRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
    } catch (e) {
      console.error(e);
      alert("No se pudo acceder al micrófono.");
    } finally {
      setPreparing(false);
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    mediaRef.current?.stop();
  }

  const seconds = (elapsed / 1000).toFixed(1);

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        disabled={disabled || preparing}
        onClick={recording ? stop : start}
        className={`relative flex h-32 w-32 items-center justify-center rounded-full text-primary-foreground shadow-glow transition ${
          recording ? "bg-destructive animate-pulse-ring" : "bg-brand"
        } disabled:opacity-60`}
        aria-label={recording ? "Detener" : "Grabar"}
      >
        {preparing ? <Loader2 className="h-10 w-10 animate-spin" /> : recording ? <Square className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
      </button>
      <div className="text-sm text-muted-foreground">
        {recording ? `Grabando · ${seconds}s` : "Toca para grabar el sonido de tu mascota"}
      </div>
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const result = r.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
