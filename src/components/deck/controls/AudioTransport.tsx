"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { formatTime, progressPercent } from "@/audio/format";

interface Props {
  audioRef: RefObject<HTMLAudioElement | null>;
}

/**
 * Transport completo do arquivo: play/pause, seek, volume e loop. Opera direto
 * sobre o elemento <audio> (dono em DeckShell) e espelha o estado via eventos.
 */
export function AudioTransport({ audioRef }: Props) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loop, setLoop] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onDuration = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("durationchange", onDuration);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onPause);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("durationchange", onDuration);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onPause);
    };
  }, [audioRef]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };

  const seek = (value: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = value;
    setCurrent(value);
  };

  const changeVolume = (value: number) => {
    const el = audioRef.current;
    if (el) el.volume = value;
    setVolume(value);
  };

  const toggleLoop = () => {
    const el = audioRef.current;
    const next = !loop;
    if (el) el.loop = next;
    setLoop(next);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pausar" : "Tocar"}
        className="grid h-8 w-8 place-items-center rounded-full bg-white text-black"
      >
        {playing ? "❚❚" : "▶"}
      </button>

      <span className="w-10 text-right font-mono text-[10px] tabular-nums text-white/60">
        {formatTime(current)}
      </span>

      <input
        type="range"
        aria-label="Posição"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(current, duration || 0)}
        onChange={(e) => seek(Number(e.target.value))}
        style={{ ["--p" as string]: `${progressPercent(current, duration)}%` }}
        className="h-1 w-40 cursor-pointer accent-fuchsia-500"
      />

      <span className="w-10 font-mono text-[10px] tabular-nums text-white/60">
        {formatTime(duration)}
      </span>

      <input
        type="range"
        aria-label="Volume"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => changeVolume(Number(e.target.value))}
        className="h-1 w-20 cursor-pointer accent-cyan-400"
      />

      <button
        type="button"
        onClick={toggleLoop}
        aria-pressed={loop}
        className={[
          "rounded-md px-2 py-1 text-xs font-medium transition-colors",
          loop ? "bg-fuchsia-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20",
        ].join(" ")}
      >
        ↻ Loop
      </button>
    </div>
  );
}
