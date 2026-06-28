import { describe, it, expect, vi } from "vitest";
import { decodeAudioFile, isSupportedAudioFile } from "@/audio/decode";

/** AudioBuffer falso suficiente para o que `decodeAudioFile` retorna. */
function fakeBuffer(durationSec: number): AudioBuffer {
  return { duration: durationSec } as unknown as AudioBuffer;
}

const wavFile = (name = "track.wav", type = "audio/wav") =>
  new File([new Uint8Array([1, 2, 3, 4])], name, { type });

describe("isSupportedAudioFile", () => {
  it("aceita por mime", () => {
    expect(isSupportedAudioFile(wavFile("x.bin", "audio/wav"))).toBe(true);
    expect(isSupportedAudioFile(wavFile("x.bin", "audio/mpeg"))).toBe(true);
  });

  it("aceita por extensão quando o mime vem vazio", () => {
    expect(isSupportedAudioFile(wavFile("song.mp3", ""))).toBe(true);
    expect(isSupportedAudioFile(wavFile("song.wav", ""))).toBe(true);
  });

  it("rejeita outros formatos", () => {
    expect(isSupportedAudioFile(wavFile("notes.txt", "text/plain"))).toBe(false);
  });
});

describe("decodeAudioFile", () => {
  it("decodifica e devolve um Track com duração do buffer", async () => {
    const decode = vi.fn().mockResolvedValue(fakeBuffer(123.4));
    const track = await decodeAudioFile(wavFile("mix.wav"), { decode });

    expect(decode).toHaveBeenCalledOnce();
    expect(track.name).toBe("mix.wav");
    expect(track.durationSec).toBeCloseTo(123.4);
    expect(track.buffer.duration).toBeCloseTo(123.4);
  });

  it("rejeita formato não suportado antes de tentar decodificar", async () => {
    const decode = vi.fn();
    await expect(decodeAudioFile(wavFile("a.txt", "text/plain"), { decode })).rejects.toThrow(
      /não suportado/i,
    );
    expect(decode).not.toHaveBeenCalled();
  });

  it("encapsula falha de decodificação numa mensagem clara", async () => {
    const decode = vi.fn().mockRejectedValue(new Error("EncodingError"));
    await expect(decodeAudioFile(wavFile("corrupt.mp3"), { decode })).rejects.toThrow(
      /Falha ao decodificar/i,
    );
  });
});
