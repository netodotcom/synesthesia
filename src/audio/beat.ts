/**
 * Detector de kick por energia de sub-grave.
 *
 * Estratégia (sem BPM tracking): compara a energia instantânea da banda
 * sub contra uma média móvel das energias recentes. Um pico que excede
 * `media * threshold` (e está acima de um piso absoluto) dispara um beat,
 * seguido de uma janela refratária que evita disparos duplos no mesmo kick.
 */

export interface BeatDetectorOptions {
  /** Sub deve exceder `média * threshold` para contar como kick. */
  threshold: number;
  /** Energia absoluta mínima (0..1) para qualquer detecção. */
  floor: number;
  /** Inércia da média móvel (0..1; maior = mais lenta). */
  smoothing: number;
  /** Decaimento de `energy` entre kicks (0..1 por frame). */
  decay: number;
  /** Frames de silêncio forçado após um kick. */
  refractoryFrames: number;
}

export const DEFAULT_BEAT_OPTIONS: BeatDetectorOptions = {
  threshold: 1.4,
  floor: 0.15,
  smoothing: 0.9,
  decay: 0.92,
  refractoryFrames: 6,
};

export interface BeatResult {
  /** true apenas no frame do kick. */
  beat: boolean;
  /** Intensidade do último kick 0..1, decaindo entre batidas. */
  energy: number;
}

export class BeatDetector {
  private avg = 0;
  private primed = false;
  private cooldown = 0;
  private energy = 0;
  private readonly opts: BeatDetectorOptions;

  constructor(options: Partial<BeatDetectorOptions> = {}) {
    this.opts = { ...DEFAULT_BEAT_OPTIONS, ...options };
  }

  /** Processa a energia de sub-grave (0..1) de um frame. */
  detect(sub: number): BeatResult {
    const { threshold, floor, smoothing, decay, refractoryFrames } = this.opts;

    // Primeiro frame só semeia a média — nunca dispara (evita falso kick no início).
    if (!this.primed) {
      this.primed = true;
      this.avg = sub;
      return { beat: false, energy: 0 };
    }

    const isBeat =
      this.cooldown <= 0 && sub >= floor && sub > this.avg * threshold;

    this.avg = this.avg * smoothing + sub * (1 - smoothing);

    if (isBeat) {
      this.cooldown = refractoryFrames;
      this.energy = Math.min(1, sub);
    } else {
      this.cooldown = Math.max(0, this.cooldown - 1);
      this.energy *= decay;
    }

    return { beat: isBeat, energy: this.energy };
  }

  reset(): void {
    this.avg = 0;
    this.primed = false;
    this.cooldown = 0;
    this.energy = 0;
  }
}
