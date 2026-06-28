import * as THREE from "three";
import type { PatternSource } from "@/patterns/types";

/** Fonte de upload: o usuário fornece a própria imagem como feed. */
export interface UploadPatternSource extends PatternSource {
  /** Define a imagem do usuário (a próxima `getTexture` a carrega). */
  setImage(file: File): void;
  /** true depois que uma imagem foi escolhida. */
  readonly hasImage: boolean;
}

/**
 * Fonte cujo feed é uma imagem enviada pelo usuário. Usa object URLs e os
 * revoga ao trocar/descartar para não vazar memória.
 */
export function createUploadSource(): UploadPatternSource {
  let objectUrl: string | null = null;
  let texture: THREE.Texture | null = null;

  return {
    id: "upload-user",
    label: "Sua imagem",
    kind: "upload",
    get hasImage() {
      return objectUrl !== null;
    },
    setImage(file: File) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(file);
    },
    getTexture() {
      if (!objectUrl) {
        return Promise.reject(new Error("Nenhuma imagem enviada"));
      }
      const url = objectUrl;
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
          (err) => reject(err instanceof Error ? err : new Error("Falha ao carregar a imagem")),
        );
      });
    },
    dispose() {
      texture?.dispose();
      texture = null;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    },
  };
}
