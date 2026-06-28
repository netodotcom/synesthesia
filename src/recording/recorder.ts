/**
 * Gravação da apresentação ao vivo (caleidoscópio + áudio) num único arquivo.
 *
 * Combina os tracks de vídeo do canvas (captureStream) com os tracks de áudio do
 * AudioGraph (MediaStreamAudioDestinationNode) e codifica via MediaRecorder.
 * Prefere MP4 (avc1 + aac) quando o navegador suporta; cai para WebM (vp9/opus).
 *
 * Tudo é injetável por seams (createRecorder, isTypeSupported) para testar sem
 * MediaRecorder nativo — o jsdom não o implementa.
 */

/** Estado da gravação. Definido localmente de propósito (não em lib/types). */
export type RecordingState = "idle" | "recording" | "encoding";

export interface RecordingMime {
  /** mimeType completo passado ao MediaRecorder. */
  mimeType: string;
  /** Extensão do arquivo resultante, sem ponto (ex.: "mp4"). */
  extension: string;
}

/** Candidatos em ordem de preferência: MP4/AAC primeiro, depois WebM/VP9. */
const MP4_MIME = "video/mp4;codecs=avc1.42E01E,mp4a.40.2";
const WEBM_MIME = "video/webm;codecs=vp9,opus";

/** Checagem nativa segura: o jsdom não tem MediaRecorder. */
function nativeIsTypeSupported(type: string): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof MediaRecorder.isTypeSupported === "function" &&
    MediaRecorder.isTypeSupported(type)
  );
}

/**
 * Escolhe o melhor container/codec suportado. Puro e testável: receba o
 * predicado de suporte. Retorna null quando nada é suportado (chamador decide).
 */
export function pickRecordingMime(
  isTypeSupported: (type: string) => boolean = nativeIsTypeSupported,
): RecordingMime | null {
  if (isTypeSupported(MP4_MIME)) return { mimeType: MP4_MIME, extension: "mp4" };
  if (isTypeSupported(WEBM_MIME)) return { mimeType: WEBM_MIME, extension: "webm" };
  // Fallbacks genéricos: deixa o navegador escolher o codec dentro do container.
  if (isTypeSupported("video/mp4")) return { mimeType: "video/mp4", extension: "mp4" };
  if (isTypeSupported("video/webm")) return { mimeType: "video/webm", extension: "webm" };
  return null;
}

export interface DeckRecorderOptions {
  /** Quadros por segundo capturados do canvas (default: 30). */
  fps?: number;
  /** Intervalo (ms) entre chunks emitidos pelo MediaRecorder (default: 1000). */
  timeslice?: number;
  /** Seam de teste: fabrica o MediaRecorder (default: construtor nativo). */
  createRecorder?: (stream: MediaStream, options?: MediaRecorderOptions) => MediaRecorder;
  /** Seam de teste: checa suporte a mime (default: MediaRecorder.isTypeSupported). */
  isTypeSupported?: (type: string) => boolean;
}

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  extension: string;
}

/**
 * Orquestra uma sessão de gravação. Construtor recebe o canvas e o stream de
 * áudio (ou null, quando ainda não há fonte). start() monta o stream combinado e
 * começa; stop() resolve com o Blob final.
 */
export class DeckRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private mime: RecordingMime | null = null;
  private _state: RecordingState = "idle";

  private readonly fps: number;
  private readonly timeslice: number;
  private readonly createRecorder: (
    stream: MediaStream,
    options?: MediaRecorderOptions,
  ) => MediaRecorder;
  private readonly isTypeSupported?: (type: string) => boolean;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly audio: MediaStream | null,
    options: DeckRecorderOptions = {},
  ) {
    this.fps = options.fps ?? 30;
    this.timeslice = options.timeslice ?? 1000;
    this.createRecorder =
      options.createRecorder ?? ((stream, opts) => new MediaRecorder(stream, opts));
    this.isTypeSupported = options.isTypeSupported;
  }

  get state(): RecordingState {
    return this._state;
  }

  /** mimeType escolhido na gravação atual (null antes de start()). */
  get mimeType(): string | null {
    return this.mime?.mimeType ?? null;
  }

  /** Inicia a captura. Idempotente: ignora se já gravando/codificando. */
  start(): void {
    if (this._state !== "idle") return;

    const mime = pickRecordingMime(this.isTypeSupported);
    if (!mime) {
      throw new Error("Nenhum formato de gravação suportado (MP4/WebM) neste navegador.");
    }
    this.mime = mime;

    const videoTracks = this.canvas.captureStream(this.fps).getVideoTracks();
    const audioTracks = this.audio?.getAudioTracks() ?? [];
    this.stream = new MediaStream([...videoTracks, ...audioTracks]);

    this.chunks = [];
    const recorder = this.createRecorder(this.stream, { mimeType: mime.mimeType });
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) this.chunks.push(event.data);
    };
    this.recorder = recorder;
    recorder.start(this.timeslice);
    this._state = "recording";
  }

  /**
   * Encerra a captura e resolve com o Blob montado a partir dos chunks. Passa
   * por "encoding" enquanto o MediaRecorder finaliza e volta a "idle" ao resolver.
   */
  stop(): Promise<RecordingResult> {
    return new Promise<RecordingResult>((resolve, reject) => {
      const recorder = this.recorder;
      const mime = this.mime;
      if (!recorder || !mime || this._state !== "recording") {
        reject(new Error("Gravação não está ativa."));
        return;
      }

      this._state = "encoding";
      recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mime.mimeType });
        this.releaseStream();
        this._state = "idle";
        resolve({ blob, mimeType: mime.mimeType, extension: mime.extension });
      };
      recorder.stop();
    });
  }

  /** Libera tracks e referências sem resolver promessa (uso interno/dispose). */
  private releaseStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
  }

  /** Aborta o que estiver em curso e libera recursos. Seguro chamar a qualquer hora. */
  dispose(): void {
    if (this.recorder && this._state === "recording") {
      this.recorder.ondataavailable = null;
      this.recorder.onstop = null;
      try {
        this.recorder.stop();
      } catch {
        // ignora: alguns estados já estão finalizando.
      }
    }
    this.releaseStream();
    this.chunks = [];
    this._state = "idle";
  }
}

/** Dispara o download de um Blob via <a download> efêmero, revogando a URL. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
