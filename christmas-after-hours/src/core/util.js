export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sat = (x) => clamp(x, 0, 1);
export const smooth = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ramp = (a, b, x) => sat((x - a) / (b - a));

export const ease = {
  lin: (t) => t,
  io: (t) => t * t * (3 - 2 * t),
  out: (t) => 1 - (1 - t) * (1 - t),
  in: (t) => t * t,
  // gentle: a dolly that is already moving when the shot starts and still moving when it ends
  drift: (t) => lerp(t, t * t * (3 - 2 * t), 0.35),
};

// Deterministic PRNG
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  const f = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (a, b) => a + (b - a) * f();
  f.int = (a, b) => Math.floor(f.range(a, b + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.sign = () => (f() < 0.5 ? -1 : 1);
  return f;
}

export function hash1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

// Smooth 1D value noise in [-1, 1]
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i + seed * 57.31), hash1(i + 1 + seed * 57.31), u) * 2 - 1;
}

export function fbm1(x, seed = 0, oct = 3) {
  let a = 0.5, s = 0, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise1(x, seed + i * 13); n += a; x *= 2.03; a *= 0.5; }
  return s / n;
}

export const fmtTime = (t) => {
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${String(m).padStart(2, '0')}:${r.toFixed(1).padStart(4, '0')}`;
};
