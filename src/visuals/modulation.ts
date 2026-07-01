import type { AudioFrame, BindKey, PipelineParams } from "@/lib/types";

/**
 * Profundidade aditiva de cada parâmetro com energia de banda máxima (1.0). O
 * valor efetivo é `base + banda * reactivity * MOD_DEPTH[key]` — modulação
 * INSTANTÂNEA e NÃO cumulativa: o parâmetro estica/acelera/estoura no ataque e
 * volta ao baseline quando a banda silencia (banda = 0 ⇒ efetivo = base).
 */
export const MOD_DEPTH: Record<BindKey, number> = {
  displaceAmount: 0.6,
  layerDensity: 4,
  gridCount: 6,
  gridGap: 0.15,
  gridAltRotation: Math.PI,
  spiralTightness: 12,
  spiralSpeed: 2,
  spiralZoom: 1.5,
  ringCount: 8,
  ringRadialScale: 4,
  tunnelSpeed: 3,
  brightness: 1,
  glitchAmount: 1,
};

/** Energia instantânea (0..1) da banda ligada a uma chave; 0 se `none`/sem frame. */
export function bandEnergy(frame: AudioFrame | null, band: string): number {
  if (!frame || band === "none") return 0;
  return frame.bands[band as "sub" | "low" | "mid" | "high"] ?? 0;
}

/**
 * Valor efetivo de um parâmetro no frame: baseline modulado pela banda ligada.
 * Sem binding (ou sem áudio), devolve o baseline intacto.
 */
export function modulate(
  base: number,
  key: BindKey,
  params: PipelineParams,
  frame: AudioFrame | null,
): number {
  const band = params.bindings[key];
  if (band === "none") return base;
  return base + bandEnergy(frame, band) * params.reactivity * MOD_DEPTH[key];
}
