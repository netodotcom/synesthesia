"use client";

import type { ReactNode } from "react";
import type { AudioBand } from "@/lib/types";

const BANDS: { value: AudioBand; label: string; title: string }[] = [
  { value: "none", label: "—", title: "Sem áudio" },
  { value: "sub", label: "S", title: "Sub" },
  { value: "low", label: "L", title: "Low" },
  { value: "mid", label: "M", title: "Mid" },
  { value: "high", label: "H", title: "High" },
];

/** Seletor compacto da banda de áudio ligada a um parâmetro (— S L M H). */
export function BandSelect({
  value,
  onChange,
}: {
  value: AudioBand;
  onChange: (b: AudioBand) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {BANDS.map((b) => (
        <button
          key={b.value}
          type="button"
          title={b.title}
          aria-pressed={value === b.value}
          onClick={() => onChange(b.value)}
          className={[
            "h-4 w-5 rounded-[4px] font-mono text-[9px] leading-none transition-colors",
            value === b.value
              ? b.value === "none"
                ? "bg-white/25 text-white"
                : "bg-fuchsia-500 text-white"
              : "bg-white/5 text-white/40 hover:bg-white/15",
          ].join(" ")}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

/** Linha de slider rotulada: label à esquerda, valor à direita, trilho abaixo. */
export function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  format,
  accent = "accent-fuchsia-500",
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  accent?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">{label}</span>
        <span className="font-mono text-[10px] text-white/70">
          {format ? format(value) : value}
        </span>
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

/** Slider com seletor de banda de áudio embaixo (parâmetro roteável). */
export function BoundSliderRow(props: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  accent?: string;
  band: AudioBand;
  onBand: (b: AudioBand) => void;
}) {
  const { band, onBand, ...slider } = props;
  return (
    <div className="flex flex-col gap-1">
      <SliderRow {...slider} />
      <BandSelect value={band} onChange={onBand} />
    </div>
  );
}

/** Dropdown rotulado (native select, estilizado). */
export function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-md border border-white/10 bg-black/50 px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-fuchsia-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-neutral-900">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Toggle segmentado (2+ opções mutuamente exclusivas). */
export function SegRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={[
              "flex-1 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
              value === o.value
                ? "bg-fuchsia-500 text-white"
                : "bg-white/10 text-white/50 hover:bg-white/20",
            ].join(" ")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Painel de worktree colapsável, semitransparente, com título mono. */
export function Worktree({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="w-64 rounded-xl bg-black/50 backdrop-blur-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/50 transition-colors hover:text-white/80"
      >
        <span>{title}</span>
        <span className="text-white/40">{open ? "–" : "+"}</span>
      </button>
      {open && <div className="flex flex-col gap-3 px-3 pb-3">{children}</div>}
    </div>
  );
}
