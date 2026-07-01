import type { BeatTransition, TransitionMode } from "@/lib/types";

/**
 * Decide QUAIS camadas selecionadas estão ativas no frame, deslizando uma janela
 * de tamanho `density` sobre o pool selecionado. O avanço é por tempo (intervalo
 * em segundos) ou por ENERGIA (a `beatEnergy` do áudio cruzando um limiar). No
 * modo beat há duas mecânicas: `cut` (avança 1 — corte seco) e `warp` (embaralha
 * a janela por um passo pseudo-aleatório determinístico; a distorção visual do
 * warp mora no shader via uBeatWarp). Genérico sobre o tipo da camada para ser
 * testável sem three.js (números nos testes, `THREE.Texture` no app).
 */
export interface LayerScheduler<T> {
  /** Define o pool selecionado (ordem = ordem de seleção). Reinicia a janela. */
  setSelection(items: T[]): void;
  /** Ajusta densidade, modo, intervalo (s), limiar de energia e mecânica do beat. */
  setParams(
    density: number,
    mode: TransitionMode,
    intervalSec: number,
    beatThreshold?: number,
    beatTransition?: BeatTransition,
  ): void;
  /**
   * Chamado por frame com a `beatEnergy` (0..1) atual. Retorna a nova janela ativa
   * quando ela muda e `null` quando nada mudou (evita rebind à toa).
   */
  update(nowSec: number, beatEnergy: number): T[] | null;
}

export function createLayerScheduler<T>(): LayerScheduler<T> {
  let selection: T[] = [];
  let density = 1;
  let mode: TransitionMode = "time";
  let intervalSec = 4;
  let beatThreshold = 0.5;
  let beatTransition: BeatTransition = "cut";

  let start = 0;
  let lastAdvance = 0;
  let anchored = false; // ancora o relógio no 1º frame (now pode ser grande)
  let wasAbove = false; // borda de subida da energia sobre o limiar
  let shuffleSeed = 1; // LCG determinístico para o shuffle do modo warp
  let dirty = true; // força emitir a janela inicial

  function advance(n: number): void {
    if (beatTransition === "warp" && n > 1) {
      shuffleSeed = (shuffleSeed * 1103515245 + 12345) >>> 0;
      const step = 1 + (shuffleSeed % (n - 1)); // 1..n-1, nunca 0 (sempre muda)
      start = (start + step) % n;
    } else {
      start = (start + 1) % n;
    }
  }

  function window(): T[] {
    const n = selection.length;
    if (n === 0) return [];
    const count = Math.min(Math.max(1, Math.floor(density)), n);
    const out: T[] = [];
    for (let i = 0; i < count; i++) out.push(selection[(start + i) % n]);
    return out;
  }

  return {
    setSelection(items) {
      selection = items;
      start = 0;
      dirty = true;
    },
    setParams(nextDensity, nextMode, nextInterval, nextThreshold = 0.5, nextTransition = "cut") {
      if (nextDensity !== density || nextMode !== mode) dirty = true;
      density = nextDensity;
      mode = nextMode;
      intervalSec = nextInterval;
      beatThreshold = nextThreshold;
      beatTransition = nextTransition;
    },
    update(nowSec, beatEnergy) {
      const n = selection.length;
      if (n === 0) {
        if (dirty) {
          dirty = false;
          return [];
        }
        return null;
      }

      if (!anchored) {
        lastAdvance = nowSec;
        anchored = true;
      }

      let advanced = false;
      if (mode === "time") {
        if (intervalSec > 0 && nowSec - lastAdvance >= intervalSec) {
          advance(n);
          lastAdvance = nowSec;
          advanced = true;
        }
      } else {
        // beat: dispara na borda de subida da energia sobre o limiar.
        const above = beatEnergy >= beatThreshold;
        if (above && !wasAbove) {
          advance(n);
          advanced = true;
        }
        wasAbove = above;
      }

      if (!advanced && !dirty) return null;
      dirty = false;
      return window();
    },
  };
}
