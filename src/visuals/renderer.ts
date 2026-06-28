import * as THREE from "three";
import { fragmentShader, vertexShader } from "@/visuals/shaders/kaleidoscope";
import { compositeFragment, copyFragment } from "@/visuals/shaders/feedback";
import { createUniforms, type KaleidoUniforms } from "@/visuals/uniforms";

export interface KaleidoRenderer {
  readonly uniforms: KaleidoUniforms;
  /** Define a textura-feed do caleidoscópio (fontes de padrão em M3). */
  setTexture: (texture: THREE.Texture) => void;
  /** Renderiza um frame (single-pass, ou com feedback se uTrails > 0). */
  render: () => void;
  /** Recalcula tamanho/resolução a partir do elemento de montagem. */
  resize: () => void;
  /** Libera geometria, materiais, texturas, render targets e o contexto WebGL. */
  dispose: () => void;
  readonly renderer: THREE.WebGLRenderer;
}

/** Textura procedural de fallback para ver algo antes das fontes reais (M3). */
function createPlaceholderTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;
      data[i] = Math.floor(128 + 127 * Math.sin(u * 12.0));
      data[i + 1] = Math.floor(128 + 127 * Math.sin(v * 12.0 + 2.0));
      data[i + 2] = Math.floor(128 + 127 * Math.sin((u + v) * 8.0 + 4.0));
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

const makeTarget = () =>
  new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, stencilBuffer: false });

/**
 * three.js engole a causa real num "Error creating WebGL context" genérico.
 * Esta sonda recria uma tentativa de contexto só para capturar o `statusMessage`
 * que o navegador emite no evento `webglcontextcreationerror` — ex.:
 * "Too many active WebGL contexts" (exaustão) ou "WebGL is disabled" (extensão/flag).
 * Retorna null quando o contexto é criado com sucesso (libera-o em seguida).
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
    // Sucesso agora — libera na hora para não vazar mais um contexto.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  return reason ?? "motivo não informado pelo navegador";
}

/**
 * Renderer three.js com um quad fullscreen e o ShaderMaterial do caleidoscópio.
 * Caminho padrão (trails = 0): render direto à tela — idêntico ao verificado.
 * Caminho de feedback (trails > 0): ping-pong de render targets para persistência.
 */
export function createRenderer(mount: HTMLElement): KaleidoRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  mount.appendChild(renderer.domElement);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);

  // --- Cena do caleidoscópio -------------------------------------------------
  const scene = new THREE.Scene();
  const uniforms = createUniforms();
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
  });
  scene.add(new THREE.Mesh(geometry, material));

  const placeholder = createPlaceholderTexture();
  uniforms.uTexture.value = placeholder;

  // --- Recursos de feedback (trails) ----------------------------------------
  let frameRT = makeTarget();
  let accumA = makeTarget();
  let accumB = makeTarget();

  const compositeUniforms = {
    uCurrent: { value: null as THREE.Texture | null },
    uPrev: { value: null as THREE.Texture | null },
    uTrails: { value: 0 },
  };
  const compositeMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: compositeFragment,
    uniforms: compositeUniforms,
  });
  const copyUniforms = { uTexture: { value: null as THREE.Texture | null } };
  const copyMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: copyFragment,
    uniforms: copyUniforms,
  });
  const fsScene = new THREE.Scene();
  const fsQuad = new THREE.Mesh(geometry, compositeMaterial);
  fsScene.add(fsQuad);

  function resize() {
    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    const dpr = renderer.getPixelRatio();
    const bw = Math.max(1, Math.floor(w * dpr));
    const bh = Math.max(1, Math.floor(h * dpr));
    uniforms.uResolution.value.set(bw, bh);
    frameRT.setSize(bw, bh);
    accumA.setSize(bw, bh);
    accumB.setSize(bw, bh);
  }
  resize();

  function render() {
    const trails = uniforms.uTrails.value;

    if (trails <= 0) {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      return;
    }

    // 1. caleidoscópio → frameRT
    renderer.setRenderTarget(frameRT);
    renderer.render(scene, camera);

    // 2. composita (atual, acúmulo anterior) → accumB
    compositeUniforms.uCurrent.value = frameRT.texture;
    compositeUniforms.uPrev.value = accumA.texture;
    compositeUniforms.uTrails.value = trails;
    fsQuad.material = compositeMaterial;
    renderer.setRenderTarget(accumB);
    renderer.render(fsScene, camera);

    // 3. copia o acúmulo para a tela
    copyUniforms.uTexture.value = accumB.texture;
    fsQuad.material = copyMaterial;
    renderer.setRenderTarget(null);
    renderer.render(fsScene, camera);

    // swap dos buffers de acúmulo
    const tmp = accumA;
    accumA = accumB;
    accumB = tmp;
  }

  return {
    uniforms,
    setTexture(texture) {
      uniforms.uTexture.value = texture;
    },
    render,
    resize,
    dispose() {
      geometry.dispose();
      material.dispose();
      compositeMaterial.dispose();
      copyMaterial.dispose();
      placeholder.dispose();
      const current = uniforms.uTexture.value;
      if (current && current !== placeholder) current.dispose();
      frameRT.dispose();
      accumA.dispose();
      accumB.dispose();
      renderer.dispose();
      // dispose() libera recursos, mas NÃO o contexto WebGL em si. Sem isto,
      // cada mount/unmount (StrictMode, HMR) vaza um contexto até o navegador
      // recusar criar novos ("Error creating WebGL context").
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
    renderer,
  };
}
