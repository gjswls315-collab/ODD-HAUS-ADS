// Player characters (placeholder art). Right-facing side views, 56x40 body frames, pivot = hitbox (chest).
// Poses are rasterised after rotating the part geometry (tilt is baked per frame; nothing rotates at runtime).
import { Bitmap, rng } from './lib/raster.mjs';
import { Sheet } from './lib/sheet.mjs';

const DEG = Math.PI / 180;
const FW = 56, FH = 46, PX = 28, PY = 26;

/** Drawing context for one pose: part coordinates are relative to the pivot and rotated by `tilt`. */
function rig(tilt = 0, ox = 0, oy = 0) {
  const b = new Bitmap(FW, FH), c = Math.cos(tilt * DEG), s = Math.sin(tilt * DEG);
  const T = ([x, y]) => [PX + ox + x * c - y * s, PY + oy + x * s + y * c];
  return {
    b,
    poly: (pts, col) => b.poly(pts.map(T), col),
    ell: (x, y, rx, ry, col) => { const [px, py] = T([x, y]); b.ell(px, py, rx, ry, col); },
    ring: (x, y, rx, ry, t, col) => { const [px, py] = T([x, y]); b.ellRing(px, py, rx, ry, t, col); },
    line: (p, q, col) => { const [a, bb] = T(p), [cc, d] = T(q); b.line(a, bb, cc, d, col); },
    bar: (p, q, w, col) => { const [a, bb] = T(p), [cc, d] = T(q); b.bar(a, bb, cc, d, w, col); },
    stroke: (pts, w0, w1, col) => b.stroke(pts.map(T), w0, w1, col),
    dot: (x, y, col) => { const [px, py] = T([x, y]); b.plot(px, py, col); },
  };
}

// ------------------------------------------------------------------ Seraphine
function seraphine({ phase = 0, tilt = 0, state = 'fly' }) {
  const lift = state === 'hit' ? -16 : 0;
  const R = rig(tilt + lift, state === 'hit' ? -2 : 0, 0);
  const w = Math.sin((phase / 4) * Math.PI * 2), w2 = Math.sin((phase / 4) * Math.PI * 2 + 1.4);
  const trail = state === 'cast' ? -3 : tilt * 0.35;
  // veil (behind)
  R.poly([[6, -13], [-2, -13], [-9, -12 + w * 1.2 + trail], [-15, -10 + w2 * 1.6 + trail], [-11, -8 + trail * 0.5], [-4, -9], [4, -9]], 'B1');
  R.poly([[4, -13], [-3, -13], [-8, -12 + w + trail], [-5, -11], [2, -11]], 'B2');
  // halo ring
  const hr = state === 'cast' ? 1.35 : 1, glow = state === 'charge' || state === 'cast';
  R.ring(4, -19, 5 * hr, 5.6 * hr, 1.6, 'N5');
  R.ring(4, -19, 5 * hr, 5.6 * hr, 1, glow ? 'G2' : 'N7');
  R.dot(7, -23, glow ? 'G4' : 'G3'); R.dot(8, -22, 'G2'); R.dot(6, -24, 'G2');
  // surcoat tails
  R.poly([[-4, 3], [-12, 5 + w * 0.8 + trail], [-22, 6 + w2 * 1.6 + trail], [-29, 8 + w * 2.2 + trail], [-24, 10 + trail], [-12, 8], [-3, 6]], 'B2');
  R.poly([[-4, 5], [-14, 9 + w2 + trail], [-24, 13 + w * 1.8 + trail], [-18, 14 + trail], [-8, 10], [-2, 8]], 'B1');
  // legs folded back (greaves)
  R.poly([[-2, 4], [-10, 6], [-16, 7], [-17, 10], [-9, 10], [-1, 8]], 'N4');
  R.poly([[-10, 6], [-16, 7], [-17, 9], [-11, 8]], 'N6');
  R.poly([[-16, 7], [-21, 7], [-22, 10], [-17, 10]], 'N3');
  // torso: white surcoat over plate
  R.poly([[-6, -7], [5, -10], [10, -6], [9, 3], [-1, 6], [-7, 3]], 'B3');
  R.poly([[-7, 3], [-1, 6], [3, 5], [-3, 1], [-6, -4]], 'B2');
  R.poly([[-4, -8], [5, -10], [10, -6], [9, -1], [-3, -1]], 'N5'); // cuirass
  R.poly([[0, -9], [5, -10], [9, -6], [4, -5]], 'N7'); R.line([5, -10], [10, -6], 'N9');
  R.line([9, -1], [8, 2], 'B4'); R.line([-3, -1], [9, -1], 'N4');
  R.dot(3, -4, 'G2');
  // pauldron + couching arm
  R.ell(4, -7, 4, 3, 'N5'); R.ell(5, -8, 2.4, 1.4, 'N7'); R.dot(7, -8, 'N9');
  R.poly([[3, -5], [9, -2], [12, 1], [11, 3], [7, 1], [2, -2]], 'N5'); R.line([9, -2], [12, 1], 'N7');
  // head: chainmail coif + face
  R.ell(9, -11, 4.2, 4.2, 'N6'); R.ell(10, -12, 3, 3, 'N7');
  R.poly([[10, -12], [14, -12], [14, -8], [11, -7], [9, -9]], 'B4'); R.dot(12, -11, 'N2'); R.line([14, -12], [14, -8], 'B5');
  R.poly([[6, -15], [11, -16], [13, -14], [7, -12]], 'B3'); // veil band over coif
  // lance (couched, pulled back while charging, raised when casting / hit)
  const pull = state === 'charge' ? -3 : 0;
  const lanceA = state === 'cast' ? -70 : state === 'hit' ? -12 : -3;
  const la = lanceA * DEG, lx = Math.cos(la), ly = Math.sin(la);
  const hx = 11 + pull, hy = 1;
  const L = (d) => [hx + lx * d, hy + ly * d];
  R.bar(L(-22), L(20), 2.2, 'N7'); R.line(L(-22), L(20), 'N9');
  R.poly([L(-2), [L(4)[0] - ly * 3.5, L(4)[1] + lx * 3.5], [L(4)[0] + ly * 3.5, L(4)[1] - lx * 3.5]], 'N6');
  const tip = [[L(20)[0] - ly * 2, L(20)[1] + lx * 2], L(26), [L(20)[0] + ly * 2, L(20)[1] - lx * 2]];
  R.poly(tip, 'G1'); R.line(L(20), L(25), state === 'charge' ? 'G4' : 'G3');
  R.ell(hx, hy, 1.6, 1.6, 'B3'); // gauntlet
  return R.b.selout();
}

// ------------------------------------------------------------------ Noctis
function noctis({ phase = 0, tilt = 0, state = 'fly' }) {
  const R = rig(tilt + (state === 'hit' ? -14 : 0), state === 'hit' ? -2 : 0, 0);
  const flap = state === 'fly' ? [0, -1, 0, 1][phase] : state === 'up' ? 1 : state === 'down' ? -1 : 0;
  const spread = state === 'charge' || state === 'cast' ? 1 : state === 'hit' ? -1 : 0;
  const tipY = -14 + flap * 5 - spread * 4, tipX = -26 - spread * 2;
  const sw = Math.sin((phase / 4) * Math.PI * 2);
  // far wing (darker)
  R.poly([[2, -4], [-6, -8], [tipX + 6, tipY - 2], [tipX + 3, tipY + 2], [-8, -3], [0, -1]], 'N4');
  // scarf strips (behind body)
  R.poly([[8, -6], [-4, -5 + sw], [-16, -4 + sw * 2], [-26, -3 + sw * 2.4], [-18, -2], [-4, -3], [8, -4]], 'N7');
  R.poly([[6, -3], [-6, -1 + sw], [-18, 1 + sw * 2], [-10, 1], [4, -1]], 'N8');
  // near wing
  R.poly([[3, -3], [-4, -8 - spread * 2], [tipX, tipY], [tipX - 2, tipY + 4], [-10, -2], [0, 0]], 'N6');
  R.line([3, -4], [tipX, tipY], 'N9'); R.line([tipX, tipY], [tipX - 2, tipY + 4], 'N7');
  R.line([-2, -3], [tipX + 4, tipY + 3], 'N5');
  const ex = tipX + 7, ey = tipY + 3.5;
  R.ell(ex, ey, 2.6, 1.8, 'A0'); R.dot(ex, ey, state === 'charge' || state === 'cast' ? 'A4' : 'A3'); R.dot(ex + 1, ey, 'A2');
  // lower wing
  const lowY = 8 - flap * 2 + spread * 3;
  R.poly([[0, 2], [-8, 5], [-20, lowY], [-22, lowY + 3], [-12, 7], [-1, 5]], 'N5'); R.line([0, 2], [-20, lowY], 'N7'); R.dot(-16, lowY + 1, 'A2');
  // legs trailing straight
  R.poly([[-2, 3], [-12, 4], [-17, 5], [-12, 7], [-1, 6]], 'N2'); R.line([-12, 4], [-17, 5], 'N4');
  // coat / body
  R.poly([[-4, -2], [8, -5], [13, -2], [11, 4], [2, 5], [-5, 3]], 'N4');
  R.poly([[-5, 3], [2, 5], [6, 4], [0, 1]], 'N2'); R.line([8, -5], [13, -2], 'N7');
  R.dot(4, 0, 'N6'); R.dot(6, 1, 'N6');
  // folded scythe on the back
  R.stroke([[-2, -6], [2, -9], [7, -10], [11, -8]], 1.6, 1, 'N8'); R.line([-4, -4], [-2, -6], 'N5');
  // hood with feelers
  R.ell(14, -5, 4, 3.6, 'N4'); R.ell(15, -6, 2.4, 2, 'N6'); R.poly([[15, -5], [19, -5], [18, -2], [15, -2]], 'N3'); R.dot(17, -4, 'A4');
  R.stroke([[13, -8], [10, -12], [6, -15]], 1.4, 1, 'N6'); R.stroke([[14, -8], [12, -13], [9, -17]], 1.4, 1, 'N6');
  R.dot(6, -15, 'N8'); R.dot(9, -17, 'N8');
  // wrist crossbow
  const arm = state === 'cast' ? -4 : 0;
  R.poly([[10, 0], [19, 1 + arm], [19, 3 + arm], [10, 3]], 'N5'); R.line([18, -3 + arm], [19, 6 + arm], 'N6'); R.dot(21, 2 + arm, 'A3');
  return R.b.selout();
}

// ------------------------------------------------------------------ Morgana
function morgana({ phase = 0, tilt = 0, state = 'fly' }) {
  const R = rig(tilt + (state === 'hit' ? -12 : 0), -2, 2);
  const sw = Math.sin((phase / 4) * Math.PI * 2), sw2 = Math.cos((phase / 4) * Math.PI * 2);
  const lid = state === 'cast' ? 1 : state === 'charge' ? 0.3 : 0;
  // veil trailing (behind)
  R.poly([[-6, -15], [-14, -13 + sw], [-22, -9 + sw * 1.6], [-25, -3 + sw * 2], [-18, -5], [-10, -9], [-4, -11]], 'N3');
  R.line([-6, -15], [-22, -9 + sw * 1.6], 'N5');
  // chains under the coffin
  for (const [cx, k] of [[-14, 1], [10, -1]]) { for (let i = 0; i < 4; i++) R.dot(cx + i * 0.6 * sw * k, 9 + i * 2, 'N6'); }
  // coffin
  R.poly([[-24, 2], [14, 1], [21, 4], [14, 8], [-24, 8], [-26, 5]], 'T3');
  R.poly([[-24, 6], [14, 6], [17, 7], [14, 8], [-24, 8]], 'T2');
  const ly = -lid * 3;
  R.poly([[-23, 0 + ly], [13, -1 + ly], [20, 2.5 + ly * 0.4], [14, 1.5], [-24, 2]], 'T4'); R.line([-22, 0 + ly], [12, -1 + ly], 'T5');
  if (lid > 0) { R.poly([[-20, 1.5], [12, 0.8], [12, 1.6], [-20, 2.2]], lid > 0.5 ? 'V3' : 'V2'); }
  R.poly([[-15, 0], [-13, 0], [-13, 8], [-15, 8]], 'N6'); R.poly([[4, -1], [6, -1], [6, 8], [4, 8]], 'N6');
  R.dot(19, 4, 'N8');
  // dress draped over the coffin side
  R.poly([[-14, -2], [-3, -3], [-1, 1], [-6, 5], [-16, 5]], 'N2'); R.line([-13, -2], [-4, -3], 'N4');
  // torso and head (lit from below by the lantern)
  R.poly([[-11, -12], [-4, -13], [-2, -3], [-12, -2]], 'N3');
  R.ell(-6, -15, 3.2, 3.2, 'N2'); R.poly([[-5, -16], [-2, -16], [-2, -12], [-5, -12]], 'B4'); R.dot(-3, -15, 'N2'); R.dot(-3, -12, 'V2');
  R.poly([[-9, -17], [-3, -18], [-1, -16], [-7, -15]], 'N2'); // veil crown
  // arm and staff toward the lantern
  const st = state === 'cast' ? -10 : 0;
  R.poly([[-4, -9], [3, -8], [3, -6], [-4, -6]], 'N3'); R.dot(4, -7, 'B3');
  const tipX = 22, tipY = -15 + st;
  R.line([2, -5], [tipX, tipY], 'N6'); R.dot(tipX, tipY, 'N7');
  // lantern swinging on a short chain
  const lx = tipX + sw * 1.5 + (state === 'hit' ? -3 : 0), lyy = tipY + 4;
  R.line([tipX, tipY], [lx, lyy - 2], 'N6');
  R.poly([[lx - 2.5, lyy - 2], [lx + 2.5, lyy - 2], [lx + 2.5, lyy + 4], [lx - 2.5, lyy + 4]], 'N5');
  R.poly([[lx - 1.5, lyy - 1], [lx + 1.5, lyy - 1], [lx + 1.5, lyy + 3], [lx - 1.5, lyy + 3]], state === 'charge' || state === 'cast' ? 'V4' : 'V3');
  R.dot(lx, lyy, 'V4'); R.dot(lx, lyy + 5, 'N5');
  // wandering spirits
  const s1 = [-2 + sw2 * 6, -20 + sw * 2], s2 = [-28 + sw * 3, -4 + sw2 * 2];
  R.dot(s1[0], s1[1], 'V3'); R.dot(s1[0] + 1, s1[1], 'V4'); R.dot(s1[0] - 1, s1[1] + 1, 'V1');
  R.dot(s2[0], s2[1], 'V2'); R.dot(s2[0] + 1, s2[1], 'V3');
  // pearl rim (eclipse corona) on the top edges and lantern-green on the right of the dark robe, so the
  // silhouette reads against the night sky
  R.b.rim('M0', 't', (x, y, p) => p[0] + p[1] + p[2] < 200);
  R.b.rim('V1', 'r', (x, y, p) => p[0] + p[1] + p[2] < 200);
  return R.b.selout();
}

function bodySheet(id, draw) {
  const s = new Sheet('sprites/hero_' + id, { maxWidth: 512 });
  const pivot = [PX, PY];
  s.add('fly', [0, 1, 2, 3].map((p) => draw({ phase: p })), { duration: id === 'noctis' ? 50 : 100, pivot });
  s.add('up', [0, 1].map((p) => draw({ phase: p, tilt: -9, state: 'up' })), { duration: 100, pivot });
  s.add('down', [0, 1].map((p) => draw({ phase: p, tilt: 9, state: 'down' })), { duration: 100, pivot });
  s.add('charge', [0, 1, 2, 3].map((p) => draw({ phase: p, state: 'charge' })), { duration: id === 'noctis' ? 50 : 100, pivot });
  s.add('hit', [0, 1].map((p) => draw({ phase: p, state: 'hit' })), { duration: 80, pivot });
  s.add('cast', [0, 1, 2].map((p) => draw({ phase: p, state: 'cast' })), { duration: 90, pivot });
  return s;
}

// ------------------------------------------------------------------ effects
const KEY = { seraphine: 'G', noctis: 'A', morgana: 'V' };

function muzzle(k) {
  return [0, 1, 2].map((f) => {
    const b = new Bitmap(11, 11), L = [5, 4, 2][f];
    b.rect(5 - L, 5, L * 2 + 1, 1, k + '3'); b.rect(5, 5 - Math.ceil(L / 2), 1, Math.ceil(L / 2) * 2 + 1, k + '2');
    if (f < 2) { b.ell(5.5, 5.5, 2 - f * 0.6, 2 - f * 0.6, k + '4'); }
    return b;
  });
}
function aura(k, full) {
  return [0, 1, 2, 3].map((f) => {
    const b = new Bitmap(44, 44), c = 22, r = full ? 17 : 14;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + (f / 4) * (Math.PI / 4), x = c + Math.cos(a) * r, y = c + Math.sin(a) * r * 0.9;
      b.plot(x, y, i % 2 ? k + '2' : k + '3'); if (i % 2 === 0) { b.plot(x + 1, y, k + '1'); b.plot(x, y + 1, k + '1'); }
    }
    b.ring(c, c, r - 0.8, r + 0.4, { c: k + '1', d: full ? 7 : 4 });
    if (full) { b.ring(c, c, r + 2, r + 3, { c: k + '3', d: f % 2 ? 10 : 6 }); b.plot(c + Math.cos(f) * 6, c + Math.sin(f) * 6, k + '4'); }
    return b;
  });
}
function release(k) {
  return [0, 1, 2, 3].map((f) => {
    const b = new Bitmap(34, 34), c = 17, r = 5 + f * 3.5;
    b.ring(c, c, r - 1.6, r, f < 2 ? k + '4' : { c: k + '2', d: 16 - f * 4 });
    if (f === 0) b.ell(c, c, 4, 4, k + '4');
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + f * 0.3; b.plot(c + Math.cos(a) * (r + 3), c + Math.sin(a) * (r + 3), k + '3'); }
    return b;
  });
}
function death(k) {
  const r = rng(k.charCodeAt(0));
  const shards = Array.from({ length: 22 }, () => ({ a: r() * Math.PI * 2, v: r.range(0.4, 1), c: r.pick([k + '3', k + '2', 'B4', 'N8']) }));
  return [0, 1, 2, 3, 4, 5, 6, 7].map((f) => {
    const b = new Bitmap(56, 56), c = 28, t = f / 7;
    if (f < 2) b.ell(c, c, 8 + f * 6, 8 + f * 6, f ? { c: k + '3', d: 10 } : 'N11');
    for (const s of shards) { if (t > 0.7 && s.v > 0.8) continue; const d = 4 + s.v * 24 * Math.min(1, t * 1.4); b.rect(c + Math.cos(s.a) * d, c + Math.sin(s.a) * d + t * t * 8, 2, 1, s.c); }
    if (f >= 1 && f < 5) b.ring(c, c, 6 + f * 5, 7 + f * 5, { c: k + '2', d: 12 - f * 2 });
    return b;
  });
}

function seraphineFx() {
  const s = new Sheet('sprites/hero_seraphine_fx', { maxWidth: 512 });
  s.add('shot', [0, 1].map((f) => { const b = new Bitmap(14, 3); b.rect(0, 1, 13, 1, f ? 'G2' : 'G3'); b.rect(3, 2, 9, 1, 'G1'); b.rect(6, 0, 7, 1, 'G2'); b.plot(13, 1, 'G4'); b.plot(12, 1, 'G4'); return b; }), { duration: 50, pivot: [12, 1] });
  s.add('muzzle', muzzle('G'), { duration: 33 });
  const lance = (len, th, f) => {
    const b = new Bitmap(len + 6, th + 2), cy = (th + 2) / 2;
    b.poly([[0, cy - th / 2 + 1], [len, cy - th / 2], [len + 6, cy], [len, cy + th / 2], [0, cy + th / 2 - 1]], 'G1');
    b.poly([[2, cy - th / 2 + 2], [len, cy - th / 2 + 1], [len + 4, cy], [len, cy + th / 2 - 1], [2, cy + th / 2 - 2]], 'G2');
    b.rect(4, Math.floor(cy), len, 1, 'G4'); b.rect(8, Math.floor(cy) - 1, len - 8, 1, 'G3');
    for (let x = (f * 5) % 10; x < len; x += 10) b.rect(x, Math.floor(cy) + 1, 4, 1, 'G3');
    b.plot(len + 5, Math.floor(cy), 'G4');
    return b;
  };
  s.add('charge1', [0, 1, 2].map((f) => lance(44, 5, f)), { duration: 50, pivot: [46, 3] });
  s.add('charge2', [0, 1, 2].map((f) => lance(66, 7, f)), { duration: 50, pivot: [68, 4] });
  s.add('cross', [0, 1, 2, 3].map((f) => { const b = new Bitmap(21, 31); const k = [1, 1, 0.7, 0.4][f]; b.rect(10, 15 - 15 * k, 1, 30 * k + 1, f < 2 ? 'G4' : 'G2'); b.rect(10 - 8 * k, 11, 16 * k + 1, 1, f < 2 ? 'G4' : 'G2'); if (f < 2) { b.rect(9, 15 - 10 * k, 3, 20 * k, { c: 'G2', d: 8 }); } return b; }), { duration: 40 });
  s.add('aura', aura('G', false), { duration: 80 });
  s.add('aura_full', aura('G', true), { duration: 60 });
  s.add('release', release('G'), { duration: 40 });
  s.add('pillar', [0, 1, 2, 3].map((f) => {
    const b = new Bitmap(30, 360), w = [4, 10, 8, 5][f];
    for (let y = 0; y < 360; y++) {
      b.rect(15 - w, y, w * 2, 1, f === 3 ? { c: 'G1', d: 8 } : 'G1');
      b.rect(15 - w + 2, y, (w - 2) * 2, 1, f === 3 ? { c: 'G2', d: 8 } : 'G2');
      if (f < 3) b.rect(14, y, 2, 1, 'G4');
      if (f === 1) b.rect(15 - w - 3, y, 3, 1, { c: 'G2', d: 4 }), b.rect(15 + w, y, 3, 1, { c: 'G2', d: 4 });
    }
    for (let y = 8; y < 360; y += 23) { b.rect(13, y, 4, 1, 'G4'); }
    return b;
  }), { duration: 70, pivot: [15, 0] });
  s.add('halo', [0, 1, 2, 3].map((f) => { const b = new Bitmap(120, 120), c = 60, r = 14 + f * 13; b.ring(c, c, r - 1.5, r, f < 3 ? 'G3' : { c: 'G2', d: 8 }); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + f * 0.2, x = c + Math.cos(a) * r, y = c + Math.sin(a) * r; b.rect(x - 2, y, 5, 1, 'G4'); b.rect(x, y - 2, 1, 5, 'G4'); } return b; }), { duration: 70 });
  s.add('death', death('G'), { duration: 70 });
  return s;
}

function noctisFx() {
  const s = new Sheet('sprites/hero_noctis_fx', { maxWidth: 512 });
  s.add('shot', [0, 1].map((f) => { const b = new Bitmap(11, 2); b.rect(0, 0, 3, 1, 'A0'); b.rect(3, 0, 4, 1, 'A2'); b.rect(7, 0, 4, 1, f ? 'A3' : 'A4'); b.rect(5, 1, 4, 1, { c: 'A1', d: 8 }); return b; }), { duration: 50, pivot: [10, 0] });
  s.add('muzzle', muzzle('A'), { duration: 33 });
  s.add('charge1', [0, 1, 2].map((f) => {
    const b = new Bitmap(30, 11), r = rng(200 + f);
    let x = 0, y = 5;
    while (x < 28) { const nx = x + r.int(3, 5), ny = Math.max(1, Math.min(9, 5 + r.int(-4, 4))); b.line(x, y + 1, nx, ny + 1, 'A1'); b.line(x, y, nx, ny, 'A4'); x = nx; y = ny; }
    b.ell(27, 5.5, 2.2, 2.2, 'A3'); b.plot(28, 5, 'A4'); return b;
  }), { duration: 40, pivot: [28, 5] });
  s.add('scythe', Array.from({ length: 8 }, (_, f) => {
    const b = new Bitmap(25, 25), c = 12.5, a0 = (f / 8) * Math.PI * 2;
    b.ring(c, c, 8, 11.2, 'A2', (dx, dy) => { const a = Math.atan2(dy, dx) - a0; const m = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return m < Math.PI * 1.15; });
    b.ring(c, c, 10, 11.2, 'A4', (dx, dy) => { const a = Math.atan2(dy, dx) - a0; const m = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return m < Math.PI * 1.05; });
    b.bar(c, c, c - Math.cos(a0 + 2.6) * 7, c - Math.sin(a0 + 2.6) * 7, 2, 'N6');
    b.ell(c, c, 1.6, 1.6, 'A1');
    return b;
  }), { duration: 40 });
  s.add('aura', aura('A', false), { duration: 60 });
  s.add('aura_full', aura('A', true), { duration: 50 });
  s.add('release', release('A'), { duration: 40 });
  s.add('storm', [0, 1, 2, 3].map((f) => {
    const b = new Bitmap(56, 120), r = rng(300 + f);
    for (let k = 0; k < 3; k++) { let x = 10 + k * 16 + r.int(-3, 3), y = 0; while (y < 120) { const nx = Math.max(2, Math.min(53, x + r.int(-6, 6))), ny = y + r.int(6, 12); b.line(x + 1, y, nx + 1, ny, 'A1'); b.line(x, y, nx, ny, f % 2 ? 'A4' : 'A3'); x = nx; y = ny; } }
    for (let k = 0; k < 4; k++) { const x = r.int(4, 48), y = r.int(4, 110); b.poly([[x, y], [x - 8, y - 4], [x - 6, y + 1], [x - 9, y + 5]], 'N2'); b.plot(x, y, 'A2'); }
    if (f === 3) b.dissolve(7);
    return b;
  }), { duration: 60, pivot: [28, 0] });
  s.add('strike', [0, 1, 2, 3].map((f) => { const b = new Bitmap(25, 25), c = 12.5; b.ell(c, c, 9 - f * 2, 9 - f * 2, f ? { c: 'A3', d: 12 - f * 3 } : 'A4'); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; b.line(c, c, c + Math.cos(a) * (6 + f * 2), c + Math.sin(a) * (6 + f * 2), 'A4'); } return b; }), { duration: 50 });
  s.add('death', death('A'), { duration: 70 });
  return s;
}

function morganaFx() {
  const s = new Sheet('sprites/hero_morgana_fx', { maxWidth: 512 });
  // basic wisps pre-rotated for the 5 spread angles (-24, -12, 0, 12, 24 degrees)
  const wisp = (deg, size = 9, cols = ['V1', 'V2', 'V3', 'V4']) => {
    const b = new Bitmap(size, size), c = size / 2, a = deg * DEG, ca = Math.cos(a), sa = Math.sin(a);
    const P = (x, y) => [c + x * ca - y * sa, c + x * sa + y * ca];
    b.poly([P(-4, 0), P(0, -2), P(2.5, -2), P(3.8, 0), P(2.5, 2), P(0, 2)], cols[1]);
    b.poly([P(-1, 0), P(1, -1.4), P(3, 0), P(1, 1.4)], cols[2]);
    const t = P(-4.4, 0); b.plot(t[0], t[1], cols[0]); const h = P(2.6, 0); b.plot(h[0], h[1], cols[3]);
    return b;
  };
  s.add('shot', [-24, -12, 0, 12, 24].map((d) => wisp(d)), { duration: 1000 });
  s.add('spirit', Array.from({ length: 16 }, (_, i) => wisp(i * 22.5, 11, ['V1', 'V2', 'V4', 'V4'])), { duration: 1000 });
  s.add('orb', [0, 1, 2, 3].map((f) => { const b = new Bitmap(15, 15); b.ell(7.5, 7.5, 6.5, 6.5, 'V1'); b.ell(7.5, 7.5, 5, 5, f % 2 ? 'V3' : 'V2'); b.ell(7, 7, 2.6, 2.6, 'V4'); b.plot(6, 6, 'V4'); b.ring(7.5, 7.5, 6.5, 7.5, { c: 'V2', d: f % 2 ? 6 : 3 }); return b; }), { duration: 80 });
  s.add('muzzle', muzzle('V'), { duration: 40 });
  s.add('aura', aura('V', false), { duration: 90 });
  s.add('aura_full', aura('V', true), { duration: 70 });
  s.add('release', release('V'), { duration: 40 });
  s.add('ghost', [0, 1, 2, 3].map((f) => {
    const b = new Bitmap(18, 24), sw = [0, 1, 0, -1][f];
    b.ell(9, 8, 6, 6.5, 'N9'); b.poly([[3, 8], [15, 8], [15 + sw, 19], [12, 22 + sw], [9, 19], [6, 22 - sw], [3 - sw, 19]], 'N9');
    b.ell(9, 7, 4, 4.5, 'N10'); b.ell(7, 7.5, 1.1, 1.6, 'V1'); b.ell(11, 7.5, 1.1, 1.6, 'V1'); b.rect(8, 11, 2, 2, 'N6');
    b.outline('V2');
    return b;
  }), { duration: 110 });
  s.add('death', death('V'), { duration: 70 });
  return s;
}

export function buildHeroes() {
  const sheets = [bodySheet('seraphine', seraphine), bodySheet('noctis', noctis), bodySheet('morgana', morgana), seraphineFx(), noctisFx(), morganaFx()];
  return sheets.map((s) => ({ sheet: s, info: s.write() }));
}
