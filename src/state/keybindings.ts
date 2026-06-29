import type { ParamActionType } from "@/state/visualParamsReducer";

/** Comandos do teclado: as ações discretas do reducer + 2 de troca de padrão. */
export type Command = ParamActionType | "pattern-prev" | "pattern-next";

export interface KeyBinding {
  key: string; // letra minúscula
  command: Command;
  label: string;
}

/**
 * Mapa fixo das 14 teclas (Q W E R A S D F Z X · T C V B). Fonte única para o
 * handler de teclado e para o overlay de ajuda. T C V B = gestos Chroma/Specular.
 */
export const KEY_BINDINGS: readonly KeyBinding[] = [
  { key: "q", command: "cycle-segments", label: "Fatias simétricas" },
  { key: "w", command: "cycle-palette", label: "Trocar / inverter paleta" },
  { key: "e", command: "toggle-strobe", label: "Strobo (sub-grave)" },
  { key: "r", command: "cycle-rotation", label: "Sentido + velocidade" },
  { key: "a", command: "zoom-in", label: "Zoom in" },
  { key: "s", command: "zoom-out", label: "Zoom out" },
  { key: "d", command: "inc-warp", label: "Distorção (warp)" },
  { key: "f", command: "toggle-trails", label: "Trails (persistência)" },
  { key: "z", command: "pattern-prev", label: "Padrão anterior" },
  { key: "x", command: "pattern-next", label: "Próximo padrão" },
  { key: "t", command: "cycle-hue", label: "Girar matiz (hue)" },
  { key: "c", command: "cycle-mirror-count", label: "Dobras espelhadas extra" },
  { key: "v", command: "toggle-mirror-x", label: "Espelho horizontal" },
  { key: "b", command: "toggle-mirror-y", label: "Espelho vertical" },
];
