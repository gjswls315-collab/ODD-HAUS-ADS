// Deterministic math helpers. Every animation in the film is a pure function of
// time so any frame can be rendered in any order (scrubbing, headless capture).
import * as THREE from "three";

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const remap = (x, a, b) => clamp((x - a) / (b - a));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const smoother = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
/** 0 -> 1 -> 0 bump over [a, b]. */
export const bump = (x, a, b) => Math.sin(Math.PI * remap(x, a, b));
/** smooth window: ramps up over [a, a+r], down over [b-r, b]. */
export const window01 = (x, a, b, r = 0.25) => smooth(remap(x, a, a + r)) * (1 - smooth(remap(x, b - r, b)));

/** Mulberry32 seeded PRNG. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash1(i, seed) {
  let h = (i * 374761393 + seed * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 1D value noise in [-1, 1]. */
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i, seed), hash1(i + 1, seed), u) * 2 - 1;
}

/** Fractal noise, good for handheld camera drift and idle fidgets. */
export function fbm1(x, seed = 0, oct = 3) {
  let a = 0.5, s = 0, f = 1;
  for (let o = 0; o < oct; o++) { s += a * noise1(x * f, seed + o * 17); f *= 2.03; a *= 0.5; }
  return s;
}

/**
 * Travel distance along a path with a trapezoid velocity profile:
 * accelerate over `acc` fraction, cruise, decelerate. Returns metres travelled.
 */
export function travel(t, t0, t1, length, acc = 0.2) {
  const u = remap(t, t0, t1);
  const a = clamp(acc, 0.001, 0.5);
  const vmax = 1 / (1 - a);
  let s;
  if (u < a) s = 0.5 * vmax * u * u / a;
  else if (u > 1 - a) s = 1 - 0.5 * vmax * (1 - u) * (1 - u) / a;
  else s = 0.5 * vmax * a + vmax * (u - a);
  return s * length;
}

/** Arc-length parametrised path; distance -> position / heading. */
export class Path {
  constructor(points, closed = false, tension = 0.5) {
    this.curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, "centripetal", tension);
    this.length = this.curve.getLength();
  }
  at(s, out = new THREE.Vector3()) {
    return this.curve.getPointAt(clamp(s / this.length), out);
  }
  heading(s) {
    const t = this.curve.getTangentAt(clamp(s / this.length, 0.0005, 0.9995));
    return Math.atan2(t.x, t.z);
  }
}

/** Shortest-path angle lerp. */
export function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
}

/** Piecewise keyframe track over time: keys = [[t, value], ...] (numbers or arrays). */
export function track(keys, t, ease = smooth) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, va] = keys[i];
    const [tb, vb] = keys[i + 1];
    if (t <= tb) {
      const u = ease((t - ta) / Math.max(tb - ta, 1e-6));
      if (Array.isArray(va)) return va.map((x, k) => lerp(x, vb[k], u));
      return lerp(va, vb, u);
    }
  }
  return keys[keys.length - 1][1];
}

export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
