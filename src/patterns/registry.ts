import { createProceduralSource } from "@/patterns/procedural/proceduralSource";
import { grid, rings, spiral } from "@/patterns/procedural/patterns";
import { createStaticSource } from "@/patterns/static/staticSource";
import { createUploadSource } from "@/patterns/upload/uploadSource";
import type { PatternSource } from "@/patterns/types";

/**
 * Lista canônica de fontes de imagem disponíveis. A UI (PatternPicker) e o
 * controlador de padrões leem daqui — adicionar uma fonte é uma linha.
 */
export function createPatternRegistry(): PatternSource[] {
  return [
    createProceduralSource("procedural-spiral", "Espiral", spiral),
    createProceduralSource("procedural-grid", "Grade", grid),
    createProceduralSource("procedural-rings", "Anéis", rings),
    createStaticSource("static-mandala", "Mandala", "/patterns/mandala.svg"),
    createUploadSource(),
  ];
}
