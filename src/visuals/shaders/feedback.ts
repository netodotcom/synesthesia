/**
 * Shaders dos passes de feedback (trails). Reutilizam o `vertexShader` do
 * caleidoscópio para o quad fullscreen.
 */

/** Combina o frame atual com o acúmulo anterior decaído por `uTrails`. */
export const compositeFragment = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uCurrent;
uniform sampler2D uPrev;
uniform float uTrails;

void main() {
  vec3 cur = texture2D(uCurrent, vUv).rgb;
  vec3 prev = texture2D(uPrev, vUv).rgb;
  gl_FragColor = vec4(max(cur, prev * uTrails), 1.0);
}
`;

/** Copia uma textura para o alvo atual (blit do acúmulo para a tela). */
export const copyFragment = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uTexture;

void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}
`;
