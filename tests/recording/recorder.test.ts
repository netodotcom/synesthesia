import { describe, it, expect, vi } from "vitest";
import { DeckRecorder, pickRecordingMime } from "@/recording/recorder";

const MP4 = "video/mp4;codecs=avc1.42E01E,mp4a.40.2";
const WEBM = "video/webm;codecs=vp9,opus";

/** MediaRecorder falso: jsdom não implementa o nativo. */
class FakeMediaRecorder {
  static lastInstance: FakeMediaRecorder | null = null;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state: "inactive" | "recording" | "paused" = "inactive";
  startCalls: Array<number | undefined> = [];

  constructor(
    public readonly stream: MediaStream,
    public readonly options?: { mimeType?: string },
  ) {
    FakeMediaRecorder.lastInstance = this;
  }

  start(timeslice?: number) {
    this.state = "recording";
    this.startCalls.push(timeslice);
  }

  /** Simula um chunk chegando do encoder. */
  emit(data: Blob) {
    this.ondataavailable?.({ data });
  }

  stop() {
    this.state = "inactive";
    // Encerramento assíncrono como no nativo.
    queueMicrotask(() => this.onstop?.());
  }
}

/** Canvas falso com captureStream retornando um video track. */
function fakeCanvas(): HTMLCanvasElement {
  return {
    captureStream: (_fps?: number) => ({
      getVideoTracks: () => [{ kind: "video", stop() {} }],
    }),
  } as unknown as HTMLCanvasElement;
}

/** Stream de áudio falso com N tracks. */
function fakeAudio(trackCount: number): MediaStream {
  const tracks = Array.from({ length: trackCount }, () => ({ kind: "audio", stop() {} }));
  return { getAudioTracks: () => tracks } as unknown as MediaStream;
}

/** MediaStream global é necessário no construtor de DeckRecorder.start(). */
function stubGlobalMediaStream() {
  class FakeStream {
    tracks: unknown[];
    constructor(tracks: unknown[] = []) {
      this.tracks = tracks;
    }
    getTracks() {
      return this.tracks;
    }
  }
  vi.stubGlobal("MediaStream", FakeStream as unknown as typeof MediaStream);
}

describe("pickRecordingMime", () => {
  it("prefere MP4 (avc1+aac) quando suportado", () => {
    const supported = (t: string) => t === MP4 || t === WEBM;
    expect(pickRecordingMime(supported)).toEqual({ mimeType: MP4, extension: "mp4" });
  });

  it("cai para WebM (vp9/opus) quando MP4 não é suportado", () => {
    const supported = (t: string) => t === WEBM;
    expect(pickRecordingMime(supported)).toEqual({ mimeType: WEBM, extension: "webm" });
  });

  it("usa fallback genérico video/mp4 quando o codec específico falha", () => {
    const supported = (t: string) => t === "video/mp4";
    expect(pickRecordingMime(supported)).toEqual({ mimeType: "video/mp4", extension: "mp4" });
  });

  it("retorna null quando nada é suportado", () => {
    expect(pickRecordingMime(() => false)).toBeNull();
  });
});

describe("DeckRecorder", () => {
  it("inicia em idle e transiciona para recording no start()", () => {
    stubGlobalMediaStream();
    const recorder = new DeckRecorder(fakeCanvas(), fakeAudio(1), {
      createRecorder: (s, o) => new FakeMediaRecorder(s, o) as unknown as MediaRecorder,
      isTypeSupported: (t) => t === MP4,
    });
    expect(recorder.state).toBe("idle");
    recorder.start();
    expect(recorder.state).toBe("recording");
    expect(recorder.mimeType).toBe(MP4);
  });

  it("combina os tracks de vídeo do canvas com os de áudio", () => {
    stubGlobalMediaStream();
    const recorder = new DeckRecorder(fakeCanvas(), fakeAudio(2), {
      createRecorder: (s, o) => new FakeMediaRecorder(s, o) as unknown as MediaRecorder,
      isTypeSupported: () => true,
    });
    recorder.start();
    const stream = FakeMediaRecorder.lastInstance!.stream as unknown as {
      getTracks: () => unknown[];
    };
    // 1 video track + 2 audio tracks.
    expect(stream.getTracks()).toHaveLength(3);
  });

  it("monta o Blob a partir dos chunks e volta a idle (recording→encoding→idle)", async () => {
    stubGlobalMediaStream();
    const recorder = new DeckRecorder(fakeCanvas(), null, {
      createRecorder: (s, o) => new FakeMediaRecorder(s, o) as unknown as MediaRecorder,
      isTypeSupported: (t) => t === WEBM,
    });
    recorder.start();
    const fake = FakeMediaRecorder.lastInstance!;
    fake.emit(new Blob(["aa"]));
    fake.emit(new Blob(["bbb"]));

    const promise = recorder.stop();
    // Durante a finalização o estado é "encoding".
    expect(recorder.state).toBe("encoding");

    const result = await promise;
    expect(result.mimeType).toBe(WEBM);
    expect(result.extension).toBe("webm");
    expect(result.blob.size).toBe(5); // "aa" + "bbb"
    expect(recorder.state).toBe("idle");
  });

  it("lança quando nenhum formato é suportado", () => {
    stubGlobalMediaStream();
    const recorder = new DeckRecorder(fakeCanvas(), null, {
      createRecorder: (s, o) => new FakeMediaRecorder(s, o) as unknown as MediaRecorder,
      isTypeSupported: () => false,
    });
    expect(() => recorder.start()).toThrow();
    expect(recorder.state).toBe("idle");
  });

  it("stop() rejeita quando não está gravando", async () => {
    stubGlobalMediaStream();
    const recorder = new DeckRecorder(fakeCanvas(), null, {
      createRecorder: (s, o) => new FakeMediaRecorder(s, o) as unknown as MediaRecorder,
      isTypeSupported: () => true,
    });
    await expect(recorder.stop()).rejects.toThrow();
  });

  it("ignora start() repetido enquanto grava", () => {
    stubGlobalMediaStream();
    const recorder = new DeckRecorder(fakeCanvas(), null, {
      createRecorder: (s, o) => new FakeMediaRecorder(s, o) as unknown as MediaRecorder,
      isTypeSupported: () => true,
    });
    recorder.start();
    const first = FakeMediaRecorder.lastInstance;
    recorder.start();
    // Nenhum novo recorder foi criado.
    expect(FakeMediaRecorder.lastInstance).toBe(first);
  });

  it("dispose() aborta a gravação e zera o estado", () => {
    stubGlobalMediaStream();
    const recorder = new DeckRecorder(fakeCanvas(), null, {
      createRecorder: (s, o) => new FakeMediaRecorder(s, o) as unknown as MediaRecorder,
      isTypeSupported: () => true,
    });
    recorder.start();
    const fake = FakeMediaRecorder.lastInstance!;
    recorder.dispose();
    expect(fake.state).toBe("inactive");
    expect(recorder.state).toBe("idle");
  });
});
