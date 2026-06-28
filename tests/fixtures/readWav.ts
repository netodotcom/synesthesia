import { readFileSync } from "node:fs";
import type { PcmLike } from "@/audio/tempo";

/**
 * Lê um WAV PCM 16-bit (mono/estéreo) de disco para um PcmLike — espelha o que
 * o navegador entrega via decodeAudioData, mas sem Web Audio, para os testes de
 * pipeline rodarem headless (CI).
 */
export function readWav(path: string): PcmLike {
  const buf = readFileSync(path);
  const sampleRate = buf.readUInt32LE(24);
  const channels = buf.readUInt16LE(22);
  const bits = buf.readUInt16LE(34);

  // Localiza o chunk "data" (não assume offset fixo de 44).
  let off = 12;
  let dataOff = 44;
  let dataLen = buf.length - 44;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "data") {
      dataOff = off + 8;
      dataLen = size;
      break;
    }
    off += 8 + size + (size % 2);
  }

  const bytesPerSample = bits / 8;
  const frames = Math.floor(dataLen / (bytesPerSample * channels));
  const ch0 = new Float32Array(frames);
  const ch1 = channels > 1 ? new Float32Array(frames) : null;
  for (let i = 0; i < frames; i++) {
    const base = dataOff + i * bytesPerSample * channels;
    ch0[i] = buf.readInt16LE(base) / 32768;
    if (ch1) ch1[i] = buf.readInt16LE(base + bytesPerSample) / 32768;
  }

  return {
    sampleRate,
    length: frames,
    numberOfChannels: channels,
    getChannelData: (c) => (c === 0 ? ch0 : (ch1 ?? ch0)),
  };
}
