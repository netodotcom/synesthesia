import type { VisualParams } from "@/lib/types";

/** Ações puras do visual (as 8 teclas que não dependem do registry de padrões). */
export type ParamActionType =
  | "cycle-segments"
  | "cycle-palette"
  | "toggle-strobe"
  | "cycle-rotation"
  | "zoom-in"
  | "zoom-out"
  | "inc-warp"
  | "toggle-trails";

export interface ParamAction {
  type: ParamActionType;
}

export const SEGMENT_STEPS = [3, 4, 6, 8, 12, 16] as const;
export const ROTATION_SPEEDS = [-1.2, -0.6, -0.2, 0.2, 0.6, 1.2] as const;
export const PALETTE_COUNT = 4;

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 6;
const ZOOM_FACTOR = 1.15;
const WARP_STEP = 0.15;
const WARP_MAX = 1.5;
const TRAILS_ON = 0.85;

function nextInCycle<T>(values: readonly T[], current: T): T {
  const index = values.indexOf(current);
  return values[(index + 1) % values.length]; // não encontrado (-1) → primeiro
}

/** Acha o valor mais próximo do atual e avança um passo (vira sentido + velocidade). */
function nextRotationSpeed(current: number): number {
  let nearest = 0;
  let best = Infinity;
  ROTATION_SPEEDS.forEach((v, i) => {
    const d = Math.abs(v - current);
    if (d < best) {
      best = d;
      nearest = i;
    }
  });
  return ROTATION_SPEEDS[(nearest + 1) % ROTATION_SPEEDS.length];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Reducer puro: VisualParams + ação → novo VisualParams (nunca muta a entrada). */
export function visualParamsReducer(state: VisualParams, action: ParamAction): VisualParams {
  switch (action.type) {
    case "cycle-segments":
      return { ...state, segments: nextInCycle(SEGMENT_STEPS, state.segments as 3) };

    case "cycle-palette": {
      const paletteId = (state.paletteId + 1) % PALETTE_COUNT;
      // ao dar a volta nas paletas, inverte — cobre os 8 combos em 8 toques.
      const paletteInverted = paletteId === 0 ? !state.paletteInverted : state.paletteInverted;
      return { ...state, paletteId, paletteInverted };
    }

    case "toggle-strobe":
      return { ...state, strobe: !state.strobe };

    case "cycle-rotation":
      return { ...state, rotationSpeed: nextRotationSpeed(state.rotationSpeed) };

    case "zoom-in":
      return { ...state, zoom: clamp(state.zoom * ZOOM_FACTOR, ZOOM_MIN, ZOOM_MAX) };

    case "zoom-out":
      return { ...state, zoom: clamp(state.zoom / ZOOM_FACTOR, ZOOM_MIN, ZOOM_MAX) };

    case "inc-warp": {
      const warp = state.warp + WARP_STEP;
      return { ...state, warp: warp > WARP_MAX ? 0 : warp };
    }

    case "toggle-trails":
      return { ...state, trails: state.trails > 0 ? 0 : TRAILS_ON };

    default:
      return state;
  }
}
