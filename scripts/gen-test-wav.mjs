// Gera um WAV sintético de kicks 4/4 (PCM 16-bit mono) usado como fixture de
// teste end-to-end do pipeline de análise (decode → BPM → waveform).
// Reproduzível: `node scripts/gen-test-wav.mjs`. Determinístico (sem random).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const SAMPLE_RATE = 44100;
const DURATION_SEC = 8;
const BPM = 120;
const KICK_HZ = 60;
const OUT = resolve("tests/fixtures/kick-120bpm.wav");

const n = Math.floor(SAMPLE_RATE * DURATION_SEC);
const samples = new Float32Array(n);
const period = 60 / BPM;
const burst = Math.floor(0.04 * SAMPLE_RATE);

for (let t = 0; t < DURATION_SEC; t += period) {
  const start = Math.floor(t * SAMPLE_RATE);
  for (let i = 0; i < burst && start + i < n; i++) {
    const decay = Math.exp(-i / (burst * 0.3));
    samples[start + i] += Math.sin(2 * Math.PI * KICK_HZ * (i / SAMPLE_RATE)) * decay;
  }
}

const dataBytes = n * 2;
const buf = Buffer.alloc(44 + dataBytes);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + dataBytes, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); // tamanho do chunk fmt
buf.writeUInt16LE(1, 20); // PCM
buf.writeUInt16LE(1, 22); // mono
buf.writeUInt32LE(SAMPLE_RATE, 24);
buf.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
buf.writeUInt16LE(2, 32); // block align
buf.writeUInt16LE(16, 34); // bits por amostra
buf.write("data", 36);
buf.writeUInt32LE(dataBytes, 40);

let off = 44;
for (let i = 0; i < n; i++) {
  const s = Math.max(-1, Math.min(1, samples[i]));
  buf.writeInt16LE(Math.round(s * 32767), off);
  off += 2;
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, buf);
console.log(`wrote ${OUT} (${buf.length} bytes, ${BPM} BPM, ${DURATION_SEC}s)`);
