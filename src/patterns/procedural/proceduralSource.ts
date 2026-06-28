import * as THREE from "three";
import type { PatternContext, PatternSource } from "@/patterns/types";

/** Função de pixel: recebe (u,v) em 0..1 e devolve [r,g,b] em 0..255. */
export type PixelShader = (u: number, v: number) => [number, number, number];

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/**
 * Cria uma fonte procedural a partir de uma função de pixel. A textura é uma
 * `DataTexture` gerada na CPU (sem precisar do WebGLRenderer), com wrap repeat
 * para o caleidoscópio poder ladrilhar o feed.
 */
export function createProceduralSource(
  id: string,
  label: string,
  shade: PixelShader,
): PatternSource {
  let texture: THREE.DataTexture | null = null;

  return {
    id,
    label,
    kind: "procedural",
    getTexture({ size }: PatternContext) {
      const data = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const [r, g, b] = shade(x / size, y / size);
          data[i] = clamp255(r);
          data[i + 1] = clamp255(g);
          data[i + 2] = clamp255(b);
          data[i + 3] = 255;
        }
      }
      const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      texture?.dispose();
      texture = tex;
      return tex;
    },
    dispose() {
      texture?.dispose();
      texture = null;
    },
  };
}
