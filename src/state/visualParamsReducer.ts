import type { ChromaParams, VisualParams } from "@/lib/types";

/** Ações discretas do visual (teclas que não dependem do registry de padrões). */
export type ParamActionType =
  | "cycle-segments"
  | "cycle-palette"
  | "toggle-strobe"
  | "cycle-rotation"
  | "zoom-in"
  | "zoom-out"
  | "inc-warp"
  | "toggle-trails"
  | "cycle-hue"
  | "cycle-mirror-count"
  | "toggle-mirror-x"
  | "toggle-mirror-y";

/**
 * União discriminada: ações discretas (teclado) + ações com `payload` (sliders
 * da UI, que setam valores absolutos). Reconciliação do CONTROLS.MD — os toggles
 * de espelho são discretos (não payload-axis) para casarem com o modelo de teclas.
 */
export type ParamAction =
  | { type: ParamActionType }
  | { type: "set-chroma"; payload: Partial<ChromaParams> }
  | { type: "set-mirror-count"; payload: number }
  | { type: "set-mirror-offset"; payload: number };

export const SEGMENT_STEPS = [3, 4, 6, 8, 12, 16] as const;
export const ROTATION_SPEEDS = [-1.2, -0.6, -0.2, 0.2, 0.6, 1.2] as const;
export const PALETTE_COUNT = 4;
/** Passos do `mirrorCount` ao ciclar pela tecla C (0 = sem dobra extra). */
export const MIRROR_COUNTS = [0, 2, 3, 4, 6, 8] as const;

export const TAU = Math.PI * 2;
/** Passo angular do hue ao ciclar pela tecla T (30°). */
export const HUE_STEP = TAU / 12;

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 6;
const ZOOM_FACTOR = 1.15;
const WARP_STEP = 0.15;
const WARP_MAX = 1.5;
const TRAILS_ON = 0.85;

const MIRROR_COUNT_MAX = 12;
const MIRROR_OFFSET_MAX = 0.5;

/** Faixas válidas de cada campo do Chroma (defaults = identidade). */
const CHROMA_RANGES: Record<keyof ChromaParams, readonly [number, number]> = {
  brightness: [-0.5, 0.5],
  contrast: [0, 2],
  gamma: [0.2, 3], // mínimo > 0 protege o 1/γ no shader
  saturation: [0, 2],
  hueShift: [0, TAU],
  exposure: [0, 2],
};

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

/** Normaliza um ângulo para [0, TAU). */
const wrapHue = (a: number) => ((a % TAU) + TAU) % TAU;

/** Mescla um patch parcial de Chroma já clampando cada campo à sua faixa. */
function mergeChroma(current: ChromaParams, patch: Partial<ChromaParams>): ChromaParams {
  const next = { ...current, ...patch };
  return {
    brightness: clamp(next.brightness, ...CHROMA_RANGES.brightness),
    contrast: clamp(next.contrast, ...CHROMA_RANGES.contrast),
    gamma: clamp(next.gamma, ...CHROMA_RANGES.gamma),
    saturation: clamp(next.saturation, ...CHROMA_RANGES.saturation),
    hueShift: wrapHue(next.hueShift),
    exposure: clamp(next.exposure, ...CHROMA_RANGES.exposure),
  };
}

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

    // --- Chroma --------------------------------------------------------------
    case "cycle-hue":
      return {
        ...state,
        chroma: { ...state.chroma, hueShift: wrapHue(state.chroma.hueShift + HUE_STEP) },
      };

    case "set-chroma":
      return { ...state, chroma: mergeChroma(state.chroma, action.payload) };

    // --- Specular ------------------------------------------------------------
    case "toggle-mirror-x":
      return {
        ...state,
        specular: { ...state.specular, horizontalMirror: !state.specular.horizontalMirror },
      };

    case "toggle-mirror-y":
      return {
        ...state,
        specular: { ...state.specular, verticalMirror: !state.specular.verticalMirror },
      };

    case "cycle-mirror-count":
      return {
        ...state,
        specular: {
          ...state.specular,
          mirrorCount: nextInCycle(MIRROR_COUNTS, state.specular.mirrorCount as 0),
        },
      };

    case "set-mirror-count":
      return {
        ...state,
        specular: {
          ...state.specular,
          mirrorCount: clamp(Math.round(action.payload), 0, MIRROR_COUNT_MAX),
        },
      };

    case "set-mirror-offset":
      return {
        ...state,
        specular: {
          ...state.specular,
          mirrorOffset: clamp(action.payload, -MIRROR_OFFSET_MAX, MIRROR_OFFSET_MAX),
        },
      };

    default:
      return state;
  }
}
