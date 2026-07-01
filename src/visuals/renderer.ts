import * as THREE from "three";
import { fragmentShader, vertexShader, MAX_LAYERS } from "@/visuals/shaders/pipeline";
import { createUniforms, type PipelineUniforms } from "@/visuals/uniforms";

export interface PipelineRenderer {
  readonly uniforms: PipelineUniforms;
  /** Define a janela de camadas ativas (texturas do pool selecionado). */
  setLayers: (textures: THREE.Texture[]) => void;
  /** Renderiza um frame (single-pass, manipulação de pixels 2D na GPU). */
  render: () => void;
  /** Recalcula tamanho/resolução/aspecto a partir do elemento de montagem. */
  resize: () => void;
  /** Libera geometria, material, textura de fallback e o contexto WebGL. */
  dispose: () => void;
  readonly renderer: THREE.WebGLRenderer;
}

/** Textura 1×1 neutra que preenche os slots ociosos do array de samplers. */
function createFallbackTexture(): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint8Array([12, 12, 14, 255]), 1, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

/**
 * three.js engole a causa real num "Error creating WebGL context" genérico. Esta
 * sonda recria uma tentativa de contexto só para capturar o `statusMessage` que o
 * navegador emite no evento `webglcontextcreationerror`. Retorna null no sucesso.
 */
export function diagnoseWebGL(): string | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  let reason: string | null = null;
  canvas.addEventListener("webglcontextcreationerror", (e) => {
    reason = (e as WebGLContextEvent).statusMessage || null;
  });
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  if (gl) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  return reason ?? "motivo não informado pelo navegador";
}

/**
 * Renderer three.js: um quad fullscreen com o ShaderMaterial do pipeline de
 * textura. Single-pass — a mesclagem e os filtros geométricos vivem no fragment
 * shader. As texturas das camadas pertencem ao TexturePool; aqui só as apontamos.
 */
export function createRenderer(mount: HTMLElement): PipelineRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  mount.appendChild(renderer.domElement);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);

  const scene = new THREE.Scene();
  const uniforms = createUniforms();

  const fallback = createFallbackTexture();
  uniforms.uLayers.value = new Array(MAX_LAYERS).fill(fallback);
  uniforms.uLayerCount.value = 0;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
  });
  scene.add(new THREE.Mesh(geometry, material));

  function resize() {
    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    const dpr = renderer.getPixelRatio();
    const bw = Math.max(1, Math.floor(w * dpr));
    const bh = Math.max(1, Math.floor(h * dpr));
    uniforms.uResolution.value.set(bw, bh);
    uniforms.uAspect.value = bw / bh;
  }
  resize();

  return {
    uniforms,
    setLayers(textures) {
      const count = Math.min(textures.length, MAX_LAYERS);
      const arr = uniforms.uLayers.value;
      for (let i = 0; i < MAX_LAYERS; i++) arr[i] = i < count ? textures[i] : fallback;
      uniforms.uLayerCount.value = count;
    },
    render() {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
    resize,
    dispose() {
      geometry.dispose();
      material.dispose();
      fallback.dispose();
      // As texturas das camadas são do TexturePool — não as liberamos aqui.
      renderer.dispose();
      // forceContextLoss libera o contexto WebGL; sem isto cada mount/unmount
      // (StrictMode, HMR) vaza um contexto até o navegador recusar novos.
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
    renderer,
  };
}
