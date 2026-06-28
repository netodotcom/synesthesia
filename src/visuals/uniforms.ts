import * as THREE from "three";
import type { AudioFrame, VisualParams } from "@/lib/types";
import type { BeatPulse } from "@/visuals/beatPulse";

/** Contrato tipado dos uniforms do shader do caleidoscópio. */
export interface KaleidoUniforms {
  uTime: { value: number };
  uResolution: { value: THREE.Vector2 };
  uTexture: { value: THREE.Texture | null };
  uSegments: { value: number };
  uRotation: { value: number };
  uZoom: { value: number };
  uWarp: { value: number };
  uPaletteId: { value: number };
  uPaletteInvert: { value: number };
  uStrobe: { value: number };
  /** Plumbado para M6 (feedback/trails); ainda não lido pelo shader single-pass. */
  uTrails: { value: number };
  uBeat: { value: number };
  uLevel: { value: number };
  uBands: { value: THREE.Vector4 };
  uReactivity: { value: number };
  /** Pulso por beat travado no grid (M10): 1 no beat, decai entre beats. */
  uBeatPulse: { value: number };
  /** Pulso só no downbeat 4/4 (M10): dirige o respiro concêntrico. */
  uDownbeat: { value: number };
}

export function createUniforms(): KaleidoUniforms {
  return {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTexture: { value: null },
    uSegments: { value: 6 },
    uRotation: { value: 0 },
    uZoom: { value: 1 },
    uWarp: { value: 0.15 },
    uPaletteId: { value: 0 },
    uPaletteInvert: { value: 0 },
    uStrobe: { value: 0 },
    uTrails: { value: 0 },
    uBeat: { value: 0 },
    uLevel: { value: 0 },
    uBands: { value: new THREE.Vector4(0, 0, 0, 0) },
    uReactivity: { value: 1 },
    uBeatPulse: { value: 0 },
    uDownbeat: { value: 0 },
  };
}

/**
 * Projeta VisualParams + AudioFrame no estado dos uniforms para o frame atual.
 * Função pura sobre objetos simples (sem WebGL) → testável em node.
 *
 * @param dt segundos desde o último frame (acumula a rotação).
 * @param beat envelope do pulso travado no beat grid (M10); null/omitido → 0.
 */
export function applyUniforms(
  u: KaleidoUniforms,
  params: VisualParams,
  frame: AudioFrame | null,
  time: number,
  dt: number,
  beat?: BeatPulse | null,
): void {
  u.uTime.value = time;
  u.uSegments.value = Math.max(2, params.segments);
  u.uRotation.value += params.rotationSpeed * dt;
  u.uZoom.value = params.zoom;
  u.uWarp.value = params.warp;
  u.uPaletteId.value = params.paletteId;
  u.uPaletteInvert.value = params.paletteInverted ? 1 : 0;
  u.uStrobe.value = params.strobe ? 1 : 0;
  u.uTrails.value = params.trails;
  u.uReactivity.value = params.reactivity;

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

  // Pulso travado no beat grid (M10): independente do FFT — vem da grade.
  u.uBeatPulse.value = beat ? beat.beatPulse : 0;
  u.uDownbeat.value = beat ? beat.downbeatPulse : 0;
}
