// Cel / ink-wash shading. One custom ShaderMaterial family shared by the whole world:
// banded light with ragged (brush-edge) terminators, two light zones (street / shop interior),
// warm window spill onto the snowy pavement, and height + distance fog.
import * as THREE from 'three';

export const NL = 12;

// The storefront opening in world space (see world/store.js). Light spills out through it.
export const WINDOW = { x0: -2.7, x1: 0.5, y: 1.5 };

export const shared = {
  uTime: { value: 0 },
  uLightPos: { value: Array.from({ length: NL }, () => new THREE.Vector4(0, -100, 0, 0)) }, // w: 0 street, 1 interior
  uLightCol: { value: Array.from({ length: NL }, () => new THREE.Vector4(0, 0, 0, 1)) },    // rgb * intensity, a: range
  uAmbExt: { value: new THREE.Color('#33476a') },
  uAmbInt: { value: new THREE.Color('#2c2118') },
  uSpill: { value: new THREE.Color('#D79A57') },   // window glow colour * store level
  uFogCol: { value: new THREE.Color('#1b2a3d') },
  uFogDen: { value: new THREE.Vector2(0.03, 0.006) }, // street, interior
};

const VERT = /* glsl */ `
uniform float uTime;
uniform float uSway;
uniform float uSwayPhase;
uniform vec4 uUv; // scale.xy, offset.xy
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
void main() {
  vUv = uv * uUv.xy + uUv.zw;
  vec3 p = position;
  #ifdef SWAY
    // cloth hanging from its top edge: free end moves most
    float k = 1.0 - uv.y; k = k * k;
    float w = sin(uTime * 1.15 + position.x * 2.6 + uSwayPhase) * 0.6
            + sin(uTime * 0.63 + position.y * 2.1 + uSwayPhase * 1.7) * 0.4;
    p += normal * w * uSway * k;
    p.x += sin(uTime * 0.8 + uSwayPhase) * uSway * 0.35 * k;
  #endif
  mat4 mm = modelMatrix;
  #ifdef USE_INSTANCING
    mm = modelMatrix * instanceMatrix;
  #endif
  vec4 wp = mm * vec4(p, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(mm) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform vec3 uColor;
uniform vec3 uEmissive;
uniform float uGlow;      // emissive taken from the map itself
uniform float uAlphaTest;
uniform float uOpacity;
uniform float uWrap;      // 0 = hard lambert, 1 = half lambert
uniform float uSnow;      // 1 = snow: cool shadows, sparkle
uniform float uTime;
uniform vec4 uLightPos[${NL}];
uniform vec4 uLightCol[${NL}];
uniform vec3 uAmbExt, uAmbInt, uSpill, uFogCol;
uniform vec2 uFogDen;
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;

float h31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float band(float v, float j) {
  // three ink-wash steps; j makes the edge of each step ragged like a loaded brush
  float a = smoothstep(0.10 + j, 0.135 + j, v);
  float b = smoothstep(0.34 + j, 0.385 + j, v);
  float c = smoothstep(0.68 + j, 0.74 + j, v);
  return a * 0.30 + b * 0.36 + c * 0.34;
}

void main() {
  vec4 tex = texture2D(uMap, vUv);
  float alpha = tex.a * uOpacity;
  if (alpha < uAlphaTest) discard;
  vec3 albedo = tex.rgb * uColor;

  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  float interior = step(vW.z, 0.06) * step(-6.6, vW.z) * step(abs(vW.x + 0.2), 3.45) * step(vW.y, 3.25);
  float jitter = (vnoise(vW * 5.5) - 0.5) * 0.09 + (vnoise(vW * 23.0) - 0.5) * 0.035;

  vec3 light = vec3(0.0);
  for (int i = 0; i < ${NL}; i++) {
    vec4 lp = uLightPos[i];
    vec4 lc = uLightCol[i];
    float zone = 1.0 - abs(lp.w - interior);
    vec3 L = lp.xyz - vW;
    float d = length(L);
    L /= max(d, 1e-4);
    float att = clamp(1.0 - d / lc.a, 0.0, 1.0);
    att *= att;
    float ndl = dot(N, L);
    ndl = mix(max(ndl, 0.0), ndl * 0.5 + 0.5, uWrap);
    light += lc.rgb * band(ndl * att, jitter) * zone;
  }

  // light falling out of the shop window onto the street
  float sx = 1.0 - smoothstep(0.0, 2.2, max(max(${WINDOW.x0.toFixed(2)} - vW.x, vW.x - ${WINDOW.x1.toFixed(2)}), 0.0));
  float sz = 1.0 - smoothstep(0.2, 6.5, vW.z);
  vec3 wp = vec3(clamp(vW.x, ${WINDOW.x0.toFixed(2)}, ${WINDOW.x1.toFixed(2)}), ${WINDOW.y.toFixed(2)}, -0.2);
  vec3 WL = wp - vW; float wd = length(WL); WL /= max(wd, 1e-4);
  float wndl = mix(max(dot(N, WL), 0.0), dot(N, WL) * 0.5 + 0.5, 0.6);
  float spill = sx * sz * wndl / (1.0 + wd * wd * 0.10);
  light += uSpill * band(spill * 1.25, jitter) * (1.0 - interior) * step(0.06, vW.z);

  vec3 amb = mix(uAmbExt, uAmbInt, interior);
  // sky light from above outside, a little bounce inside
  amb *= mix(0.72 + 0.38 * N.y, 0.85 + 0.15 * N.y, interior);
  vec3 col = albedo * (amb + light);

  if (uSnow > 0.5) {
    float sp = step(0.992, h31(floor(vW * 140.0)));
    col += sp * (light + amb) * 0.5;
  }

  col += uEmissive + tex.rgb * uGlow;

  // fog: thick, low and cold in the street; a faint warm haze inside
  float dist = length(cameraPosition - vW);
  float camIn = step(cameraPosition.z, 0.06);
  // looking into the shop from the street: only the stretch of the ray outside the glass is in the cold air
  if (camIn < 0.5 && interior > 0.5) dist *= clamp(cameraPosition.z / max(cameraPosition.z - vW.z, 1e-3), 0.0, 1.0);
  float den = mix(uFogDen.x, uFogDen.y, interior * camIn);
  float hgt = mix(exp(-max(vW.y, 0.0) * 0.10) * 0.55 + 0.45, 1.0, interior);
  float swirl = 0.82 + 0.36 * vnoise(vec3(vW.x * 0.22 + uTime * 0.05, vW.y * 0.3, vW.z * 0.22));
  float fog = 1.0 - exp(-dist * den * hgt * mix(swirl, 1.0, interior));
  vec3 fogCol = mix(uFogCol + uSpill * 0.16 * sx * sz, uAmbInt * 1.6, interior * camIn);
  col = mix(col, fogCol, clamp(fog, 0.0, 1.0));

  gl_FragColor = vec4(col, alpha);
}`;

const WHITE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
WHITE.needsUpdate = true;

export function toon({
  map = null, color = '#ffffff', emissive = '#000000', glow = 0, alphaTest = 0, opacity = 1,
  wrap = 0.5, snow = false, sway = 0, swayPhase = 0, transparent = false, side = THREE.FrontSide,
  uv = [1, 1, 0, 0], depthWrite = true,
} = {}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      ...shared,
      uMap: { value: map || WHITE },
      uColor: { value: new THREE.Color(color) },
      uEmissive: { value: new THREE.Color(emissive) },
      uGlow: { value: glow },
      uAlphaTest: { value: alphaTest },
      uOpacity: { value: opacity },
      uWrap: { value: wrap },
      uSnow: { value: snow ? 1 : 0 },
      uSway: { value: sway },
      uSwayPhase: { value: swayPhase },
      uUv: { value: new THREE.Vector4(...uv) },
    },
    defines: sway > 0 ? { SWAY: 1 } : {},
    transparent, side, depthWrite,
  });
  return m;
}

// Unlit, un-fogged colour for bulbs and glow cards (values > 1 feed the bloom).
export function glowMat(color, intensity = 1, { map = null, additive = true, opacity = 1 } = {}) {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  const m = new THREE.MeshBasicMaterial({ color: c, map, transparent: true, opacity, depthWrite: false, toneMapped: false });
  if (additive) m.blending = THREE.AdditiveBlending;
  m.userData.base = c.clone();
  return m;
}
