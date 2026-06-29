"use client";

import { useState } from "react";
import type { ChromaParams, SpecularParams } from "@/lib/types";
import { TAU, type ParamAction } from "@/state/visualParamsReducer";

interface Props {
  chroma: ChromaParams;
  specular: SpecularParams;
  dispatch: (action: ParamAction) => void;
}

interface SliderRowProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  accent: string;
  onChange: (value: number) => void;
}

/** Linha de slider rotulada — a posição do thumb É o valor (Lei 2: forma antes de texto). */
function SliderRow({ label, min, max, step, value, accent, onChange }: SliderRowProps) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-7 shrink-0 font-mono text-[10px] uppercase tracking-wider text-white/35">
        {label}
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`h-1 w-full cursor-pointer ${accent}`}
      />
    </label>
  );
}

function toggleClass(active: boolean): string {
  return [
    "flex-1 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
    active ? "bg-fuchsia-500 text-white" : "bg-white/10 text-white/50 hover:bg-white/20",
  ].join(" ");
}

/**
 * Painel de ajuste fino do Vetor Cromático + Vetor Especular. Ancorado no
 * perímetro inferior-direito, colapsável, glifos mono de baixo contraste
 * (Lei 12). Lê o snapshot dos params e despacha ações com payload; o hot path
 * de render lê tudo via ref, então mexer aqui não custa frame.
 */
export function ChromaSpecularPanel({ chroma, specular, dispatch }: Props) {
  const [open, setOpen] = useState(false);

  const setChroma = (patch: Partial<ChromaParams>) =>
    dispatch({ type: "set-chroma", payload: patch });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-10 right-4 z-40 rounded-xl bg-black/50 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/40 backdrop-blur-sm transition-colors hover:text-white/70"
      >
        Cor / Forma
      </button>
    );
  }

  return (
    <div className="absolute bottom-10 right-4 z-40 flex w-56 flex-col gap-3 rounded-xl bg-black/50 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">Cor / Forma</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Recolher painel"
          className="font-mono text-[10px] text-white/40 transition-colors hover:text-white/70"
        >
          ✕
        </button>
      </div>

      {/* Vetor Cromático */}
      <div className="flex flex-col gap-1.5">
        <SliderRow label="bri" min={-0.5} max={0.5} step={0.01} value={chroma.brightness}
          accent="accent-cyan-400" onChange={(v) => setChroma({ brightness: v })} />
        <SliderRow label="con" min={0} max={2} step={0.01} value={chroma.contrast}
          accent="accent-cyan-400" onChange={(v) => setChroma({ contrast: v })} />
        <SliderRow label="gam" min={0.2} max={3} step={0.01} value={chroma.gamma}
          accent="accent-cyan-400" onChange={(v) => setChroma({ gamma: v })} />
        <SliderRow label="sat" min={0} max={2} step={0.01} value={chroma.saturation}
          accent="accent-fuchsia-500" onChange={(v) => setChroma({ saturation: v })} />
        <SliderRow label="hue" min={0} max={TAU} step={0.01} value={chroma.hueShift}
          accent="accent-fuchsia-500" onChange={(v) => setChroma({ hueShift: v })} />
        <SliderRow label="exp" min={0} max={2} step={0.01} value={chroma.exposure}
          accent="accent-fuchsia-500" onChange={(v) => setChroma({ exposure: v })} />
      </div>

      {/* Vetor Especular */}
      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2">
        <div className="flex gap-2">
          <button type="button" onClick={() => dispatch({ type: "toggle-mirror-x" })}
            aria-pressed={specular.horizontalMirror} className={toggleClass(specular.horizontalMirror)}>
            ↔ X
          </button>
          <button type="button" onClick={() => dispatch({ type: "toggle-mirror-y" })}
            aria-pressed={specular.verticalMirror} className={toggleClass(specular.verticalMirror)}>
            ↕ Y
          </button>
        </div>
        <SliderRow label="fold" min={0} max={12} step={1} value={specular.mirrorCount}
          accent="accent-amber-400" onChange={(v) => dispatch({ type: "set-mirror-count", payload: v })} />
        <SliderRow label="off" min={-0.5} max={0.5} step={0.01} value={specular.mirrorOffset}
          accent="accent-amber-400" onChange={(v) => dispatch({ type: "set-mirror-offset", payload: v })} />
      </div>
    </div>
  );
}
