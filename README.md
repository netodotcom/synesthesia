# Synesthesia

A browser-based, audio-reactive **image manipulation** VJ instrument. Build a pool
of textures from the **Unsplash API** and **local uploads**, blend and warp them on
the GPU, and drive the mix from two parameter **worktrees** — inspired by the
node/parameter workflow of Synesthesia VJ. Upload a track or use the microphone,
and record the performance straight to video.

**Live:** https://netodotcom.github.io/synesthesia

---

## How it works

Two stages, entirely GPU pixel manipulation (no 3D geometry):

1. **Texture pool → blend.** The images you select are blended per frame with a
   chosen algorithm; an automatic transition slides the active window over the
   pool on a timer or on the beat.
2. **Geometric filter.** The blended result is distorted by an optional pattern
   (grid / spiral / rings) — the old fixed visuals reborn as UV filters.

Audio (file or mic) modulates the brightness and the beat-synced transitions.

## Features

- **Input engine (texture pool):**
  - Unsplash — loads the first 5 photos of a default profile automatically,
    **search any profile**, and **Fetch More** to page in fresh images (falls
    back to random photos when a profile runs out).
  - **Local uploads** — drag-and-drop or pick `.png` / `.jpg`, injected straight
    into the pool.
  - **Multi-select** — pick any number of images (marked with a ✓); the selection
    is what feeds the pipeline, and it persists across reloads.
- **Blend worktree:** blend modes — **Difference · Exclusion · Screen · Add ·
  Displacement** (luma of the upper layers melts the base layer) — plus layer
  density, transition frequency (seconds or **beat**), and audio reactivity.
- **Geometric pattern worktree:** **Grid** (tiles, gap, alternating rotation),
  **Spiral** (tightness, rotation speed, central zoom), **Rings / Tunnel** (ring
  count, radial frequency, tunnel speed).
- **Audio in:** upload `.mp3` / `.wav` (full transport) or the live **microphone**;
  offline BPM/beat-grid detection and a click-to-seek **waveform**.
- **Live recording:** capture canvas + audio to **MP4** (H.264/AAC), WebM fallback.
- **60 fps hot path:** all per-frame work runs in `requestAnimationFrame` via refs;
  the React tree never re-renders per frame. Textures are lifecycle-managed
  (dispose + object-URL revocation) so repeated uploads/swaps don't leak.

## Unsplash API key

The Unsplash **Access Key** is public by design (Client-ID auth, no user login).
Provide it either way:

- Local dev: put `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=...` in `.env.local` (gitignored).
- Anywhere (incl. the deployed site): paste it into the pool panel — it's saved in
  `localStorage`, never committed.

Photos are hotlinked and credited per the Unsplash API guidelines.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Three.js** — one GLSL fragment shader on a fullscreen quad (multi-texture blend
  + geometric UV filters); no R3F overhead
- **Web Audio API** — `AudioContext` / `AnalyserNode`, mic + file routing, FFT bands
- **MediaRecorder** + `canvas.captureStream()` for live video capture
- **Tailwind CSS v4** · **Vitest**

## Architecture

The engine is decoupled from the UI: audio analysis, tempo/beat-grid detection,
the texture pool + layer scheduler, the renderer, and the recorder are pure modules.
React is a thin projection on top.

```
src/
  audio/      decode, FFT bands, beat detector, tempo/beat-grid, waveform peaks
  textures/   texture pool (GPU lifecycle) · layer scheduler (window over the pool)
  visuals/    three.js renderer, pipeline GLSL shader, uniforms
  patterns/   unsplash API client + types
  recording/  canvas + audio capture → MP4/WebM
  hooks/      audio analyser, pipeline params, texture pool
  components/ deck shell, stage canvas, worktree/pool controls (thin UI)
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
math, waveform peaks, the layer scheduler (window advance / beat / density), and
the uniform mapping — including an end-to-end test that decodes a real synthetic
WAV fixture and asserts the detected BPM.

## Deployment

Pushing to `main` builds a static export and publishes it to GitHub Pages via
GitHub Actions (`.github/workflows/deploy.yml`), served under the `/synesthesia`
base path.

## License

MIT
