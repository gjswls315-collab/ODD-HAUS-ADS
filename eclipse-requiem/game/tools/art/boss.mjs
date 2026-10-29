// Bellkeeper Abaddon (placeholder art): an undead priest carrying a giant bell on his back, built from parts.
// Attachment points are written as slices so the game composes the parts without hard-coded pixel offsets:
//   body: pivot = soul core; points head / armF / armB / bell (crown hang point)
//   bell: pivot = crown; point mouth (tilt is pre-rendered: frames -8, -4, 0, 4, 8 degrees)
//   armF: pivot = shoulder; point hook (bullet origin)        head: pivot = neck
import { Bitmap, rng } from './lib/raster.mjs';
import { Sheet } from './lib/sheet.mjs';

const DEG = Math.PI / 180;
export const BOSS_POINTS = { head: [-18, -38], armF: [-16, -26], armB: [26, -36], bell: [28, -88] };
const TILTS = [-8, -4, 0, 4, 8];
const BELL_LEN = 64;

function rimBy(stage) {
  return stage >= 2 ? 'R2' : 'M0';
}

// ------------------------------------------------------------------ body
function body(f, stage) {
  const W = 132, H = 150, cx = 64, cy = 64, b = new Bitmap(W, H), br = f ? 1 : 0;
  const P = (pts) => pts.map(([x, y]) => [cx + x, cy + y]);
  // robe
  const robe = [[-24, -34 + br], [-8, -42 + br], [20, -44 + br], [36, -36 + br], [46, -8], [54, 30], [58, 70], [46, 78], [36, 72], [24, 80], [12, 74], [0, 80], [-12, 72], [-24, 79], [-36, 70], [-40, 50], [-34, 20], [-30, -4]];
  b.poly(P(robe), 'N3');
  b.poly(P([[-24, -34 + br], [-12, -38 + br], [-20, 10], [-26, 72], [-36, 70], [-40, 50], [-34, 20], [-30, -4]]), 'N2');
  if (stage >= 3) { b.poly(P([[30, 40], [44, 30], [50, 64], [36, 60]]), null); b.poly(P([[-30, 56], [-20, 48], [-14, 72], [-26, 74]]), null); }
  // folds
  for (const [x0, x1] of [[6, 10], [24, 32], [-10, -12]]) b.line(cx + x0, cy + 20, cx + x1, cy + 74, 'N2');
  // stole (white vestment with dark crosses)
  b.poly(P([[-26, -30], [-20, -32], [-14, 72], [-20, 74]]), 'B3');
  b.line(cx - 20, cy - 32, cx - 14, cy + 72, 'B4');
  for (let y = -20; y < 70; y += 18) { b.rect(cx - 21 + y * 0.07, cy + y, 3, 1, 'N1'); b.rect(cx - 20 + y * 0.07, cy + y - 1, 1, 3, 'N1'); }
  // open ribcage with the soul-lantern cage hanging inside
  b.ell(cx, cy, 15, 19, 'N0');
  for (let i = 0; i < 5; i++) {
    const y = cy - 14 + i * 7;
    b.stroke([[cx - 13, y + 2], [cx - 6, y - 2], [cx, y - 1]], 2, 1.2, 'B2');
    b.stroke([[cx + 13, y + 2], [cx + 6, y - 2], [cx, y - 1]], 2, 1.2, 'B3');
  }
  b.rect(cx - 1, cy - 18, 2, 34, 'B3');
  b.line(cx, cy - 18, cx, cy - 11, 'N6');
  b.box(cx - 6, cy - 10, 13, 18, 'N6'); b.rect(cx - 2, cy - 10, 1, 18, 'N6'); b.rect(cx + 2, cy - 10, 1, 18, 'N6');
  // yoke beam and bell chains
  b.bar(cx - 10, cy - 44 + br, cx + 46, cy - 56 + br, 5, 'T3'); b.line(cx - 10, cy - 47 + br, cx + 46, cy - 59 + br, 'T5');
  b.ell(cx + 46, cy - 56 + br, 3, 3, 'T3');
  // hood drape over the shoulders
  b.poly(P([[-30, -32], [-18, -48], [0, -50], [12, -44], [4, -34], [-16, -28]]), 'N2');
  // skeletal feet under the hem
  b.poly(P([[-30, 79], [-38, 82], [-24, 82]]), 'B2'); b.poly(P([[8, 80], [0, 84], [14, 84]]), 'B2');
  b.rim(rimBy(stage), 'rt', (x, y, p) => p[0] + p[1] + p[2] < 300);
  return b.selout();
}

function crumble(stage) {
  const base = body(0, 3);
  return [0, 1, 2, 3, 4, 5].map((k) => {
    const b = new Bitmap(base.w, base.h);
    b.blit(base, 0, k * 3);
    b.dissolve(3 + k * 2.4, k, k * 2);
    if (k > 1) for (let y = b.h - 12; y < b.h; y++) for (let x = 20; x < 110; x += 3) if ((x + y + k) % 5 === 0) b.plot(x, y, 'N7');
    return b;
  });
}

// ------------------------------------------------------------------ head
function head(state) {
  const b = new Bitmap(42, 42), nx = 28, ny = 32;
  const back = state === 'hurt' ? 3 : 0;
  b.ell(nx - 6 + back, ny - 16, 12, 13, 'N3'); b.ell(nx - 3 + back, ny - 19, 8, 8, 'N4');
  b.poly([[nx - 18 + back, ny - 22], [nx - 26 + back, ny - 10], [nx - 14 + back, ny - 6]], 'N3');
  // skull 3/4 facing left
  const jaw = state === 'scream' ? 4 : 0;
  b.ell(nx - 12 + back, ny - 15, 7, 7.5, 'B2'); b.ell(nx - 11 + back, ny - 17, 5.4, 5, 'B3'); b.plot(nx - 9 + back, ny - 20, 'B4');
  b.ell(nx - 16 + back, ny - 15, 2, 2.2, 'N0'); b.ell(nx - 10 + back, ny - 15, 1.8, 2.2, 'N0');
  const eye = state === 'scream' ? 'R6' : 'R4';
  b.plot(nx - 16 + back, ny - 15, eye); b.plot(nx - 10 + back, ny - 15, eye);
  b.plot(nx - 13 + back, ny - 11, 'N1');
  b.rect(nx - 18 + back, ny - 9 + jaw, 10, 3, 'B2'); for (let x = nx - 17; x < nx - 8; x += 2) b.plot(x + back, ny - 9 + jaw, 'N1');
  if (jaw) b.rect(nx - 17 + back, ny - 10, 8, jaw, 'N0');
  b.rim('M0', 'rt', (x, y, p) => p[0] + p[1] + p[2] < 260);
  return b.selout();
}

// ------------------------------------------------------------------ bell
/** Bell outline in local coords: crown (0,0), axis +y, lip at y = BELL_LEN. */
function bellProfile(y) {
  const t = y / BELL_LEN;
  return 14 + 8 * t + 16 * Math.pow(t, 3) + (t > 0.9 ? (t - 0.9) * 40 : 0);
}
function bell(stage, tilt) {
  const W = 110, H = 100, ox = 55, oy = 10, b = new Bitmap(W, H), r = rng(31 + stage);
  const a = tilt * DEG, ca = Math.cos(a), sa = Math.sin(a);
  const T = (x, y) => [ox + x * ca - y * sa, oy + x * sa + y * ca];
  // crown loop
  b.poly([T(-5, 4), T(-5, -4), T(5, -4), T(5, 4)], 'Z2'); b.ellRing(...T(0, -6), 4, 3.4, 1.5, 'Z3');
  // body: left (shadow) half and right (lit) half
  const left = [], right = [];
  for (let y = 2; y <= BELL_LEN; y += 2) { left.push(T(-bellProfile(y), y)); right.push(T(bellProfile(y), y)); }
  b.poly([T(0, 2), ...right, T(0, BELL_LEN)], 'Z3');
  b.poly([T(0, 2), ...left, T(0, BELL_LEN)], 'Z2');
  // shading strips
  const strip = (k, col) => { const pts = []; for (let y = 4; y <= BELL_LEN - 4; y += 2) pts.push(T(bellProfile(y) * k, y)); for (let y = BELL_LEN - 4; y >= 4; y -= 2) pts.push(T(bellProfile(y) * (k + 0.14), y)); b.poly(pts, col); };
  strip(0.45, 'Z4'); strip(0.62, 'Z5'); strip(-0.95, 'Z1');
  // bands: inscription near the shoulder, sound bow at the lip
  for (const [y0, y1, col] of [[12, 15, 'Z1'], [BELL_LEN - 8, BELL_LEN - 4, 'Z4'], [BELL_LEN - 4, BELL_LEN, 'Z2']]) {
    b.poly([T(-bellProfile(y0), y0), T(bellProfile(y0), y0), T(bellProfile(y1), y1), T(-bellProfile(y1), y1)], col);
  }
  for (let x = -12; x <= 12; x += 4) { const p = T(x, 13.5); b.plot(p[0], p[1], 'Z4'); }
  // mouth rim seen slightly from below
  const m = T(0, BELL_LEN + 1);
  b.ell(m[0], m[1], bellProfile(BELL_LEN) * 0.92, 3, 'N0');
  // cracks
  const crack = (pts, glow) => { for (let i = 0; i + 1 < pts.length; i++) { const p = T(...pts[i]), q = T(...pts[i + 1]); b.line(p[0], p[1], q[0], q[1], glow ? 'R3' : 'N0'); } if (glow) { const p = T(...pts[1]); b.plot(p[0], p[1], 'R5'); } };
  if (stage >= 1) crack([[6, 18], [10, 30], [6, 40], [12, 52]], stage >= 2);
  if (stage >= 2) { crack([[-10, 26], [-16, 40], [-12, 50], [-20, 64]], true); }
  if (stage >= 3) {
    crack([[2, 8], [-2, 20], [4, 34], [-2, 46], [6, 60], [2, 72]], true);
    const chip = [T(18, BELL_LEN - 10), T(34, BELL_LEN - 2), T(30, BELL_LEN + 4), T(16, BELL_LEN + 2)];
    b.poly(chip, null);
    b.ell(...T(-24, BELL_LEN - 2), 5, 4, null);
  }
  b.rim(rimBy(stage), 'rt', (x, y, p) => p[3] > 0 && !(p[0] < 30 && p[1] < 30 && p[2] < 30));
  b.selout();
  return { bmp: b, crown: [ox, oy], mouth: T(0, BELL_LEN) };
}

// ------------------------------------------------------------------ arms
function armFront(pose) {
  const b = new Bitmap(120, 120), sx = 80, sy = 44;
  const J = { down: [[-6, 26], [-18, 48]], raise: [[-16, -12], [-24, -32]], reach: [[-28, 6], [-56, 12]] }[pose];
  const [e, h] = J;
  // sleeve
  b.stroke([[sx, sy], [sx + e[0], sy + e[1]]], 11, 8, 'N3');
  b.stroke([[sx, sy], [sx + e[0] * 0.6, sy + e[1] * 0.6]], 5, 4, 'N4');
  // bone forearm + hand
  b.stroke([[sx + e[0], sy + e[1]], [sx + h[0], sy + h[1]]], 3, 2.4, 'B2');
  b.line(sx + e[0] + 1, sy + e[1] - 1, sx + h[0] + 1, sy + h[1] - 1, 'B3');
  b.ell(sx + h[0], sy + h[1], 3, 3, 'B3');
  for (let k = 0; k < 3; k++) b.line(sx + h[0] - 1, sy + h[1] + k - 1, sx + h[0] - 4, sy + h[1] + k, 'B2');
  // bell hammer
  let hook;
  if (pose === 'down') {
    b.bar(sx + h[0], sy + h[1], sx + h[0] - 6, sy + h[1] + 26, 2.4, 'T3');
    const hx = sx + h[0] - 7, hy = sy + h[1] + 30;
    b.poly([[hx - 9, hy - 4], [hx + 7, hy - 6], [hx + 8, hy + 3], [hx - 8, hy + 5]], 'N5'); b.line(hx - 9, hy - 4, hx + 7, hy - 6, 'N8');
    hook = [hx, hy];
  } else if (pose === 'raise') {
    b.bar(sx + h[0], sy + h[1], sx + h[0] + 10, sy + h[1] - 26, 2.4, 'T3');
    const hx = sx + h[0] + 11, hy = sy + h[1] - 30;
    b.poly([[hx - 9, hy - 2], [hx + 5, hy - 9], [hx + 9, hy - 1], [hx - 5, hy + 6]], 'N5'); b.line(hx - 9, hy - 2, hx + 5, hy - 9, 'N8');
    hook = [hx, hy];
  } else {
    b.bar(sx + h[0], sy + h[1], sx + h[0] - 24, sy + h[1] - 2, 2.4, 'T3');
    const hx = sx + h[0] - 27, hy = sy + h[1] - 2;
    b.poly([[hx - 3, hy - 9], [hx + 4, hy - 8], [hx + 4, hy + 8], [hx - 3, hy + 9]], 'N5'); b.line(hx + 4, hy - 8, hx + 4, hy + 8, 'N8');
    hook = [sx + h[0] - 4, sy + h[1]];
  }
  b.rim('M0', 'rt', (x, y, p) => p[0] + p[1] + p[2] < 260);
  b.selout();
  return { bmp: b, pivot: [sx, sy], hook };
}

function armBack() {
  const b = new Bitmap(50, 50), sx = 10, sy = 34;
  b.stroke([[sx, sy], [sx + 10, sy - 10]], 9, 7, 'N2');
  b.stroke([[sx + 10, sy - 10], [sx + 22, sy - 22]], 3, 2.2, 'B1');
  b.ell(sx + 23, sy - 23, 3, 3, 'B2');
  b.selout();
  return { bmp: b, pivot: [sx, sy] };
}

function core(f) {
  const b = new Bitmap(16, 20), k = [0, 1, 2, 1][f];
  b.ell(8, 10, 4.5 + k * 0.4, 6 + k * 0.4, 'R2'); b.ell(8, 10, 3.2 + k * 0.3, 4.6 + k * 0.3, 'R3'); b.ell(8, 11, 2, 3, 'R4'); b.ell(8, 11, 1, 1.5, 'R6');
  b.plot(8, 4 - k, 'R4');
  return b;
}

export function buildBoss() {
  const s = new Sheet('sprites/boss_abaddon', { maxWidth: 1024 });
  const bodyPts = { head: () => [64 + BOSS_POINTS.head[0], 64 + BOSS_POINTS.head[1]], armF: () => [64 + BOSS_POINTS.armF[0], 64 + BOSS_POINTS.armF[1]], armB: () => [64 + BOSS_POINTS.armB[0], 64 + BOSS_POINTS.armB[1]], bell: () => [64 + BOSS_POINTS.bell[0], 64 + BOSS_POINTS.bell[1]] };
  s.add('body', [0, 1].map((f) => body(f, 0)), { duration: 600, pivot: [64, 64], points: bodyPts });
  s.add('body_p2', [0, 1].map((f) => body(f, 2)), { duration: 450, pivot: [64, 64], points: bodyPts });
  s.add('body_p3', [0, 1].map((f) => body(f, 3)), { duration: 300, pivot: [64, 64], points: bodyPts });
  s.add('body_crumble', crumble(), { duration: 160, pivot: [64, 64], points: bodyPts });
  s.add('head', [head('idle')], { duration: 1000, pivot: [28, 32] });
  s.add('head_scream', [head('scream'), head('idle')], { duration: 90, pivot: [28, 32] });
  s.add('head_hurt', [head('hurt')], { duration: 1000, pivot: [28, 32] });
  for (let stage = 0; stage < 4; stage++) {
    const frames = TILTS.map((t) => bell(stage, t));
    s.add('bell_c' + stage, frames.map((f) => f.bmp), { duration: 1000, pivot: (i) => frames[i].crown, points: { mouth: (i) => frames[i].mouth } });
  }
  for (const pose of ['down', 'raise', 'reach']) { const a = armFront(pose); s.add('armF_' + pose, [a.bmp], { duration: 1000, pivot: a.pivot, points: { hook: a.hook } }); }
  const ab = armBack();
  s.add('armB', [ab.bmp], { duration: 1000, pivot: ab.pivot });
  s.add('core', [0, 1, 2, 3].map(core), { duration: 110 });
  s.add('core_hit', [(() => { const b = core(2).silhouette('N11'); return b; })()], { duration: 1000 });
  s.add('bellglow', [0, 1, 2].map((f) => { const b = new Bitmap(84, 28); b.ell(42, 6, 34 - f * 4, 6 + f, { c: 'M0', d: 10 - f * 3 }); b.ell(42, 6, 26 - f * 4, 3, { c: 'M1', d: 8 - f * 2 }); return b; }), { duration: 80, pivot: [42, 4] });
  const shadow = new Bitmap(320, 90);
  shadow.ell(160, 45, 150, 40, { c: 'N0', a: 200, d: 6 }); shadow.ell(160, 45, 120, 30, { c: 'N0', a: 200, d: 10 }); shadow.ell(160, 45, 90, 22, { c: 'N0', a: 200, d: 14 });
  s.add('shadow', [shadow], { duration: 1000 });
  return [{ sheet: s, info: s.write() }];
}
