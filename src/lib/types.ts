/**
 * Contratos de domínio compartilhados entre áudio, visual e UI.
 * Mantido sem dependências para poder ser importado em qualquer camada.
 */

/** Bandas de frequência derivadas do FFT, normalizadas 0..1. */
export interface FreqBands {
  /** ~20-120 Hz — kick / sub-grave. Dirige o pulso 4x4 travado no beat. */
  sub: number;
  /** ~120-500 Hz — corpo/baixo. */
  low: number;
  /** ~500-2000 Hz — médios/voz. */
  mid: number;
  /** ~2000-16000 Hz — agudos/hi-hats. Dirige o frenesi de alta frequência. */
  high: number;
}

/** Snapshot de áudio de um frame, consumido pelo loop de render. */
export interface AudioFrame {
  /** Magnitudes do FFT 0..255. Buffer reusado entre frames — não mutar. */
  readonly frequency: Uint8Array;
  /** Energia por banda, normalizada 0..1. */
  readonly bands: FreqBands;
  /** Energia global aproximada 0..1. */
  readonly level: number;
  /** true apenas no frame em que um kick (pico de sub-grave) é detectado. */
  readonly beat: boolean;
  /** Intensidade do último kick 0..1, decaindo entre batidas. */
  readonly beatEnergy: number;
}

/** Máximo de camadas (samplers) que o pipeline mescla por frame. */
export const MAX_LAYERS = 8;

/**
 * Como os pixels RGB de duas camadas se combinam. `displacement` é especial: os
 * canais de luma das camadas superiores deslocam as coordenadas UV da camada
 * base (textura "derretida"), em vez de misturar cor.
 */
export type BlendMode = "difference" | "exclusion" | "screen" | "add" | "displacement";

/** Filtro geométrico aplicado sobre o resultado da mesclagem (evolução dos padrões antigos). */
export type GeoPattern = "none" | "grid" | "spiral" | "rings";

/** Como avança a transição automática entre as imagens do pool. */
export type TransitionMode = "time" | "beat";

/** Padrão Grade: ladrilha a imagem combinada. */
export interface GridParams {
  /** Nº de colunas/linhas (grade quadrada). */
  count: number;
  /** Espaçamento entre ladrilhos, 0..0.4 (fração da célula). */
  gap: number;
  /** Rotação alternada (xadrez) dos ladrilhos, rad. */
  altRotation: number;
}

/** Padrão Espiral: distorce as UV num fluxo espiralado. */
export interface SpiralParams {
  /** Voltas / aperto da espiral. */
  tightness: number;
  /** Velocidade de rotação, rad/s. */
  speed: number;
  /** Zoom central (>1 aproxima o centro). */
  zoom: number;
}

/** Padrão Anéis: repete a imagem em círculos concêntricos (túnel). */
export interface RingParams {
  /** Quantidade de anéis (frequência radial). */
  count: number;
  /** Tiling angular da imagem ao redor do túnel. */
  radialScale: number;
  /** Velocidade de expansão do túnel. */
  tunnelSpeed: number;
}

/**
 * Fonte de modulação de áudio ligada a um parâmetro. `none` = valor estático;
 * caso contrário o pico instantâneo daquela banda modula o parâmetro no frame.
 */
export type AudioBand = "none" | "sub" | "low" | "mid" | "high";

/** Chaves dos parâmetros contínuos que aceitam roteamento de áudio (audioBinding). */
export type BindKey =
  | "displaceAmount"
  | "layerDensity"
  | "gridCount"
  | "gridGap"
  | "gridAltRotation"
  | "spiralTightness"
  | "spiralSpeed"
  | "spiralZoom"
  | "ringCount"
  | "ringRadialScale"
  | "tunnelSpeed"
  | "brightness"
  | "glitchAmount";

/** Lista canônica das chaves ligáveis (iteração de defaults/presets/UI). */
export const BIND_KEYS: BindKey[] = [
  "displaceAmount",
  "layerDensity",
  "gridCount",
  "gridGap",
  "gridAltRotation",
  "spiralTightness",
  "spiralSpeed",
  "spiralZoom",
  "ringCount",
  "ringRadialScale",
  "tunnelSpeed",
  "brightness",
  "glitchAmount",
];

/** Mecânica de transição no modo beat. */
export type BeatTransition = "cut" | "warp";

/**
 * Parâmetros canônicos do pipeline de textura. A UI (worktrees) escreve; o loop
 * de render lê via ref. Duas etapas: mesclagem das camadas → filtro geométrico.
 * Cada parâmetro contínuo pode ser roteado a uma banda de áudio via `bindings`.
 */
export interface PipelineParams {
  // --- Worktree direita: mesclagem (texture pipeline) ---
  /** Algoritmo de combinação dos pixels das camadas. */
  blendMode: BlendMode;
  /** Quantas imagens selecionadas aparecem sobrepostas por vez, 1..MAX_LAYERS. */
  layerDensity: number;
  /** Intensidade do deslocamento (modo displacement), 0..1. */
  displaceAmount: number;
  /** Brilho final multiplicado sobre a cor, 0..3. */
  brightness: number;
  /** Intensidade do glitch/tearing base (também disparado por picos de agudo), 0..1. */
  glitchAmount: number;
  /** Origem do avanço da transição automática (tempo x energia/beat). */
  transitionMode: TransitionMode;
  /** Intervalo da transição no modo tempo, em segundos (0 = sem avanço). */
  transitionInterval: number;
  /** Mecânica da transição no modo beat: corte seco ou warp por deslocamento. */
  beatTransition: BeatTransition;
  /** Limiar de beatEnergy (0..1) que dispara a troca no modo beat. */
  beatThreshold: number;

  // --- Worktree de padrões geométricos ---
  /** Filtro geométrico ativo sobre a mesclagem. */
  pattern: GeoPattern;
  grid: GridParams;
  spiral: SpiralParams;
  rings: RingParams;

  // --- Global ---
  /** Ganho geral do áudio sobre o visual, 0..2 (escala toda modulação). */
  reactivity: number;
  /** Roteamento de áudio por parâmetro (audioBinding de cada slider). */
  bindings: Record<BindKey, AudioBand>;
}

/**
 * Roteamento padrão de fábrica: Sub → escala/transição, Mid → deformação
 * geométrica, High → detalhe/emissão. É o estado reativo "out of the box".
 */
export function createDefaultBindings(): Record<BindKey, AudioBand> {
  return {
    displaceAmount: "sub",
    layerDensity: "none",
    gridCount: "high",
    gridGap: "high",
    gridAltRotation: "mid",
    spiralTightness: "none",
    spiralSpeed: "mid",
    spiralZoom: "none",
    ringCount: "none",
    ringRadialScale: "high",
    tunnelSpeed: "mid",
    brightness: "sub",
    glitchAmount: "high",
  };
}

/** Estado inicial calmo e legível — imagem quase intacta, mas já reativa. */
export function createDefaultPipelineParams(): PipelineParams {
  return {
    blendMode: "difference",
    layerDensity: 2,
    displaceAmount: 0.25,
    brightness: 1,
    glitchAmount: 0.2,
    transitionMode: "time",
    transitionInterval: 4,
    beatTransition: "cut",
    beatThreshold: 0.5,
    pattern: "none",
    grid: { count: 3, gap: 0.04, altRotation: 0 },
    spiral: { tightness: 3, speed: 0.15, zoom: 1 },
    rings: { count: 4, radialScale: 3, tunnelSpeed: 0.2 },
    reactivity: 1,
    bindings: createDefaultBindings(),
  };
}

/** Faixa de áudio decodificada (PCM completo) pronta para análise offline. */
export interface Track {
  /** Nome do arquivo original. */
  name: string;
  /** PCM decodificado da faixa inteira. */
  buffer: AudioBuffer;
  /** Duração em segundos (= buffer.duration). */
  durationSec: number;
}

/**
 * Grade de beats de andamento constante, estilo Rekordbox: BPM + uma âncora de
 * fase. Beats são derivados, não armazenados — a grade vale para qualquer t.
 */
export interface BeatGrid {
  /** Batidas por minuto detectadas. */
  bpm: number;
  /** Instante (s) de um beat conhecido — fixa a fase da grade. */
  anchorSec: number;
  /** Confiança da detecção, 0..1 (honestidade: exibir, nunca fingir). */
  confidence: number;
  /** Beats por compasso (4 = 4/4). */
  beatsPerBar: number;
  /** Instante (s) do beat de índice `i` (i pode ser negativo). */
  beatAt(index: number): number;
  /** Índice do beat mais próximo de `timeSec`. */
  beatIndexAt(timeSec: number): number;
  /** Instante (s) do beat mais próximo de `timeSec`. */
  nearestBeat(timeSec: number): number;
  /** true se o beat `i` é o downbeat (1 do compasso). */
  isDownbeat(index: number): boolean;
}

/** Picos min/max por bucket para desenhar a waveform da faixa inteira. */
export interface WaveformPeaks {
  /** Número de buckets (colunas da waveform). */
  length: number;
  /** Menor amostra de cada bucket, -1..1. */
  min: Float32Array;
  /** Maior amostra de cada bucket, -1..1. */
  max: Float32Array;
}
