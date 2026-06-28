"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DeckRecorder, downloadBlob, type RecordingState } from "@/recording/recorder";
import { formatTime } from "@/audio/format";

interface Props {
  /** Devolve o <canvas> do caleidoscópio a gravar, ou null se ainda não montou. */
  getCanvas: () => HTMLCanvasElement | null;
  /** Devolve o MediaStream de áudio (tap do AudioGraph), ou null sem fonte. */
  getAudioStream: () => MediaStream | null;
  /** Quadros por segundo da captura de vídeo (default: 30). */
  fps?: number;
}

/**
 * Botão REC/STOP da apresentação ao vivo. Mostra o tempo decorrido enquanto
 * grava e, ao parar, dispara o download do arquivo (MP4 quando suportado, senão
 * WebM). Não conhece o DeckShell — recebe seams para canvas e áudio.
 */
export function RecordButton({ getCanvas, getAudioStream, fps = 30 }: Props) {
  const recorderRef = useRef<DeckRecorder | null>(null);
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);

  // Cronômetro só roda durante a gravação.
  useEffect(() => {
    if (state !== "recording") return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  // Garante liberação se o componente desmontar gravando.
  useEffect(() => () => recorderRef.current?.dispose(), []);

  const start = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) {
      console.error("Canvas indisponível: o caleidoscópio ainda não montou.");
      return;
    }
    try {
      const recorder = new DeckRecorder(canvas, getAudioStream(), { fps });
      recorder.start();
      recorderRef.current = recorder;
      setElapsed(0);
      setState("recording");
    } catch (error) {
      console.error("Falha ao iniciar a gravação", error);
    }
  }, [getCanvas, getAudioStream, fps]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setState("encoding");
    try {
      const { blob, extension } = await recorder.stop();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(blob, `synesthesia-${stamp}.${extension}`);
    } catch (error) {
      console.error("Falha ao finalizar a gravação", error);
    } finally {
      recorder.dispose();
      recorderRef.current = null;
      setState("idle");
    }
  }, []);

  const recording = state === "recording";
  const encoding = state === "encoding";

  const label = recording ? "Parar gravação" : encoding ? "Processando" : "Gravar";

  return (
    <button
      type="button"
      onClick={recording ? stop : encoding ? undefined : start}
      disabled={encoding}
      aria-pressed={recording}
      aria-label={label}
      className={[
        "inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors",
        recording
          ? "bg-red-500 text-white hover:bg-red-400"
          : encoding
            ? "cursor-wait bg-white/10 text-white/50"
            : "bg-white/10 text-white/70 hover:bg-white/20",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "h-2.5 w-2.5 rounded-full",
          recording ? "animate-pulse bg-white" : "bg-red-500",
        ].join(" ")}
      />
      {recording ? (
        <span className="font-mono tabular-nums">{formatTime(elapsed)}</span>
      ) : (
        <span>{encoding ? "..." : "REC"}</span>
      )}
    </button>
  );
}
