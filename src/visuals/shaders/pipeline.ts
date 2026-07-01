/**
 * Shader do pipeline de textura (GLSL ES 1.00, compatível com ShaderMaterial).
 * Todo o trabalho é manipulação de pixels 2D na GPU — sem geometria 3D:
 *
 *   1. Filtro geométrico (grade / espiral / anéis) distorce as UV de amostragem.
 *   2. Mesclagem das camadas ativas nessas UV (difference / exclusion / screen /
 *      add) ou deslocamento (displacement: a luma das camadas superiores empurra
 *      as UV da camada base, gerando textura "derretida").
 *   3. Brilho reativo ao áudio (nível + kick).
 *
 * `uLayers` é um array de samplers (janela ativa do pool). Índices constantes por
 * loop mantêm compatibilidade com WebGL1/2.
 */

export const MAX_LAYERS = 8;

/**
 * Acesso a array de samplers exige índice CONSTANTE em GLSL ES 1.00 (um contador
 * de loop não conta). Geramos a cadeia if/else desenrolada a partir de MAX_LAYERS
 * para manter shader e constante em sincronia.
 */
const sampleLayerBody = Array.from(
  { length: MAX_LAYERS },
  (_, i) => `${i === 0 ? "  if" : "  else if"} (idx == ${i}) c = texture2D(uLayers[${i}], uv);`,
).join("\n");

export const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;
varying vec2 vUv;

#define MAX_LAYERS ${MAX_LAYERS}

uniform float uTime;
uniform vec2  uResolution;
uniform float uAspect;
uniform sampler2D uLayers[MAX_LAYERS];
uniform int   uLayerCount;

// mesclagem
uniform int   uBlendMode;      // 0 diff, 1 excl, 2 screen, 3 add, 4 displacement
uniform float uDisplaceAmount;

// filtro geométrico
uniform int   uPattern;        // 0 none, 1 grid, 2 spiral, 3 rings
uniform float uGridCount;
uniform float uGridGap;
uniform float uGridAltRot;
uniform float uSpiralTightness;
uniform float uSpiralSpeed;
uniform float uSpiralZoom;
uniform float uRingCount;
uniform float uRingRadialScale;
uniform float uTunnelSpeed;

// áudio
uniform float uLevel;
uniform float uBeat;
uniform vec4  uBands;   // x=sub y=low z=mid w=high
uniform float uReactivity;

// pós / artefatos
uniform float uBrightness;   // multiplicador final da cor
uniform float uGlitchAmount; // intensidade base do tearing (0..1)
uniform float uBeatWarp;     // beatEnergy no modo "warp" (0 = corte seco)

const float TAU = 6.28318530718;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

/** Hash determinístico 1D (sem estado externo). Mesma entrada ⇒ mesma saída. */
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

vec4 sampleLayer(int idx, vec2 uv) {
  vec4 c = vec4(0.0);
${sampleLayerBody}
  return c;
}

vec3 blendPair(vec3 b, vec3 s, int m) {
  if (m == 0) return abs(b - s);                 // difference
  if (m == 1) return b + s - 2.0 * b * s;        // exclusion
  if (m == 2) return 1.0 - (1.0 - b) * (1.0 - s);// screen
  if (m == 3) return min(b + s, vec3(1.0));      // add
  return s;
}

/** Retorna vec3(uv.xy amostragem, mask). mask<1 escurece (gap da grade). */
vec3 applyPattern(vec2 uv) {
  if (uPattern == 1) {
    // Grade / matriz — ladrilhos com rotação alternada e gap.
    vec2 g = uv * uGridCount;
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float ang = mod(cell.x + cell.y, 2.0) > 0.5 ? uGridAltRot : 0.0;
    f = rot2(ang) * (f - 0.5) + 0.5;
    float hg = uGridGap * 0.5;
    vec2 edge = step(vec2(hg), f) * step(vec2(hg), 1.0 - f);
    return vec3(fract(f), edge.x * edge.y);
  }
  if (uPattern == 2) {
    // Espiral logarítmica/arquimediana — swirl das UV.
    vec2 c = uv - 0.5; c.x *= uAspect;
    float r = length(c);
    float a = atan(c.y, c.x) + uSpiralTightness * r + uTime * uSpiralSpeed;
    r /= max(uSpiralZoom, 0.05);
    vec2 s = vec2(cos(a), sin(a)) * r; s.x /= uAspect; s += 0.5;
    return vec3(fract(s), 1.0);
  }
  if (uPattern == 3) {
    // Anéis concêntricos / túnel infinito.
    vec2 c = uv - 0.5; c.x *= uAspect;
    float r = length(c);
    float a = atan(c.y, c.x);
    float depth = fract(r * uRingCount - uTime * uTunnelSpeed);
    float ang = a / TAU + 0.5;
    return vec3(fract(vec2(ang * uRingRadialScale, depth)), 1.0);
  }
  return vec3(uv, 1.0);
}

vec3 composite(vec2 uv) {
  if (uLayerCount <= 0) return vec3(0.05);

  if (uBlendMode == 4) {
    // Displacement: luma das camadas superiores empurra a UV da camada base.
    vec2 duv = uv;
    for (int i = 1; i < MAX_LAYERS; i++) {
      if (i >= uLayerCount) break;
      float l = luma(sampleLayer(i, uv).rgb);
      duv += (l - 0.5) * uDisplaceAmount * 0.5;
    }
    return sampleLayer(0, fract(duv)).rgb;
  }

  vec3 acc = sampleLayer(0, uv).rgb;
  for (int i = 1; i < MAX_LAYERS; i++) {
    if (i >= uLayerCount) break;
    acc = blendPair(acc, sampleLayer(i, uv).rgb, uBlendMode);
  }
  return acc;
}

void main() {
  vec2 uv = vUv;

  // Beat-warp: no modo "warp" a beatEnergy empurra a UV num pulso radial que
  // decai sozinho — a troca de camadas vira uma distorção viva, não um corte.
  if (uBeatWarp > 0.001) {
    vec2 c = uv - 0.5;
    float r = length(c);
    uv += normalize(c + 1e-5) * sin(r * 22.0 - uTime * 6.0) * uBeatWarp * 0.06;
  }

  // Glitch/tearing físico: quando o agudo (uBands.w) estoura, faixas horizontais
  // deslocam a coordenada de amostragem em X via passo pseudo-aleatório semeado
  // por uTime + a linha — os pixels rasgam em sincronia com os transientes.
  float glitch = smoothstep(0.55, 1.0, uBands.w) * uGlitchAmount;
  if (glitch > 0.001) {
    float row = floor(uv.y * 48.0);
    float rnd = hash11(row + floor(uTime * 24.0));
    float tear = step(0.7, rnd) * glitch;            // só algumas faixas rasgam
    uv.x = fract(uv.x + (rnd - 0.5) * tear * 0.35);
  }

  vec3 pat = applyPattern(uv);
  vec3 col = composite(pat.xy) * pat.z;

  // Brilho reativo ao áudio — respira com o nível e pulsa no kick.
  float react = uReactivity;
  col *= 0.82 + 0.5 * uLevel * react + uBeat * 0.28 * react;
  col *= uBrightness;

  gl_FragColor = vec4(col, 1.0);
}
`;
