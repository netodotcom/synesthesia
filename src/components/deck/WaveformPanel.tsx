"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { BeatGrid, WaveformPeaks } from "@/lib/types";

interface Props {
  /** Picos da faixa inteira, ou null antes de decodificar. */
  peaks: WaveformPeaks | null;
  /** Grade de beats sobreposta, ou null se ainda não detectada. */
  grid: BeatGrid | null;
  /** Elemento <audio> dono do playback (em DeckShell) — fonte do tempo/seek. */
  audioRef: RefObject<HTMLAudioElement | null>;
}

/**
 * A faixa como instrumento: a waveform É o controle. Mostra os picos, a grade
 * de beats (downbeats destacados) e o playhead; clicar dá seek. Desenha num
 * loop rAF leve (apenas enquanto há faixa) e lê o tempo direto do <audio> —
 * nada disso passa pela árvore React por frame.
 */
export function WaveformPanel({ peaks, grid, audioRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const durationRef = useRef(0);

  // Duração espelhada do <audio> (mapeia tempo→x e posiciona a grade).
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onDur = () => {
      durationRef.current = Number.isFinite(el.duration) ? el.duration : 0;
    };
    el.addEventListener("durationchange", onDur);
    el.addEventListener("loadedmetadata", onDur);
    onDur();
    return () => {
      el.removeEventListener("durationchange", onDur);
      el.removeEventListener("loadedmetadata", onDur);
    };
  }, [audioRef]);

  // Loop de desenho — só roda quando há picos para mostrar.
  useEffect(() => {
    if (!peaks) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        const mid = h / 2;
        const colW = w / peaks.length;

        // Waveform (picos min/max espelhados no eixo central).
        ctx.fillStyle = "rgba(255,255,255,0.32)";
        for (let i = 0; i < peaks.length; i++) {
          const x = i * colW;
          const yMax = mid - peaks.max[i] * mid;
          const yMin = mid - peaks.min[i] * mid;
          ctx.fillRect(x, yMax, Math.max(1, colW), Math.max(1, yMin - yMax));
        }

        // Grade de beats: downbeats em magenta, beats em branco fraco.
        const dur = durationRef.current;
        if (grid && grid.bpm > 0 && dur > 0) {
          for (let i = grid.beatIndexAt(0); ; i++) {
            const t = grid.beatAt(i);
            if (t > dur) break;
            if (t < 0) continue;
            const x = (t / dur) * w;
            const down = grid.isDownbeat(i);
            ctx.fillStyle = down ? "rgba(217,70,239,0.85)" : "rgba(255,255,255,0.14)";
            ctx.fillRect(x, 0, down ? 1.5 : 1, h);
          }
        }

        // Playhead.
        const el = audioRef.current;
        if (el && dur > 0) {
          const x = (el.currentTime / dur) * w;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x - 1, 0, 2, h);
        }

        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [peaks, grid, audioRef]);

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const el = audioRef.current;
    const canvas = canvasRef.current;
    const dur = durationRef.current;
    if (!el || !canvas || dur <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * dur;
  };

  return (
    <div className="absolute inset-x-0 top-0 z-30 h-20 border-b border-white/10 bg-black/60 backdrop-blur-sm">
      {peaks ? (
        <canvas
          ref={canvasRef}
          onClick={handleSeek}
          className="h-full w-full cursor-pointer"
          aria-label="Forma de onda da faixa (clique para buscar)"
        />
      ) : (
        <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-widest text-white/30">
          suba uma faixa para ver a waveform
        </div>
      )}
    </div>
  );
}
