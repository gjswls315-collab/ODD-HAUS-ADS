// Enemy bullets, items and shared effects (placeholder art).
import { Bitmap, rng } from './lib/raster.mjs';
import { Sheet } from './lib/sheet.mjs';

const DEG = Math.PI / 180;

/** Round bullet: dark outline, coloured rings, bright core. rings = [[radius, colour], ...] from outside in. */
function orb(size, rings) {
  const b = new Bitmap(size, size), c = size / 2;
  for (const [r, col] of rings) b.ell(c, c, r, r, col);
  return b;
}

function bullets() {
  const s = new Sheet('sprites/bullets', { maxWidth: 256 });
  s.add('B01', [orb(9, [[4.5, 'R0'], [3.6, 'R4'], [2.6, 'R6']]), orb(9, [[4.5, 'R0'], [3.6, 'R5'], [2.6, 'R6']])], { duration: 66 });
  const boneM = (ring) => { const b = orb(11, [[5.5, 'R0'], [4.6, ring], [3.7, 'B5']]); b.ell(5.5, 5.5, 1.5, 1.5, 'R6'); b.plot(7, 3, 'R6'); return b; };
  s.add('B02', [boneM('R3'), boneM('R4')], { duration: 66 });
  s.add('B02r', [orb(11, [[5.5, 'R0'], [4.6, 'R3'], [3.7, 'R4'], [2.7, 'R6']]), orb(11, [[5.5, 'R0'], [4.6, 'R4'], [3.7, 'R5'], [2.7, 'R6']])], { duration: 66 });
  // needle bullets, pre-rotated in 16 directions (frame i = angle i * 22.5 degrees)
  const needles = [];
  for (let i = 0; i < 16; i++) {
    const b = new Bitmap(15, 15), a = i * 22.5 * DEG, ca = Math.cos(a), sa = Math.sin(a);
    const cap = (len, r, col) => {
      const pts = [];
      for (let k = 0; k <= 8; k++) { const t = -Math.PI / 2 + (k / 8) * Math.PI; pts.push([len / 2 + Math.cos(t) * r, Math.sin(t) * r]); }
      for (let k = 0; k <= 8; k++) { const t = Math.PI / 2 + (k / 8) * Math.PI; pts.push([-len / 2 + Math.cos(t) * r, Math.sin(t) * r]); }
      b.poly(pts.map(([x, y]) => [7.5 + x * ca - y * sa, 7.5 + x * sa + y * ca]), col);
    };
    cap(9, 2.6, 'R0'); cap(9, 1.7, 'R4');
    b.line(7.5 - ca * 4, 7.5 - sa * 4, 7.5 + ca * 4, 7.5 + sa * 4, 'R6');
    b.plot(7.5 + ca * 5, 7.5 + sa * 5, 'R5');
    needles.push(b);
  }
  s.add('B03', needles, { duration: 1000 });
  // homing soul (destructible): small skull wrapped in a crimson ring
  const soul = (f) => {
    const b = orb(13, [[6.5, 'R0'], [5.6, f ? 'R4' : 'R3']]);
    b.ell(6.5, 6, 4, 4, 'B4'); b.rect(4, 8, 5, 2, 'B4'); b.ell(5, 6, 1.1, 1.3, 'R1'); b.ell(8, 6, 1.1, 1.3, 'R1');
    b.plot(6, 9, 'B2'); b.plot(5, 4, 'B5'); return b;
  };
  s.add('B04', [soul(0), soul(1)], { duration: 100 });
  const boneL = (ring) => { const b = orb(19, [[9.5, 'R0'], [8.6, 'R2'], [7.6, ring], [6.6, 'B5']]); b.ell(9.5, 9.5, 2.6, 2.6, 'R6'); b.ell(12, 6.5, 1.6, 1.6, 'R6'); return b; };
  s.add('B05', [boneL('R3'), boneL('R4')], { duration: 66 });
  s.add('B06', [orb(13, [[6.5, 'R0'], [5.6, 'R2'], [4.6, 'R4'], [3.4, 'R6']]), orb(13, [[6.5, 'R0'], [5.6, 'R3'], [4.6, 'R5'], [3.4, 'R6']])], { duration: 66 });
  return s;
}

function items() {
  const s = new Sheet('sprites/items', { maxWidth: 256 });
  const gem = (k) => {
    const b = new Bitmap(13, 13), w = [5.5, 4, 1.5, 4][k];
    b.poly([[6.5, 0.5], [6.5 + w, 6.5], [6.5, 12.5], [6.5 - w, 6.5]], 'N0');
    b.poly([[6.5, 1.8], [6.5 + w - 1, 6.5], [6.5, 11.2], [6.5 - w + 1, 6.5]], 'G1');
    b.poly([[6.5, 1.8], [6.5 + w - 1, 6.5], [6.5, 6.5]], 'G2');
    b.poly([[6.5, 1.8], [6.5, 6.5], [6.5 - w + 1, 6.5]], 'G3');
    b.plot(6, 4, 'G4'); return b;
  };
  s.add('P', [0, 1, 2, 3].map(gem), { duration: 110 });
  const heart = (k) => {
    const b = new Bitmap(13, 13);
    b.ell(4.5, 5, 3.4, 3.4, 'N0'); b.ell(8.5, 5, 3.4, 3.4, 'N0'); b.poly([[1.5, 6], [6.5, 12.5], [11.5, 6]], 'N0');
    b.ell(4.5, 5, 2.4, 2.4, 'M0'); b.ell(8.5, 5, 2.4, 2.4, 'M0'); b.poly([[2.6, 6], [6.5, 11], [10.4, 6]], 'M0');
    b.ell(4.5, 4.5, 1.4, 1.4, k % 2 ? 'M2' : 'M1'); b.plot(9, 4, 'M1'); return b;
  };
  s.add('H', [0, 1, 2, 3].map(heart), { duration: 140 });
  const bell = (k) => {
    const b = new Bitmap(13, 13), sw = [0, 1, 0, -1][k];
    b.poly([[6.5 + sw * 0.5, 1], [10 + sw, 9], [3 + sw, 9]], 'N0'); b.rect(1 + sw, 9, 11, 2, 'N0');
    b.poly([[6.5 + sw * 0.5, 2.4], [9 + sw, 9], [4 + sw, 9]], 'Z3'); b.rect(2 + sw, 9, 9, 1, 'Z4'); b.plot(5 + sw, 5, 'Z5');
    b.ell(6.5 + sw, 11.5, 1.2, 1.2, 'N9'); return b;
  };
  s.add('B', [0, 1, 2, 3].map(bell), { duration: 120 });
  const cross = (k) => {
    const b = new Bitmap(9, 11);
    b.rect(3, 0, 3, 11, 'N0'); b.rect(0, 3, 9, 3, 'N0');
    b.rect(4, 1, 1, 9, k % 2 ? 'B5' : 'B4'); b.rect(1, 4, 7, 1, k % 2 ? 'B5' : 'B4'); return b;
  };
  s.add('S', [0, 1, 0, 1].map(cross), { duration: 120 });
  s.add('mote', [orb(5, [[2.5, 'M0'], [1.5, 'M2']]), orb(5, [[2.5, 'M1'], [1.2, 'M2']])], { duration: 100 });
  return s;
}

/** Burst: pale flash, then ash clusters spreading and thinning. */
function burstFrames(size, n, seed, palette = { flash: 'B5', mid: 'M1', ash: ['N7', 'N8', 'N6'], shard: 'B3' }) {
  const r = rng(seed), c = size / 2, parts = [];
  for (let i = 0; i < size * 1.2; i++) { const a = r() * Math.PI * 2; parts.push({ a, v: r.range(0.35, 1), s: r() < 0.35 ? 2 : 1, col: r.pick(palette.ash) }); }
  const shards = Array.from({ length: Math.round(size / 8) }, () => ({ a: r() * Math.PI * 2, v: r.range(0.6, 1) }));
  const frames = [];
  for (let f = 0; f < n; f++) {
    const b = new Bitmap(size, size), k = f / (n - 1);
    if (f < 2) { const rr = c * (0.32 + f * 0.18); b.ell(c, c, rr, rr, f ? palette.mid : palette.flash); if (!f) b.ell(c, c, rr * 0.55, rr * 0.55, 'N11'); else b.ell(c, c, rr * 0.6, rr * 0.6, { c: palette.flash, d: 10 }); }
    if (f >= 1) {
      for (const p of parts) {
        const d = c * (0.15 + p.v * 0.8 * Math.min(1, k * 1.3));
        const x = c + Math.cos(p.a) * d, y = c + Math.sin(p.a) * d * 0.85 - k * size * 0.08;
        if (k > 0.55 && ((p.a * 1000) | 0) % 16 < (k - 0.55) * 35) continue;
        b.rect(x, y, p.s, p.s, p.col);
      }
      for (const sh of shards) { const d = c * sh.v * Math.min(1, k * 1.5); if (k < 0.85) b.rect(c + Math.cos(sh.a) * d, c + Math.sin(sh.a) * d + k * k * size * 0.2, 2, 1, palette.shard); }
    }
    frames.push(b);
  }
  return frames;
}

function ringFrames(size, n, cols, thick = 1.6) {
  const frames = [], c = size / 2;
  for (let f = 0; f < n; f++) {
    const b = new Bitmap(size, size), k = (f + 1) / n, r = 3 + (c - 4) * Math.sqrt(k);
    b.ring(c, c, r - thick, r, f < n / 2 ? cols[0] : { c: cols[1], d: Math.round(16 - (k - 0.5) * 24) });
    if (f < n / 2) b.ring(c, c, r - thick - 1, r - thick, { c: cols[1], d: 8 });
    frames.push(b);
  }
  return frames;
}

function fx() {
  const s = new Sheet('sprites/fx', { maxWidth: 512 });
  const star = (f, cols) => {
    const b = new Bitmap(9, 9), L = [4, 3, 2, 1][f];
    b.rect(4 - L, 4, L * 2 + 1, 1, cols[1]); b.rect(4, 4 - L, 1, L * 2 + 1, cols[1]);
    if (f < 2) { b.plot(4, 4, cols[0]); b.plot(3, 3, cols[1]); b.plot(5, 5, cols[1]); b.plot(5, 3, cols[1]); b.plot(3, 5, cols[1]); }
    return b;
  };
  s.add('spark', [0, 1, 2, 3].map((f) => star(f, ['N11', 'B4'])), { duration: 40 });
  s.add('spark_metal', [0, 1, 2, 3].map((f) => star(f, ['Z5', 'Z4'])), { duration: 40 });
  s.add('hit_core', [0, 1, 2].map((f) => { const b = new Bitmap(13, 13); b.ell(6.5, 6.5, 5 - f * 1.4, 5 - f * 1.4, f ? 'R5' : 'N11'); if (!f) b.ell(6.5, 6.5, 2.5, 2.5, 'R6'); return b; }), { duration: 33 });
  s.add('burst_s', burstFrames(24, 6, 3), { duration: 60 });
  s.add('burst_m', burstFrames(40, 8, 5), { duration: 60 });
  s.add('burst_l', burstFrames(64, 10, 7), { duration: 66 });
  s.add('burst_boss', burstFrames(64, 10, 9, { flash: 'R6', mid: 'R4', ash: ['N7', 'N8', 'R2'], shard: 'Z4' }), { duration: 66 });
  s.add('ring', ringFrames(48, 6, ['M1', 'M0']), { duration: 50 });
  s.add('ring_red', ringFrames(80, 7, ['R3', 'R2'], 2), { duration: 60 });
  s.add('graze', [0, 1, 2].map((f) => { const b = new Bitmap(7, 7); b.plot(3, 3 - f - 1, 'N10'); b.plot(3, 3 + f + 1, 'N10'); b.plot(3 - f - 1, 3, 'N10'); b.plot(3 + f + 1, 3, 'N10'); return b; }), { duration: 50 });
  s.add('pickup', [0, 1, 2, 3].map((f) => { const b = new Bitmap(13, 13); b.ring(6.5, 6.5, 2 + f * 1.3, 3 + f * 1.3, { c: f < 2 ? 'B5' : 'B3', d: 16 - f * 3 }); return b; }), { duration: 50 });
  s.add('cancel', [0, 1, 2, 3].map((f) => { const b = new Bitmap(9, 9); b.ell(4.5, 4.5, 3.5 - f * 0.6, 3.5 - f * 0.6, f < 2 ? 'B5' : 'M1'); if (f >= 1) b.ell(4.5, 4.5, 2.4 - f * 0.5, 2.4 - f * 0.5, null); return b; }), { duration: 50 });
  s.add('ash', [0, 1, 2].map((f) => { const b = new Bitmap(3, 3); if (f === 0) b.rect(0, 0, 2, 2, 'N7'); else if (f === 1) b.plot(1, 1, 'N8'); else b.plot(1, 1, 'N6'); return b; }), { duration: 300 });
  const r = rng(17);
  s.add('debris', [0, 1, 2, 3].map((v) => {
    const b = new Bitmap(14, 14), pts = [];
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + r.range(-0.3, 0.3), d = r.range(3.5, 6); pts.push([7 + Math.cos(a) * d, 7 + Math.sin(a) * d]); }
    b.poly(pts, 'T3'); b.poly(pts.map(([x, y]) => [x * 0.7 + 2.6, y * 0.7 + 1.6]), 'T4'); b.selout(); if (v % 2) b.plot(9, 5, 'T6');
    return b;
  }), { duration: 1000 });
  s.add('bellshard', [0, 1, 2, 3, 4, 5].map((v) => {
    const b = new Bitmap(18, 18), pts = [];
    const n = 4 + (v % 3);
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + r.range(-0.4, 0.4), d = r.range(4, 8); pts.push([9 + Math.cos(a) * d, 9 + Math.sin(a) * d * 0.7]); }
    b.poly(pts, 'Z2'); b.poly(pts.map(([x, y]) => [x * 0.75 + 2.3, y * 0.75 + 1.8]), 'Z3'); b.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1], 'Z5'); b.selout();
    return b;
  }), { duration: 1000 });
  // lightning hazard: vertical bolt tile (stack it) + telegraph marker
  s.add('lightning', [0, 1, 2].map((f) => {
    const b = new Bitmap(28, 120), rr = rng(40 + f);
    let x = 14;
    for (let y = 0; y < 120;) { const ny = y + rr.int(5, 10), nx = Math.max(6, Math.min(22, x + rr.int(-5, 5))); b.bar(x, y, nx, ny, 5, 'R2'); b.bar(x, y, nx, ny, 3, 'R4'); b.line(x, y, nx, ny, 'R6'); if (rr() < 0.3) b.line(nx, ny, nx + rr.int(-8, 8), ny + rr.int(4, 10), 'R3'); x = nx; y = ny; }
    if (f === 2) b.dissolve(6);
    return b;
  }), { duration: 40, pivot: [14, 0] });
  s.add('lightning_tele', [0, 1].map((f) => { const b = new Bitmap(11, 9); b.poly([[0, 0], [11, 0], [5.5, 8]], 'R0'); b.poly([[1.6, 1], [9.4, 1], [5.5, 6.6]], f ? 'R4' : 'R3'); return b; }), { duration: 100, pivot: [5, 0] });
  // falling bell hazard
  s.add('belldrop', [0].map(() => {
    const b = new Bitmap(44, 48);
    b.rect(20, 0, 4, 6, 'N5'); b.ellRing(22, 6, 4, 3, 1, 'N6');
    b.poly([[14, 8], [30, 8], [34, 22], [38, 36], [6, 36], [10, 22]], 'Z2');
    b.poly([[25, 8], [30, 8], [34, 22], [38, 36], [31, 36], [29, 22]], 'Z3'); b.line(30, 8, 38, 36, 'Z4');
    b.rect(3, 36, 38, 4, 'Z3'); b.rect(3, 36, 38, 1, 'Z5'); b.ell(22, 42, 15, 3, 'N0'); b.ell(22, 44, 3, 3, 'R3'); b.plot(21, 43, 'R6');
    for (let x = 12; x < 34; x += 4) b.rect(x, 26, 2, 2, 'Z1');
    return b.selout();
  }), { duration: 1000, pivot: [22, 40] });
  s.add('belldrop_mark', [0, 1].map((f) => { const b = new Bitmap(56, 12); b.ellRing(28, 6, 26 - f * 2, 5 - f * 0.6, 1, 'R3'); b.ell(28, 6, 22 - f * 2, 3.5, { c: 'R1', d: 6 }); return b; }), { duration: 120, pivot: [28, 6] });
  s.add('dust', [0, 1, 2, 3].map((f) => { const b = new Bitmap(20, 14); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI, d = 3 + f * 2.2; b.ell(10 + Math.cos(a) * d * 1.4, 11 - Math.sin(a) * d * 0.6, 2.4 - f * 0.4, 2 - f * 0.3, f < 2 ? 'N7' : { c: 'N6', d: 8 }); } return b; }), { duration: 70, pivot: [10, 12] });
  s.add('warn', [0, 1].map((f) => { const b = new Bitmap(11, 11); b.poly([[5.5, 0], [11, 10], [0, 10]], 'R0'); b.poly([[5.5, 2], [9.3, 9], [1.7, 9]], f ? 'R4' : 'R3'); b.rect(5, 4, 1, 3, 'R6'); b.plot(5, 8, 'R6'); return b; }), { duration: 120 });
  // black-fog vision mask: transparent hole (r 132) with a dithered falloff to opaque near-black
  const V = 360, vis = new Bitmap(V, V);
  for (let y = 0; y < V; y++) for (let x = 0; x < V; x++) {
    const d = Math.hypot(x + 0.5 - V / 2, y + 0.5 - V / 2), lv = Math.round(((d - 132) / 40) * 16);
    if (lv >= 16) vis.plot(x, y, { c: 'N0', a: 214 });
    else if (lv > 0) vis.plot(x, y, { c: 'N0', a: 214, d: lv });
  }
  s.add('vision', [vis], { duration: 1000 });
  return s;
}

export function buildCombat() {
  return [bullets(), items(), fx()].map((s) => ({ sheet: s, info: s.write() }));
}
