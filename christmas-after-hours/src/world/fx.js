// Effects that live in the world: falling snow, the poster's cigarette smoke (a separate layer
// that never touches the drawing), and the vinyl record shader.
import * as THREE from 'three';
import { rng } from '../core/util.js';
import { WINDOW } from '../core/toon.js';

// ---------------------------------------------------------------- snow
export function buildSnow(ctx, count = 9000) {
  const { scene, world } = ctx;
  const r = rng(2412);
  const BOX = { x: 34, y: 11, z: 9.6, z0: 0.3 };
  const pos = new Float32Array(count * 3), seed = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (r() - 0.5) * BOX.x; pos[i * 3 + 1] = r() * BOX.y; pos[i * 3 + 2] = BOX.z0 + r() * BOX.z;
    seed[i * 3] = r(); seed[i * 3 + 1] = 0.75 + r() * 0.9; seed[i * 3 + 2] = 0.6 + r() * r() * 1.8; // phase, fall speed, size
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 5, 5), 60);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: world.uTime, uPx: { value: 720 }, uAmount: { value: 1 }, uSpill: world.uSpill, uLamp: { value: [new THREE.Vector3(-6.2, 3.9, 1.85), new THREE.Vector3(2.0, 3.9, 8.35)] } },
    vertexShader: /* glsl */ `
      attribute vec3 aSeed; uniform float uTime, uPx, uAmount; uniform vec3 uSpill; uniform vec3 uLamp[2];
      varying float vA; varying vec3 vCol;
      void main() {
        vec3 p = position;
        float ph = aSeed.x * 6.2831;
        p.y = mod(position.y - uTime * aSeed.y * 0.85, ${BOX.y.toFixed(1)});
        p.x += sin(uTime * 0.55 * aSeed.y + ph) * 0.32 + uTime * 0.28;          // a light wind down the lane
        p.x = mod(p.x + ${(BOX.x / 2).toFixed(1)}, ${BOX.x.toFixed(1)}) - ${(BOX.x / 2).toFixed(1)};
        p.z += cos(uTime * 0.4 * aSeed.y + ph * 1.7) * 0.25;
        p.z = max(p.z, 0.22);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        gl_PointSize = clamp(aSeed.z * 0.026 * uPx / max(d, 0.2), 1.0, uPx * 0.03);
        // lit by whatever is near: lamp heads and the shop window
        vec3 col = vec3(0.34, 0.42, 0.54);
        for (int i = 0; i < 2; i++) { float ld = length(uLamp[i] - p); col += vec3(1.0, 0.72, 0.42) * 2.0 / (1.0 + ld * ld * 0.7); }
        float sx = 1.0 - smoothstep(0.0, 2.5, max(max(${WINDOW.x0.toFixed(1)} - p.x, p.x - ${WINDOW.x1.toFixed(1)}), 0.0));
        float sz = 1.0 - smoothstep(0.2, 5.5, p.z);
        col += uSpill * sx * sz * (1.0 - smoothstep(0.5, 4.0, p.y)) * 0.55;
        vCol = col;
        float fog = exp(-d * 0.045);
        float nearFade = smoothstep(0.25, 0.9, d);
        vA = fog * nearFade * step(aSeed.x, uAmount) * (0.55 + 0.45 * aSeed.z / 2.4);
        // big close flakes go soft, like out-of-focus dots
        vA *= mix(1.0, 0.3, smoothstep(uPx * 0.01, uPx * 0.03, gl_PointSize));
      }`,
    fragmentShader: /* glsl */ `
      varying float vA; varying vec3 vCol;
      void main() {
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        float a = smoothstep(0.5, 0.12, d) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vCol, a);
      }`,
  });
  const pts = new THREE.Points(geo, mat); pts.renderOrder = 4; pts.frustumCulled = false;
  scene.add(pts);
  world.snow = mat;
  return pts;
}

// ---------------------------------------------------------------- cigarette smoke (own layer)
export function buildSmoke(ctx) {
  const { scene, world } = ctx;
  const a = world.anchors.poster;
  const W = 0.5, H = 0.86;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: world.uTime, uLevel: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `
      precision highp float; varying vec2 vUv; uniform float uTime, uLevel;
      float h21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 3.7) * 0.3 + vn(p * 4.3 + 9.1) * 0.15; }
      // one ribbon of smoke: a centre line that wanders more the higher it gets
      float strand(vec2 uv, float seed, float rise, float thick) {
        float y = uv.y;
        float t = uTime * rise;
        float cx = (fbm(vec2(y * 2.3 - t, seed)) - 0.5) * 0.55 * pow(y, 1.15)
                 + sin(y * 11.0 - t * 3.1 + seed) * 0.016 * smoothstep(0.05, 0.5, y)
                 + 0.05 * y;                                   // the room's slight draught
        float w = mix(0.0035, 0.06, pow(y, 1.5)) * thick;
        float d = abs(uv.x - cx);
        float body = smoothstep(w, w * 0.15, d);
        // the ribbon is brighter at its edges where it curls over
        float curl = smoothstep(w, w * 0.55, d) * (1.0 - smoothstep(w * 0.55, 0.0, d) * 0.55);
        float tex = 0.45 + 0.55 * fbm(vec2(uv.x * 9.0 + seed, y * 6.0 - t * 1.6));
        return mix(body, curl, smoothstep(0.1, 0.5, y)) * tex;
      }
      void main() {
        vec2 uv = vec2(vUv.x - 0.5, vUv.y);
        float a = strand(uv, 1.7, 0.21, 1.0) * 0.8 + strand(uv, 6.3, 0.17, 0.7) * 0.5;
        a *= smoothstep(0.0, 0.025, uv.y) * (1.0 - smoothstep(0.42, 1.0, uv.y));
        a *= 1.0 - smoothstep(0.34, 0.5, abs(uv.x));
        gl_FragColor = vec4(vec3(0.95, 0.90, 0.80) * (0.2 + 0.8 * uLevel), clamp(a, 0.0, 1.0) * 0.72);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
  m.position.set(a.tip.x, a.tip.y + H / 2, a.tip.z);
  m.renderOrder = 6;
  scene.add(m);
  world.smoke = mat;
  return m;
}

// ---------------------------------------------------------------- vinyl
export function makeRecordMaterial(label, world) {
  return new THREE.ShaderMaterial({
    uniforms: { uLabel: { value: label }, uAngle: { value: 0 }, uLevel: world.uStore, uFogCol: { value: new THREE.Color('#2a1c12') } },
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */ `
      precision highp float; varying vec2 vUv; varying vec3 vW;
      uniform sampler2D uLabel; uniform float uAngle, uLevel;
      float h21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      void main() {
        vec2 c = (vUv - 0.5) * 2.0;
        float r = length(c);
        if (r > 1.0) discard;
        float ca = cos(uAngle), sa = sin(uAngle);
        vec2 cr = vec2(c.x * ca - c.y * sa, c.x * sa + c.y * ca);       // disc space (spins)
        vec3 col;
        if (r < 0.335) {
          col = texture2D(uLabel, cr / 0.335 * 0.5 + 0.5).rgb * (0.35 + 0.75 * uLevel);
          if (r < 0.024) col = vec3(0.015);
        } else {
          // grooves: fine rings, with the silent bands between tracks and the run-out
          float g = sin(r * 1500.0 + sin(atan(cr.y, cr.x) * 1.0) * 1.5);
          float fw = fwidth(r * 1500.0);
          float groove = mix(0.5, g * 0.5 + 0.5, clamp(1.0 - fw / 2.6, 0.0, 1.0));
          float band = smoothstep(0.004, 0.0, abs(r - 0.52)) + smoothstep(0.004, 0.0, abs(r - 0.69)) + smoothstep(0.004, 0.0, abs(r - 0.84)) + step(r, 0.42) * step(0.345, r);
          band = clamp(band, 0.0, 1.0);
          // anisotropic sheen: two fixed wedges of light the grooves turn through
          float th = atan(c.y, c.x);
          float wob = 0.05 * sin(uAngle + r * 5.0);                       // the warp makes the wedge breathe
          float s1 = pow(abs(cos(th - 0.55 + wob)), 46.0);
          float s2 = pow(abs(cos(th + 1.25 - wob)), 90.0) * 0.45;
          float sheen = (s1 + s2) * (0.35 + 0.65 * groove) * mix(1.0, 0.25, band);
          col = vec3(0.012, 0.012, 0.014) + vec3(0.03) * groove * (1.0 - band);
          col += vec3(1.0, 0.78, 0.5) * sheen * 0.85 * uLevel + vec3(0.25, 0.32, 0.42) * sheen * 0.08;
          // dust that rides round with the disc
          vec2 pc = vec2(atan(cr.y, cr.x) * 40.0, r * 160.0);
          float dust = step(0.985, h21(floor(pc)));
          col += vec3(0.5, 0.42, 0.3) * dust * 0.35 * uLevel;
          col += vec3(0.25, 0.2, 0.14) * smoothstep(0.975, 1.0, r) * uLevel;   // rolled edge
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
    extensions: { derivatives: true },
  });
}
