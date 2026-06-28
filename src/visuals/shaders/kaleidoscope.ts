/**
 * Shaders do caleidoscópio (GLSL ES 1.00, compatível com THREE.ShaderMaterial).
 * Mantidos como strings TS para não exigir loader de .glsl no Turbopack.
 *
 * A matemática roda 100% na GPU: dobra polar do plano em `uSegments` fatias
 * espelhadas, com rotação, zoom, domain-warp, paleta cosseno e strobo — todos
 * modulados pelas bandas de áudio.
 */

export const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform sampler2D uTexture;
uniform float uSegments;
uniform float uRotation;
uniform float uZoom;
uniform float uWarp;
uniform float uPaletteId;
uniform float uPaletteInvert;
uniform float uStrobe;
uniform float uBeat;
uniform float uLevel;
uniform vec4  uBands;     // x=sub y=low z=mid w=high
uniform float uReactivity;
uniform float uBeatPulse; // M10: pulso por beat (grade), decai entre beats
uniform float uDownbeat;  // M10: pulso só no downbeat 4/4 — respiro principal

const float TAU = 6.28318530718;

vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(TAU * (c * t + d));
}

vec3 palette(float t, float id) {
  if (id < 0.5)
    return cosPalette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.00, 0.33, 0.67)); // neon rainbow
  if (id < 1.5)
    return cosPalette(t, vec3(0.55, 0.40, 0.30), vec3(0.45, 0.30, 0.20), vec3(1.0), vec3(0.0, 0.15, 0.30)); // warm amber
  if (id < 2.5)
    return cosPalette(t, vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 0.5), vec3(0.80, 0.90, 0.30)); // psy magenta/green
  return cosPalette(t, vec3(0.5), vec3(0.5), vec3(2.0, 1.0, 0.0), vec3(0.50, 0.20, 0.25));   // electric
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);

  float r = length(uv);
  float a = atan(uv.y, uv.x) + uRotation;

  float seg = TAU / max(uSegments, 2.0);
  a = mod(a, seg);
  a = abs(a - 0.5 * seg); // espelha dentro da fatia

  // zoom com pulso reativo ao kick (uBeat) e ao sub-grave (uBands.x)
  float z = uZoom * (1.0 + uReactivity * (uBeat * 0.18 + uBands.x * 0.12));
  // M10 — respiro de escala travado no grid: punch no downbeat, toque por beat.
  z *= 1.0 + uDownbeat * 0.12 + uBeatPulse * 0.03;
  vec2 p = vec2(cos(a), sin(a)) * r / max(z, 0.05);

  // domain warp guiado pelos médios
  float warpAmt = uWarp * (0.1 + uBands.z * 0.4);
  p += warpAmt * vec2(sin(p.y * 8.0 + uTime), cos(p.x * 8.0 + uTime * 0.7));

  vec3 feed = texture2D(uTexture, fract(p * 0.5 + 0.5)).rgb;

  float lum = dot(feed, vec3(0.299, 0.587, 0.114));
  vec3 col = palette(lum + uTime * 0.05 + uBands.w * 0.25, uPaletteId);

  if (uPaletteInvert > 0.5) col = vec3(1.0) - col;

  // strobo guiado pela energia de sub-grave
  float gate = step(0.5, fract(uTime * 12.0));
  float strobe = mix(1.0, gate * (0.3 + 0.7 * uBands.x), uStrobe);
  col *= strobe;

  // brilho reativo ao nível geral
  col *= 0.75 + 0.6 * uLevel * uReactivity;

  // Pulso concêntrico travado no beat grid. Um anel claro nasce no centro
  // e respira para fora no downbeat (forte) com um realce sutil em cada beat.
  // Amplitude constante (não escala com uReactivity): some quando há muito
  // movimento e se destaca quando o visual está calmo.
  float ring = 0.5 + 0.5 * cos(r * 16.0 - uTime * 3.0);
  col *= 1.0 + uDownbeat * (0.30 + 0.25 * ring) + uBeatPulse * 0.06;

  gl_FragColor = vec4(col, 1.0);
}
`;
