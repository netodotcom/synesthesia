/**
 * Item do pool de texturas: uma imagem candidata a entrar no pipeline, vinda da
 * Unsplash (hotlink) ou de um upload local (object URL). Metadados apenas — a
 * `THREE.Texture` correspondente é carregada/cacheada pelo TexturePool.
 */
export interface PoolImage {
  id: string;
  kind: "unsplash" | "upload";
  /** URL carregada como textura (Unsplash `regular`, ou object URL do upload). */
  src: string;
  /** Miniatura para a UI. */
  thumb: string;
  /** Rótulo curto (nome do arquivo ou autor) para acessibilidade/atribuição. */
  label: string;
  /** Só Unsplash: dados de atribuição (obrigatória pelas guidelines). */
  authorName?: string;
  authorLink?: string;
  photoLink?: string;
  /** Só Unsplash: endpoint de tracking disparado ao "usar" a foto (selecionar). */
  downloadLocation?: string;
}
