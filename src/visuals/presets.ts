import {
  createDefaultBindings,
  type AudioBand,
  type BindKey,
  type BlendMode,
  type GeoPattern,
} from "@/lib/types";

/** Um preset de fábrica: re-roteia todos os bindings e ajusta modo/padrão base. */
export interface Preset {
  id: string;
  name: string;
  blendMode: BlendMode;
  pattern: GeoPattern;
  bindings: Record<BindKey, AudioBand>;
}

/** Constrói um mapa de bindings a partir de um subconjunto (resto = "none"). */
function routing(partial: Partial<Record<BindKey, AudioBand>>): Record<BindKey, AudioBand> {
  const base = createDefaultBindings();
  for (const k of Object.keys(base) as BindKey[]) base[k] = "none";
  return { ...base, ...partial };
}

/**
 * Presets macro: um clique re-roteia TODAS as ligações das duas worktrees e
 * escolhe um modo de mescla + padrão que fazem o roteamento fazer sentido.
 */
export const PRESETS: Preset[] = [
  {
    id: "sub-melt",
    name: "Sub-Heavy Melt",
    blendMode: "displacement",
    pattern: "spiral",
    // Sub → displacement + nº de camadas; Mids → escala do padrão; Highs livres.
    bindings: routing({
      displaceAmount: "sub",
      layerDensity: "sub",
      spiralZoom: "mid",
      gridCount: "mid",
      ringCount: "mid",
    }),
  },
  {
    id: "geo-fracture",
    name: "Geometric Fracture",
    blendMode: "difference",
    pattern: "grid",
    // Highs → grade + gap; Mids → rotação; Sub → brilho.
    bindings: routing({
      gridCount: "high",
      gridGap: "high",
      gridAltRotation: "mid",
      spiralSpeed: "mid",
      brightness: "sub",
    }),
  },
  {
    id: "kinetic-vortex",
    name: "Kinetic Vortex",
    blendMode: "screen",
    pattern: "spiral",
    // Mids → aceleração rotacional (espiral + túnel); Highs → glitch.
    bindings: routing({
      spiralSpeed: "mid",
      tunnelSpeed: "mid",
      glitchAmount: "high",
    }),
  },
];
