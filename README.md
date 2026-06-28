# Synesthesia

A browser-based, audio-reactive kaleidoscope — a live VJ instrument that turns
sound into procedurally generated, symmetric geometry in real time. Upload a
track or use the microphone, and drive the visuals from the keyboard while it
locks to the beat. Record the performance straight to video.

**Live:** https://netodotcom.github.io/synesthesia

---

## Features

- **Audio in:** upload `.mp3` / `.wav` (full transport — play/pause/seek/volume/loop)
  or switch to the live **microphone**.
- **Kaleidoscope engine:** a GLSL fragment shader on a fullscreen quad — polar
  folding, color palettes, domain warp, strobe and feedback trails, all on the GPU.
- **Beat grid:** offline BPM detection (autocorrelation over a kick-band onset
  envelope) builds a constant 4/4 grid; the visuals pulse on the downbeat.
- **Waveform:** the whole track is rendered as an instrument — playhead, the beat
  grid overlaid, and click-to-seek.
- **Pattern sources (pluggable):** procedural, bundled, or your own uploaded image.
- **Live recording:** capture the canvas + audio to **MP4** (H.264/AAC), with an
  automatic **WebM** fallback where MP4 isn't supported.
- **60 fps hot path:** all heavy work (FFT, matrix/uniform updates) runs in a
  `requestAnimationFrame` loop via refs — the React tree never re-renders per frame.

## Controls

| Key | Action |
|-----|--------|
| **Q** | Cycle number of symmetric slices |
| **W** | Swap / invert the color palette |
| **E** | Toggle sub-bass strobe |
| **R** | Flip direction + adjust rotation speed |
| **A** | Zoom in |
| **S** | Zoom out |
| **D** | Increase distortion (warp) |
| **F** | Toggle trails (feedback persistence) |
| **Z** | Previous pattern source |
| **X** | Next pattern source |

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Three.js** — raw GLSL fragment shader on a single fullscreen quad (no R3F overhead)
- **Web Audio API** — `AudioContext` / `AnalyserNode`, mic + file routing, FFT bands
- **MediaRecorder** + `canvas.captureStream()` for live video capture
- **Tailwind CSS v4** · **Vitest**

## Architecture

The engine is decoupled from the UI: audio analysis, tempo/beat-grid detection,
waveform extraction, the renderer, and the recorder are pure modules that run
without the DOM. React is a thin projection on top.

```
src/
  audio/      decode, FFT bands, beat detector, tempo/beat-grid, waveform peaks
  visuals/    three.js renderer, GLSL shaders, uniforms, beat pulse
  patterns/   pluggable pattern sources (procedural / static / upload)
  recording/  canvas + audio capture → MP4/WebM
  hooks/      audio analyser, keyboard controls, visual params
  components/ deck shell + controls (thin UI)
```

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

## Scripts

```bash
npm run dev        # dev server
npm run build      # static export to ./out (deployed to GitHub Pages)
npm run test       # unit + pipeline tests (Vitest)
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Tests

Unit tests cover the pure engine — FFT band slicing, beat detection, tempo/grid
math, and waveform peaks — including an end-to-end pipeline test that decodes a
real synthetic WAV fixture and asserts the detected BPM. Regenerate the fixture
with `node scripts/gen-test-wav.mjs`.

## Deployment

Pushing to `main` builds a static export and publishes it to GitHub Pages via
GitHub Actions (`.github/workflows/deploy.yml`). The site is served under the
`/synesthesia` base path.

## License

MIT
