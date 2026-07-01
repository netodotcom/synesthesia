"use client";

import {
  MAX_LAYERS,
  type AudioBand,
  type BeatTransition,
  type BindKey,
  type BlendMode,
  type PipelineParams,
  type TransitionMode,
} from "@/lib/types";
import { PRESETS } from "@/visuals/presets";
import {
  BoundSliderRow,
  SegRow,
  SelectRow,
  SliderRow,
  Worktree,
} from "@/components/deck/controls/fields";

interface Props {
  params: PipelineParams;
  patch: (p: Partial<PipelineParams>) => void;
  open: boolean;
  onToggle: () => void;
}

const BLEND_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
  { value: "screen", label: "Screen" },
  { value: "add", label: "Add" },
  { value: "displacement", label: "Displacement" },
];

const TRANSITION_OPTIONS: { value: TransitionMode; label: string }[] = [
  { value: "time", label: "Tempo" },
  { value: "beat", label: "Beat" },
];

const BEAT_MECHANICS: { value: BeatTransition; label: string }[] = [
  { value: "cut", label: "Cut" },
  { value: "warp", label: "Warp" },
];

const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * Worktree direita — pipeline de textura. Presets macro no topo, modo de mescla,
 * densidade/brilho/glitch (todos roteáveis a uma banda de áudio), frequência de
 * mudança (tempo × energia/beat com mecânica cut/warp) e reatividade global.
 */
export function BlendWorktree({ params, patch, open, onToggle }: Props) {
  const setBind = (key: BindKey, band: AudioBand) =>
    patch({ bindings: { ...params.bindings, [key]: band } });

  return (
    <Worktree title="Mesclagem" open={open} onToggle={onToggle}>
      {/* Presets macro — re-roteiam todos os bindings + modo/padrão base */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">Presets</span>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                patch({
                  blendMode: preset.blendMode,
                  pattern: preset.pattern,
                  bindings: preset.bindings,
                })
              }
              className="rounded-md bg-white/10 px-2 py-1 text-[10px] text-white/80 transition-colors hover:bg-fuchsia-500 hover:text-white"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <SelectRow
        label="Modo de mescla"
        value={params.blendMode}
        options={BLEND_OPTIONS}
        onChange={(v) => patch({ blendMode: v })}
      />

      <BoundSliderRow
        label="Densidade de camadas"
        min={1}
        max={MAX_LAYERS}
        step={1}
        value={params.layerDensity}
        onChange={(v) => patch({ layerDensity: v })}
        band={params.bindings.layerDensity}
        onBand={(b) => setBind("layerDensity", b)}
      />

      {params.blendMode === "displacement" && (
        <BoundSliderRow
          label="Deslocamento"
          min={0}
          max={1}
          step={0.01}
          value={params.displaceAmount}
          format={pct}
          onChange={(v) => patch({ displaceAmount: v })}
          band={params.bindings.displaceAmount}
          onBand={(b) => setBind("displaceAmount", b)}
        />
      )}

      <BoundSliderRow
        label="Brilho"
        min={0}
        max={3}
        step={0.01}
        value={params.brightness}
        format={(v) => `${v.toFixed(2)}×`}
        band={params.bindings.brightness}
        onBand={(b) => setBind("brightness", b)}
        onChange={(v) => patch({ brightness: v })}
      />

      <BoundSliderRow
        label="Glitch / tearing"
        min={0}
        max={1}
        step={0.01}
        value={params.glitchAmount}
        format={pct}
        band={params.bindings.glitchAmount}
        onBand={(b) => setBind("glitchAmount", b)}
        onChange={(v) => patch({ glitchAmount: v })}
      />

      <SegRow
        label="Frequência de mudança"
        value={params.transitionMode}
        options={TRANSITION_OPTIONS}
        onChange={(v) => patch({ transitionMode: v })}
      />

      {params.transitionMode === "time" && (
        <SliderRow
          label="Intervalo"
          min={0}
          max={12}
          step={0.5}
          value={params.transitionInterval}
          format={(v) => (v === 0 ? "manual" : `${v.toFixed(1)}s`)}
          onChange={(v) => patch({ transitionInterval: v })}
        />
      )}

      {params.transitionMode === "beat" && (
        <>
          <SegRow
            label="Mecânica"
            value={params.beatTransition}
            options={BEAT_MECHANICS}
            onChange={(v) => patch({ beatTransition: v })}
          />
          <SliderRow
            label="Limiar de energia"
            min={0}
            max={1}
            step={0.01}
            value={params.beatThreshold}
            format={pct}
            onChange={(v) => patch({ beatThreshold: v })}
          />
        </>
      )}

      <SliderRow
        label="Reatividade ao áudio"
        min={0}
        max={2}
        step={0.01}
        value={params.reactivity}
        format={pct}
        accent="accent-cyan-400"
        onChange={(v) => patch({ reactivity: v })}
      />
    </Worktree>
  );
}
