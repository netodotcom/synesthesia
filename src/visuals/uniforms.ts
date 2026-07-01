import * as THREE from "three";
import type { AudioFrame, BlendMode, GeoPattern, PipelineParams } from "@/lib/types";
import { modulate } from "@/visuals/modulation";

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Ordem dos modos de mescla no shader (uBlendMode int). */
const BLEND_INDEX: Record<BlendMode, number> = {
  difference: 0,
  exclusion: 1,
  screen: 2,
  add: 3,
  displacement: 4,
};

/** Ordem dos filtros geométricos no shader (uPattern int). */
const PATTERN_INDEX: Record<GeoPattern, number> = {
  none: 0,
  grid: 1,
  spiral: 2,
  rings: 3,
};

/** Contrato tipado dos uniforms do shader do pipeline. */
export interface PipelineUniforms {
  uTime: { value: number };
  uResolution: { value: THREE.Vector2 };
  uAspect: { value: number };
  uLayers: { value: THREE.Texture[] };
  uLayerCount: { value: number };
  uBlendMode: { value: number };
  uDisplaceAmount: { value: number };
  uPattern: { value: number };
  uGridCount: { value: number };
  uGridGap: { value: number };
  uGridAltRot: { value: number };
  uSpiralTightness: { value: number };
  uSpiralSpeed: { value: number };
  uSpiralZoom: { value: number };
  uRingCount: { value: number };
  uRingRadialScale: { value: number };
  uTunnelSpeed: { value: number };
  uLevel: { value: number };
  uBeat: { value: number };
  uBands: { value: THREE.Vector4 };
  uReactivity: { value: number };
  uBrightness: { value: number };
  uGlitchAmount: { value: number };
  uBeatWarp: { value: number };
}

export function createUniforms(): PipelineUniforms {
  return {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uAspect: { value: 1 },
    uLayers: { value: [] }, // preenchido pelo renderer (fallbacks + janela ativa)
    uLayerCount: { value: 0 },
    uBlendMode: { value: 0 },
    uDisplaceAmount: { value: 0.25 },
    uPattern: { value: 0 },
    uGridCount: { value: 3 },
    uGridGap: { value: 0.04 },
    uGridAltRot: { value: 0 },
    uSpiralTightness: { value: 3 },
    uSpiralSpeed: { value: 0.15 },
    uSpiralZoom: { value: 1 },
    uRingCount: { value: 4 },
    uRingRadialScale: { value: 3 },
    uTunnelSpeed: { value: 0.2 },
    uLevel: { value: 0 },
    uBeat: { value: 0 },
    uBands: { value: new THREE.Vector4(0, 0, 0, 0) },
    uReactivity: { value: 1 },
    uBrightness: { value: 1 },
    uGlitchAmount: { value: 0 },
    uBeatWarp: { value: 0 },
  };
}

/**
 * Projeta PipelineParams + AudioFrame nos uniforms do frame, aplicando a
 * modulação de áudio por parâmetro (`bindings`). Instantânea e não cumulativa:
 * o valor efetivo depende só do pico da banda no frame; sem áudio, volta ao
 * baseline. Função pura sobre objetos simples (sem WebGL) → testável em node.
 * `uLayers`/`uLayerCount` (janela ativa) e `uAspect` são do renderer/scheduler.
 * `layerDensity` é modulado no StageCanvas (via scheduler), não aqui.
 */
export function applyUniforms(
  u: PipelineUniforms,
  params: PipelineParams,
  frame: AudioFrame | null,
  time: number,
): void {
  u.uTime.value = time;

  u.uBlendMode.value = BLEND_INDEX[params.blendMode];
  u.uDisplaceAmount.value = clamp(modulate(params.displaceAmount, "displaceAmount", params, frame), 0, 1);

  u.uPattern.value = PATTERN_INDEX[params.pattern];
  u.uGridCount.value = Math.max(1, modulate(params.grid.count, "gridCount", params, frame));
  u.uGridGap.value = clamp(modulate(params.grid.gap, "gridGap", params, frame), 0, 0.49);
  u.uGridAltRot.value = modulate(params.grid.altRotation, "gridAltRotation", params, frame);
  u.uSpiralTightness.value = modulate(params.spiral.tightness, "spiralTightness", params, frame);
  u.uSpiralSpeed.value = modulate(params.spiral.speed, "spiralSpeed", params, frame);
  u.uSpiralZoom.value = Math.max(0.05, modulate(params.spiral.zoom, "spiralZoom", params, frame));
  u.uRingCount.value = Math.max(1, modulate(params.rings.count, "ringCount", params, frame));
  u.uRingRadialScale.value = Math.max(0.1, modulate(params.rings.radialScale, "ringRadialScale", params, frame));
  u.uTunnelSpeed.value = modulate(params.rings.tunnelSpeed, "tunnelSpeed", params, frame);

  u.uReactivity.value = params.reactivity;
  u.uBrightness.value = clamp(modulate(params.brightness, "brightness", params, frame), 0, 3);
  u.uGlitchAmount.value = clamp(modulate(params.glitchAmount, "glitchAmount", params, frame), 0, 1);

  // Warp de transição: só empurra no modo beat+warp, proporcional à beatEnergy.
  u.uBeatWarp.value =
    params.transitionMode === "beat" && params.beatTransition === "warp" && frame
      ? frame.beatEnergy
      : 0;

  if (frame) {
    u.uBeat.value = frame.beatEnergy;
    u.uLevel.value = frame.level;
    u.uBands.value.set(frame.bands.sub, frame.bands.low, frame.bands.mid, frame.bands.high);
  } else {
    // Sem áudio: decai suave para um visual vivo, porém calmo.
    u.uBeat.value *= 0.9;
    u.uLevel.value *= 0.9;
    u.uBands.value.multiplyScalar(0.9);
  }
}
