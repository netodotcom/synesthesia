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

/**
 * Vetor Cromático (Lei 7 — Thin Projection): gradação de cor aplicada como
 * transformação contínua no último estágio do pixel pipeline (GPU). Defaults =
 * identidade, então o visual não muda até o usuário tocar nos controles.
 */
export interface ChromaParams {
  /** Offset DC linear da onda de pixel, -0.5..0.5. */
  brightness: number;
  /** Expansão sigmoidal da distribuição RGB em torno de 0.5, 0..2. */
  contrast: number;
  /** Correção exponencial não-linear V^(1/γ), 0.2..3. */
  gamma: number;
  /** Magnitude do vetor de cor relativa ao eixo de luma, 0..2. */
  saturation: number;
  /** Rotação angular do vetor de cor (Rodrigues em torno de (1,1,1)), 0..TAU. */
  hueShift: number;
  /** Multiplicador de fótons (gatilho de bloom), 0..2. */
  exposure: number;
}

/**
 * Vetor Especular (Lei 8 — Structural Mutation): dobra o tecido de coordenadas
 * $UV$ na base do fragment shader, ANTES da geração do padrão. Compõe-se por
 * cima da dobra radial `segments` já existente.
 */
export interface SpecularParams {
  /** Dobra no eixo X (espelho esquerda/direita): uv.x = abs(uv.x). */
  horizontalMirror: boolean;
  /** Dobra no eixo Y (espelho cima/baixo): uv.y = abs(uv.y). */
  verticalMirror: boolean;
  /** Coeficiente de multiplicação radial extra, 0..12 (0 = nenhuma dobra). */
  mirrorCount: number;
  /** Deslocamento espacial da âncora da dobra, -0.5..0.5. */
  mirrorOffset: number;
}

/** Parâmetros canônicos do visual. A UI escreve; o loop de render lê via ref. */
export interface VisualParams {
  /** Nº de fatias simétricas do caleidoscópio. */
  segments: number;
  /** Índice da paleta ativa. */
  paletteId: number;
  /** Inverte a paleta ativa. */
  paletteInverted: boolean;
  /** Velocidade de rotação base, rad/s (sinal = sentido). */
  rotationSpeed: number;
  /** Escala do feed (zoom). */
  zoom: number;
  /** Intensidade do domain-warp. */
  warp: number;
  /** Strobo guiado pela energia de sub-grave. */
  strobe: boolean;
  /** Persistência/feedback (0 = desligado). */
  trails: number;
  /** Id da fonte de padrão ativa (ver patterns/registry). */
  patternId: string;
  /** Ganho geral do áudio sobre o visual. */
  reactivity: number;
  /** Gradação de cor (Vetor Cromático). */
  chroma: ChromaParams;
  /** Dobra de coordenadas (Vetor Especular). */
  specular: SpecularParams;
}

/** Estado neutro e calmo — ponto de partida seguro do deck. */
export function createDefaultVisualParams(): VisualParams {
  return {
    segments: 6,
    paletteId: 0,
    paletteInverted: false,
    rotationSpeed: 0.2,
    zoom: 1,
    warp: 0.15,
    strobe: false,
    trails: 0,
    patternId: "procedural-spiral",
    reactivity: 1,
    chroma: { brightness: 0, contrast: 1, gamma: 1, saturation: 1, hueShift: 0, exposure: 1 },
    specular: { horizontalMirror: false, verticalMirror: false, mirrorCount: 0, mirrorOffset: 0 },
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
