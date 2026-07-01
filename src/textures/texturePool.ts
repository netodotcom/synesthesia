import * as THREE from "three";

/**
 * Cache imperativo de `THREE.Texture` keyed por id de PoolImage. Carrega sob
 * demanda (CORS anônimo para não "tingir" — imagens Unsplash e uploads viram
 * texturas GPU válidas) e é rigoroso com o ciclo de vida: `release`/`dispose`
 * liberam a GPU e evitam vazamento em uploads/trocas repetidas.
 */
export interface TexturePool {
  /** Carrega (ou devolve do cache) a textura de `src` sob a chave `id`. */
  load(id: string, src: string): Promise<THREE.Texture>;
  get(id: string): THREE.Texture | undefined;
  has(id: string): boolean;
  /** Libera a textura de `id` (dispose GPU) e a remove do cache. */
  release(id: string): void;
  /** Libera todas as texturas retidas. */
  dispose(): void;
}

export function createTexturePool(): TexturePool {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const cache = new Map<string, THREE.Texture>();
  const inflight = new Map<string, Promise<THREE.Texture>>();
  const releasedWhileLoading = new Set<string>();

  return {
    load(id, src) {
      const cached = cache.get(id);
      if (cached) return Promise.resolve(cached);
      const pending = inflight.get(id);
      if (pending) return pending;

      releasedWhileLoading.delete(id);
      const promise = new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
          src,
          (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearFilter; // sem mipmaps (evita reupload/custo)
            tex.generateMipmaps = false;
            inflight.delete(id);
            // release() chamado enquanto carregava → descarta na hora (não vaza).
            if (releasedWhileLoading.delete(id)) {
              tex.dispose();
            } else {
              cache.set(id, tex);
            }
            resolve(tex);
          },
          undefined,
          (err) => {
            inflight.delete(id);
            releasedWhileLoading.delete(id);
            reject(err instanceof Error ? err : new Error(`Falha ao carregar textura ${src}`));
          },
        );
      });
      inflight.set(id, promise);
      return promise;
    },
    get(id) {
      return cache.get(id);
    },
    has(id) {
      return cache.has(id);
    },
    release(id) {
      const tex = cache.get(id);
      if (tex) {
        tex.dispose();
        cache.delete(id);
      }
      // Se ainda está carregando, marca para descartar ao resolver.
      if (inflight.has(id)) releasedWhileLoading.add(id);
    },
    dispose() {
      for (const tex of cache.values()) tex.dispose();
      cache.clear();
      inflight.clear();
      releasedWhileLoading.clear();
    },
  };
}
