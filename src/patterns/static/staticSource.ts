import * as THREE from "three";
import type { PatternSource } from "@/patterns/types";

/**
 * Fonte de imagem estática carregada de uma URL (ex.: arquivo em /public).
 * Troque os assets em `public/patterns/` para customizar o look — nada mais muda.
 */
export function createStaticSource(
  id: string,
  label: string,
  url: string,
): PatternSource {
  let texture: THREE.Texture | null = null;

  return {
    id,
    label,
    kind: "static",
    getTexture() {
      return new Promise<THREE.Texture>((resolve, reject) => {
        new THREE.TextureLoader().load(
          url,
          (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            texture?.dispose();
            texture = tex;
            resolve(tex);
          },
          undefined,
          (err) => reject(err instanceof Error ? err : new Error(`Falha ao carregar ${url}`)),
        );
      });
    },
    dispose() {
      texture?.dispose();
      texture = null;
    },
  };
}
