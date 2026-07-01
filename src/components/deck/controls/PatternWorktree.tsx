"use client";

import type { AudioBand, BindKey, GeoPattern, PipelineParams } from "@/lib/types";
import { BoundSliderRow, SelectRow, Worktree } from "@/components/deck/controls/fields";

interface Props {
  params: PipelineParams;
  patch: (p: Partial<PipelineParams>) => void;
  open: boolean;
  onToggle: () => void;
}

const PATTERN_OPTIONS: { value: GeoPattern; label: string }[] = [
  { value: "none", label: "Nenhum" },
  { value: "grid", label: "Grade" },
  { value: "spiral", label: "Espiral" },
  { value: "rings", label: "Anéis / Túnel" },
];

const TAU = Math.PI * 2;
const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * Worktree de padrões geométricos — filtros de UV sobre a mesclagem. Cada
 * parâmetro contínuo é roteável a uma banda de áudio (BoundSliderRow), então o
 * padrão respira/acelera com a música. Seletor + params contextuais do ativo.
 */
export function PatternWorktree({ params, patch, open, onToggle }: Props) {
  const { pattern, grid, spiral, rings } = params;
  const setBind = (key: BindKey, band: AudioBand) =>
    patch({ bindings: { ...params.bindings, [key]: band } });

  return (
    <Worktree title="Padrão geométrico" open={open} onToggle={onToggle}>
      <SelectRow
        label="Padrão"
        value={pattern}
        options={PATTERN_OPTIONS}
        onChange={(v) => patch({ pattern: v })}
      />

      {pattern === "grid" && (
        <>
          <BoundSliderRow
            label="Colunas / linhas"
            min={1}
            max={12}
            step={1}
            value={grid.count}
            band={params.bindings.gridCount}
            onBand={(b) => setBind("gridCount", b)}
            onChange={(v) => patch({ grid: { ...grid, count: v } })}
          />
          <BoundSliderRow
            label="Espaçamento"
            min={0}
            max={0.4}
            step={0.01}
            value={grid.gap}
            format={pct}
            band={params.bindings.gridGap}
            onBand={(b) => setBind("gridGap", b)}
            onChange={(v) => patch({ grid: { ...grid, gap: v } })}
          />
          <BoundSliderRow
            label="Rotação alternada"
            min={0}
            max={TAU}
            step={0.01}
            value={grid.altRotation}
            format={(v) => `${Math.round((v / TAU) * 360)}°`}
            band={params.bindings.gridAltRotation}
            onBand={(b) => setBind("gridAltRotation", b)}
            onChange={(v) => patch({ grid: { ...grid, altRotation: v } })}
          />
        </>
      )}

      {pattern === "spiral" && (
        <>
          <BoundSliderRow
            label="Voltas (aperto)"
            min={0}
            max={24}
            step={0.1}
            value={spiral.tightness}
            format={(v) => v.toFixed(1)}
            band={params.bindings.spiralTightness}
            onBand={(b) => setBind("spiralTightness", b)}
            onChange={(v) => patch({ spiral: { ...spiral, tightness: v } })}
          />
          <BoundSliderRow
            label="Velocidade de rotação"
            min={-2}
            max={2}
            step={0.01}
            value={spiral.speed}
            format={(v) => v.toFixed(2)}
            band={params.bindings.spiralSpeed}
            onBand={(b) => setBind("spiralSpeed", b)}
            onChange={(v) => patch({ spiral: { ...spiral, speed: v } })}
          />
          <BoundSliderRow
            label="Zoom central"
            min={0.2}
            max={4}
            step={0.01}
            value={spiral.zoom}
            format={(v) => `${v.toFixed(2)}×`}
            band={params.bindings.spiralZoom}
            onBand={(b) => setBind("spiralZoom", b)}
            onChange={(v) => patch({ spiral: { ...spiral, zoom: v } })}
          />
        </>
      )}

      {pattern === "rings" && (
        <>
          <BoundSliderRow
            label="Quantidade de anéis"
            min={1}
            max={24}
            step={1}
            value={rings.count}
            band={params.bindings.ringCount}
            onBand={(b) => setBind("ringCount", b)}
            onChange={(v) => patch({ rings: { ...rings, count: v } })}
          />
          <BoundSliderRow
            label="Frequência radial"
            min={0.2}
            max={8}
            step={0.1}
            value={rings.radialScale}
            format={(v) => v.toFixed(1)}
            band={params.bindings.ringRadialScale}
            onBand={(b) => setBind("ringRadialScale", b)}
            onChange={(v) => patch({ rings: { ...rings, radialScale: v } })}
          />
          <BoundSliderRow
            label="Velocidade do túnel"
            min={-3}
            max={3}
            step={0.01}
            value={rings.tunnelSpeed}
            format={(v) => v.toFixed(2)}
            band={params.bindings.tunnelSpeed}
            onBand={(b) => setBind("tunnelSpeed", b)}
            onChange={(v) => patch({ rings: { ...rings, tunnelSpeed: v } })}
          />
        </>
      )}
    </Worktree>
  );
}
