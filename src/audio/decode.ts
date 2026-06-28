import type { Track } from "@/lib/types";

/**
 * Decodifica um arquivo de áudio (.mp3/.wav) em um `Track` com o PCM completo,
 * para análise offline (BPM, waveform). Separado do AudioGraph de playback: aqui
 * só nos importa o buffer, não a reprodução.
 */

const ACCEPTED_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",
]);
const ACCEPTED_EXT = /\.(mp3|wav)$/i;

export interface DecodeOptions {
  /**
   * Seam de teste: converte ArrayBuffer → AudioBuffer.
   * Default: um OfflineAudioContext descartável (sem gesto/autoplay).
   */
  decode?: (data: ArrayBuffer) => Promise<AudioBuffer>;
}

/** true se o arquivo parece ser .mp3/.wav (por mime OU por extensão). */
export function isSupportedAudioFile(file: File): boolean {
  return ACCEPTED_TYPES.has(file.type) || ACCEPTED_EXT.test(file.name);
}

function defaultDecode(data: ArrayBuffer): Promise<AudioBuffer> {
  const Ctor =
    typeof OfflineAudioContext !== "undefined"
      ? OfflineAudioContext
      : (globalThis as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
          .webkitOfflineAudioContext;
  if (!Ctor) {
    return Promise.reject(new Error("OfflineAudioContext indisponível neste ambiente."));
  }
  const ctx = new Ctor(1, 1, 44100);
  return ctx.decodeAudioData(data);
}

/**
 * Lê e decodifica o arquivo. Lança erro claro em formato não suportado ou em
 * falha de decodificação (arquivo corrompido / codec ausente).
 */
export async function decodeAudioFile(
  file: File,
  opts: DecodeOptions = {},
): Promise<Track> {
  if (!isSupportedAudioFile(file)) {
    throw new Error(`Formato não suportado: "${file.name}". Use .mp3 ou .wav.`);
  }
  const data = await file.arrayBuffer();
  const decode = opts.decode ?? defaultDecode;
  let buffer: AudioBuffer;
  try {
    buffer = await decode(data);
  } catch (cause) {
    throw new Error(`Falha ao decodificar "${file.name}": ${String(cause)}`);
  }
  return { name: file.name, buffer, durationSec: buffer.duration };
}
