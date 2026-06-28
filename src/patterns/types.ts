import type * as THREE from "three";

/** Os três tipos de fonte de imagem que alimentam o caleidoscópio. */
export type PatternKind = "procedural" | "static" | "upload";

/** Contexto passado a cada fonte ao gerar/carregar a textura. */
export interface PatternContext {
  /** Resolução alvo da textura (px, lado do quadrado). */
  size: number;
}

/**
 * Contrato único de toda fonte de padrão. Produz uma `THREE.Texture` para o
 * shader. Adicionar uma fonte nova = implementar isto + 1 linha no registry —
 * nada na UI ou no renderer muda.
 */
export interface PatternSource {
  id: string;
  label: string;
  kind: PatternKind;
  /** Gera/carrega a textura-feed. Pode ser sync (procedural) ou async (load). */
  getTexture(ctx: PatternContext): Promise<THREE.Texture> | THREE.Texture;
  /** Libera a textura/recursos retidos. */
  dispose(): void;
}
