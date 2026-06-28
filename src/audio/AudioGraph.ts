import type { AudioFrame, FreqBands } from "@/lib/types";
import { computeBands, computeLevel, DEFAULT_BANDS, type BandRanges } from "@/audio/bands";
import { BeatDetector, type BeatDetectorOptions } from "@/audio/beat";

export type AudioSourceKind = "file" | "mic";

export interface AudioGraphOptions {
  fftSize?: number;
  smoothing?: number;
  beat?: Partial<BeatDetectorOptions>;
  bands?: BandRanges;
  /** Seam de injeção para testes (default: new AudioContext()). */
  createContext?: () => AudioContext;
}

/** Versão mutável do AudioFrame, reusada a cada frame (zero alocação). */
type MutableFrame = {
  frequency: Uint8Array;
  bands: FreqBands;
  level: number;
  beat: boolean;
  beatEnergy: number;
};

/**
 * Mantém UM AudioContext e um único AnalyserNode. A troca mic↔arquivo apenas
 * reconecta nós no mesmo analyser — o contexto nunca é recriado.
 *
 * Roteamento: arquivo → analyser → destino (audível). Mic → analyser apenas
 * (não vai aos alto-falantes, para evitar realimentação/microfonia).
 */
export class AudioGraph {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private fileNode: MediaElementAudioSourceNode | null = null;
  private micNode: MediaStreamAudioSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private recordDest: MediaStreamAudioDestinationNode | null = null;
  private active: AudioSourceKind | null = null;

  private freq = new Uint8Array(0);
  private readonly bandsTarget: FreqBands = { sub: 0, low: 0, mid: 0, high: 0 };
  private readonly beat: BeatDetector;
  private readonly frame: MutableFrame;
  private readonly opts: AudioGraphOptions;

  constructor(options: AudioGraphOptions = {}) {
    this.opts = options;
    this.beat = new BeatDetector(options.beat);
    this.frame = {
      frequency: this.freq,
      bands: this.bandsTarget,
      level: 0,
      beat: false,
      beatEnergy: 0,
    };
  }

  get activeSource(): AudioSourceKind | null {
    return this.active;
  }

  private ensureContext(): AnalyserNode {
    if (!this.ctx) {
      this.ctx = (this.opts.createContext ?? (() => new AudioContext()))();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = this.opts.fftSize ?? 2048;
      this.analyser.smoothingTimeConstant = this.opts.smoothing ?? 0.8;
      this.freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.frame.frequency = this.freq;
    }
    return this.analyser!;
  }

  /** Conecta o elemento <audio> (arquivo). Idempotente por elemento. */
  async connectFile(el: HTMLAudioElement): Promise<void> {
    const analyser = this.ensureContext();
    await this.ctx!.resume();
    if (!this.fileNode) {
      // createMediaElementSource só pode ser chamado uma vez por elemento.
      this.fileNode = this.ctx!.createMediaElementSource(el);
    }
    void analyser;
    this.setSource("file");
  }

  /** Conecta um MediaStream do microfone (obtido via getUserMedia). */
  async connectMic(stream: MediaStream): Promise<void> {
    this.ensureContext();
    await this.ctx!.resume();
    this.micStream = stream;
    this.micNode = this.ctx!.createMediaStreamSource(stream);
    this.setSource("mic");
  }

  /** Reconecta os nós para a fonte escolhida, sem recriar o contexto. */
  setSource(kind: AudioSourceKind): void {
    if (!this.analyser || !this.ctx) return;
    this.fileNode?.disconnect();
    this.micNode?.disconnect();
    this.analyser.disconnect();

    if (kind === "file" && this.fileNode) {
      this.fileNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    } else if (kind === "mic" && this.micNode) {
      this.micNode.connect(this.analyser);
      // analyser NÃO vai ao destino: mic não é reproduzido.
    }
    // O tap de gravação (se já existir) captura a fonte ativa — arquivo OU mic.
    // É reconectado aqui porque analyser.disconnect() acima limpou suas saídas.
    if (this.recordDest) this.analyser.connect(this.recordDest);
    this.active = kind;
  }

  /**
   * Expõe um MediaStream de áudio para gravação. Cria (lazy) um
   * MediaStreamAudioDestinationNode e liga o analyser a ele, captando o que a
   * fonte ativa produz (arquivo e mic ambos passam pelo analyser). Não afeta o
   * roteamento audível existente — é uma saída adicional. Retorna null antes de
   * qualquer conexão (sem contexto/analyser).
   */
  getRecordingStream(): MediaStream | null {
    if (!this.ctx || !this.analyser) return null;
    if (!this.recordDest) {
      this.recordDest = this.ctx.createMediaStreamDestination();
      this.analyser.connect(this.recordDest);
    }
    return this.recordDest.stream;
  }

  /** Lê o FFT atual e devolve o frame reusado. Null antes de qualquer conexão. */
  sample(): AudioFrame | null {
    if (!this.analyser || !this.ctx) return null;
    this.analyser.getByteFrequencyData(this.freq);
    computeBands(this.freq, this.ctx.sampleRate, this.opts.bands ?? DEFAULT_BANDS, this.bandsTarget);
    const { beat, energy } = this.beat.detect(this.bandsTarget.sub);
    this.frame.level = computeLevel(this.freq);
    this.frame.beat = beat;
    this.frame.beatEnergy = energy;
    return this.frame;
  }

  /** Libera todos os recursos: nós, tracks do mic e o AudioContext. */
  dispose(): void {
    this.fileNode?.disconnect();
    this.micNode?.disconnect();
    this.analyser?.disconnect();
    this.recordDest?.disconnect();
    this.recordDest?.stream.getTracks().forEach((t) => t.stop());
    this.micStream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
    this.fileNode = null;
    this.micNode = null;
    this.micStream = null;
    this.recordDest = null;
    this.active = null;
  }
}
