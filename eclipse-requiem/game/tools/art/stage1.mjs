// Stage 1 "ASHEN OUTSKIRTS" parallax layers (placeholder art).
// Every layer is its own PNG; horizontally tiling layers wrap seamlessly (elements are drawn at x, x-W and x+W).
import { Bitmap, rng } from './lib/raster.mjs';
import { Sheet, writeImage } from './lib/sheet.mjs';

// ---------------------------------------------------------------- helpers
/** Vertical ordered-dither gradient through [y, token] stops. */
function gradient(b, stops) {
  for (let i = 0; i < stops.length - 1; i++) {
    const [y0, c0] = stops[i], [y1, c1] = stops[i + 1];
    for (let y = y0; y < y1; y++) {
      const lv = Math.round(((y - y0) / (y1 - y0)) * 16);
      for (let x = 0; x < b.w; x++) { b.plot(x, y, c0); if (lv) b.plot(x, y, { c: c1, d: lv }); }
    }
  }
}
/** Draw fn at x, x-W, x+W so tiles wrap. */
const wrap = (W, x, fn) => { fn(x); fn(x - W); fn(x + W); };

/** Smooth 1D value noise, periodic in `period`. */
function noise1(r, period, cell) {
  const n = Math.ceil(period / cell), v = Array.from({ length: n }, () => r());
  return (x) => {
    const p = ((x % period) + period) % period, i = Math.floor(p / cell), f = p / cell - i, s = f * f * (3 - 2 * f);
    return v[i % n] * (1 - s) + v[(i + 1) % n] * s;
  };
}
/** 2D value noise periodic in x. */
function noise2(r, periodX, cell) {
  const nx = Math.ceil(periodX / cell), ny = 64, v = Array.from({ length: nx * ny }, () => r());
  const at = (i, j) => v[(((j % ny) + ny) % ny) * nx + (((i % nx) + nx) % nx)];
  return (x, y) => {
    const fx = x / cell, fy = y / cell, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, w = fy - j;
    const su = u * u * (3 - 2 * u), sw = w * w * (3 - 2 * w);
    const a = at(i, j) * (1 - su) + at(i + 1, j) * su, c = at(i, j + 1) * (1 - su) + at(i + 1, j + 1) * su;
    return a * (1 - sw) + c * sw;
  };
}

/** Dead tree: tapered trunk and recursive branches. */
function tree(b, x, base, h, seed, col, rim) {
  const r = rng(seed);
  const branch = (x0, y0, ang, len, w, depth) => {
    const pts = [[x0, y0]];
    let cx = x0, cy = y0, a = ang;
    const seg = Math.max(3, Math.round(len / 6));
    for (let i = 0; i < seg; i++) {
      a += r.range(-0.22, 0.22);
      cx += Math.cos(a) * (len / seg);
      cy += Math.sin(a) * (len / seg);
      pts.push([cx, cy]);
    }
    b.stroke(pts, w, Math.max(1, w * 0.45), col);
    if (rim && w > 2) for (const [px, py] of pts.slice(1)) b.plot(px + w * 0.35, py, rim);
    if (depth <= 0 || len < 6) return;
    const kids = depth > 2 ? 2 + (r() < 0.4 ? 1 : 0) : 2;
    for (let k = 0; k < kids; k++) {
      const t = 0.45 + r() * 0.5, pi = Math.min(pts.length - 1, Math.floor(t * pts.length));
      const [bx, by] = pts[pi];
      branch(bx, by, a + r.range(0.3, 0.8) * (k % 2 ? 1 : -1) + r.range(-0.15, 0.15), len * r.range(0.5, 0.72), Math.max(1, w * 0.6), depth - 1);
    }
  };
  // roots
  b.poly([[x - h * 0.08, base], [x - 2, base - h * 0.12], [x + 2, base - h * 0.12], [x + h * 0.09, base]], col);
  branch(x, base, -Math.PI / 2 + r.range(-0.18, 0.18), h * 0.55, Math.max(3, h * 0.07), 4);
}

function tombstone(b, x, base, kind, s, body, rim, shade) {
  if (kind === 'cross') {
    b.rect(x - 1, base - 14 * s, 3, 14 * s, body); b.rect(x - 4 * s, base - 11 * s, 9 * s, 2, body);
    b.rect(x + 1, base - 14 * s, 1, 14 * s, rim); b.rect(x - 1, base - 1, 3, 1, shade);
  } else if (kind === 'celtic') {
    b.rect(x - 1, base - 16 * s, 3, 16 * s, body); b.rect(x - 5 * s, base - 12 * s, 11 * s, 2, body);
    b.ellRing(x + 0.5, base - 11 * s, 3.5 * s, 3.5 * s, 1, body); b.rect(x + 1, base - 16 * s, 1, 16 * s, rim);
  } else if (kind === 'obelisk') {
    b.poly([[x - 3 * s, base], [x - 2 * s, base - 18 * s], [x, base - 22 * s], [x + 2 * s, base - 18 * s], [x + 3 * s, base]], body);
    b.line(x + 2 * s, base - 18 * s, x + 3 * s, base - 1, rim);
  } else {
    const w = 8 * s, h = 11 * s;
    b.rect(x - w / 2, base - h + w / 2, w, h - w / 2, body); b.ell(x, base - h + w / 2, w / 2, w / 2, body);
    b.rect(x + w / 2 - 1, base - h + w / 2, 1, h - w / 2, rim); b.rect(x - w / 2, base - h + w / 2, 1, h - w / 2, shade);
    b.rect(x - 1, base - h + 4, 3, 1, shade);
  }
}

/** Small gothic mausoleum: body, steep roof, door, finial cross. */
function mausoleum(b, x, base, w, h, c) {
  const { body, rim, shade, dark } = c;
  b.rect(x, base - h, w, h, body);
  b.poly([[x - 2, base - h], [x + w / 2, base - h - w * 0.7], [x + w + 2, base - h]], body);
  b.line(x + w / 2, base - h - w * 0.7, x + w + 2, base - h, rim);
  b.rect(x + w - 1, base - h, 1, h, rim); b.rect(x, base - h, 2, h, shade);
  const dw = Math.max(4, Math.round(w * 0.32));
  b.rect(x + w / 2 - dw / 2, base - h * 0.55, dw, h * 0.55, dark); b.ell(x + w / 2, base - h * 0.55, dw / 2, dw / 2.2, dark);
  b.rect(x + w / 2 - 1, base - h - w * 0.7 - 7, 2, 7, body); b.rect(x + w / 2 - 3, base - h - w * 0.7 - 5, 6, 2, body);
  b.rect(x - 3, base - 3, w + 6, 3, shade); b.rect(x - 3, base - 3, w + 6, 1, rim);
  // pinnacles
  for (const px of [x, x + w - 3]) { b.rect(px, base - h - 4, 3, 4, body); b.poly([[px, base - h - 4], [px + 1.5, base - h - 9], [px + 3, base - h - 4]], body); }
}

/** Gothic tower with optional spire. */
function tower(b, x, base, w, h, spire, c, r) {
  b.rect(x, base - h, w, h, c.body);
  if (c.rim) b.rect(x + w - 1, base - h, 1, h, c.rim);
  if (spire) {
    b.poly([[x - 1, base - h], [x + w / 2, base - h - spire], [x + w + 1, base - h]], c.body);
    if (c.rim) b.line(x + w / 2, base - h - spire, x + w + 1, base - h, c.rim);
    for (const px of [x - 1, x + w - 2]) b.poly([[px, base - h], [px + 1.5, base - h - Math.min(10, spire * 0.3)], [px + 3, base - h]], c.body);
  } else for (let k = x; k < x + w - 1; k += 4) b.rect(k, base - h - 3, 2, 3, c.body);
  if (c.win) for (let wy = base - h + 8; wy < base - 12; wy += r.int(16, 24)) {
    const wx = x + Math.floor(w / 2) - 1;
    b.rect(wx, wy, 2, 6, c.win); b.plot(wx, wy - 1, c.win);
  }
}

// ---------------------------------------------------------------- layers
function sky() {
  const W = 640, H = 360, b = new Bitmap(W, H), r = rng(11);
  gradient(b, [[0, 'S0'], [70, 'S0'], [140, 'S1'], [200, 'S2'], [250, 'S3'], [300, 'S4'], [360, 'S4']]);
  for (let i = 0; i < 230; i++) {
    const y = Math.floor(Math.pow(r(), 1.7) * 230), x = r.int(0, W - 1);
    b.plot(x, y, r() < 0.12 ? 'M0' : r() < 0.5 ? 'N6' : 'N5');
  }
  for (let i = 0; i < 9; i++) {
    const x = r.int(10, W - 10), y = r.int(8, 120);
    b.plot(x, y, 'M1'); b.plot(x - 1, y, 'N6'); b.plot(x + 1, y, 'N6'); b.plot(x, y - 1, 'N6'); b.plot(x, y + 1, 'N6');
  }
  // faint high cirrus streaks
  for (let i = 0; i < 7; i++) {
    const y = r.int(30, 150), x = r.int(0, W), len = r.int(60, 180);
    for (let k = 0; k < len; k++) if (r() < 0.7) b.plot((x + k) % W, y + Math.round(Math.sin(k / 30) * 2), { c: 'S2', d: 8 });
  }
  return b;
}

function moon() {
  const S = 84, b = new Bitmap(S, S), c = S / 2, R = 22, r = rng(5);
  b.ring(c, c, R + 1, R + 5, { c: 'R1', d: 5 });
  b.ring(c, c, R + 5, R + 10, { c: 'R1', d: 2 });
  b.ring(c, c, R + 10, R + 14, { c: 'R1', d: 1 });
  b.ell(c, c, R, R, 'R1');
  // lit limb (lower left) and terminator
  for (let y = -R; y < R; y++) for (let x = -R; x < R; x++) {
    const d = Math.hypot(x + 0.5, y + 0.5);
    if (d >= R) continue;
    const lit = (-(x + 0.5) * 0.62 + (y + 0.5) * 0.78) / R;
    if (lit > 0.3) b.plot(c + x, c + y, 'R2');
    else if (lit > 0.12) b.plot(c + x, c + y, { c: 'R2', d: 8 });
    if (lit < -0.45) b.plot(c + x, c + y, { c: 'R0', d: 6 });
    if (d > R - 1.6 && lit > 0.2) b.plot(c + x, c + y, 'R3');
  }
  // maria and craters
  const n = noise2(r, 64, 7);
  for (let y = -R; y < R; y++) for (let x = -R; x < R; x++) {
    if (Math.hypot(x + 0.5, y + 0.5) >= R - 1.5) continue;
    const v = n(x + 40, y + 40);
    if (v > 0.66) b.plot(c + x, c + y, { c: 'R0', d: 9 });
    else if (v > 0.58) b.plot(c + x, c + y, { c: 'R0', d: 3 });
  }
  for (const [x, y, s] of [[-9, 7, 2.2], [6, -8, 1.6], [11, 9, 1.2]]) { b.ell(c + x, c + y, s, s, { c: 'R0', d: 10 }); b.plot(c + x + s * 0.7, c + y + s * 0.7, 'R2'); }
  return b;
}

function clouds() {
  // long stratus streaks: stacked flat ellipses, lit top edge, dithered underside
  const W = 1280, H = 110, b = new Bitmap(W, H), r = rng(23);
  const puffs = [];
  for (let i = 0; i < 26; i++) {
    const band = r.pick([26, 34, 58, 66, 90]);
    puffs.push({ x: r.int(0, W), y: band + r.int(-4, 4), rx: r.int(36, 130), ry: r.range(2.5, 6.5), col: band < 40 ? 'S1' : 'S2', top: band < 40 ? 'S2' : 'S3' });
  }
  puffs.sort((p, q) => p.y - q.y);
  for (const p of puffs) wrap(W, p.x, (x) => {
    b.ell(x, p.y, p.rx, p.ry, { c: p.col, d: 10 });
    b.ell(x + p.rx * 0.1, p.y - p.ry * 0.2, p.rx * 0.82, p.ry * 0.7, p.col);
    for (let k = -p.rx * 0.7; k < p.rx * 0.7; k++) {
      const yy = Math.round(p.y - p.ry * 0.2 - p.ry * 0.7 * Math.sqrt(Math.max(0, 1 - (k / (p.rx * 0.82)) ** 2)));
      b.plot(x + p.rx * 0.1 + k, yy, { c: p.top, d: 12 });
    }
    b.rect(x - p.rx * 0.6, p.y + p.ry * 0.5, p.rx * 1.2, 1, { c: p.col, d: 5 });
  });
  return b;
}

function far() {
  const W = 1280, H = 160, b = new Bitmap(W, H), r = rng(31), base = H - 14;
  const C = { body: 'S2', rim: 'S3', win: 'S3' };
  const hill = noise1(r, W, 160);
  for (let x = 0; x < W; x++) { const top = Math.round(base - 6 - hill(x) * 18); for (let y = top; y < H; y++) b.plot(x, y, 'S2'); b.plot(x, top, 'S3'); }
  // houses and small spires
  let x = 0;
  while (x < W) {
    const w = r.int(12, 26), h = r.int(14, 34), top = base - h, kind = r();
    wrap(W, x, (xx) => {
      b.rect(xx, top, w, h + 10, C.body);
      if (kind < 0.55) { b.poly([[xx - 1, top], [xx + w / 2, top - w * 0.6], [xx + w + 1, top]], C.body); b.line(xx + w / 2, top - w * 0.6, xx + w + 1, top, C.rim); }
      b.rect(xx + w - 1, top, 1, h, C.rim);
      if (r() < 0.5) b.rect(xx + 3, top + 5, 2, 3, C.win);
    });
    if (r() < 0.22) { const tw = r.int(6, 9), th = r.int(40, 64); wrap(W, x + w - tw, (xx) => tower(b, xx, base, tw, th, r.int(14, 30), C, r)); }
    x += w + r.int(-2, 6);
  }
  // cathedral (twin towers, nave, rose window)
  wrap(W, 360, (cx) => {
    b.rect(cx, base - 58, 150, 58, C.body);
    b.poly([[cx + 26, base - 58], [cx + 80, base - 92], [cx + 134, base - 58]], C.body);
    b.line(cx + 80, base - 92, cx + 134, base - 58, C.rim);
    tower(b, cx, base, 26, 98, 46, C, r); tower(b, cx + 124, base, 26, 98, 46, C, r);
    b.ellRing(cx + 80, base - 52, 10, 10, 2, 'S3'); b.line(cx + 70, base - 52, cx + 90, base - 52, 'S3'); b.line(cx + 80, base - 62, cx + 80, base - 42, 'S3');
    for (let k = 0; k < 5; k++) { const bx = cx + 30 + k * 22; b.rect(bx, base - 30, 3, 20, 'S3'); b.plot(bx + 1, base - 31, 'S3'); }
    for (const fx of [cx + 150, cx + 172]) { b.rect(fx, base - 40, 5, 40, C.body); b.poly([[fx - 1, base - 40], [fx + 2.5, base - 50], [fx + 6, base - 40]], C.body); }
    for (const [ax, ay] of [[cx + 155, base - 34], [cx + 177, base - 28]]) b.ellRing(ax - 6, ay + 4, 8, 6, 2, C.body);
  });
  // broken abbey tower
  wrap(W, 980, (cx) => {
    b.rect(cx, base - 84, 30, 84, C.body); b.rect(cx + 29, base - 84, 1, 84, C.rim);
    b.poly([[cx, base - 84], [cx + 8, base - 96], [cx + 14, base - 88], [cx + 22, base - 102], [cx + 30, base - 84]], C.body);
    b.rect(cx + 9, base - 70, 4, 16, 'S3'); b.rect(cx + 17, base - 70, 4, 16, 'S3');
  });
  // atmospheric haze toward the base
  for (let y = base - 20; y < H; y++) for (let xx = 0; xx < W; xx++) b.plot(xx, y, { c: 'S3', d: Math.min(6, Math.round((y - (base - 20)) / 5)) });
  return b;
}

const MID = { body: 'T2', rim: 'T4', shade: 'T1', dark: 'N0' };

function midCemetery() {
  const W = 960, H = 200, b = new Bitmap(W, H), r = rng(41);
  const hill = noise1(r, W, 220), ground = (x) => Math.round(150 - hill(x) * 36);
  for (let x = 0; x < W; x++) { const g = ground(x); for (let y = g; y < H; y++) b.plot(x, y, 'T1'); b.plot(x, g, 'T3'); b.plot(x, g + 1, { c: 'T2', d: 8 }); }
  const trees = [[120, 118, 7], [610, 132, 19], [860, 96, 23]];
  for (const [tx, h, s] of trees) wrap(W, tx, (x) => tree(b, x, ground(tx) + 2, h, s, 'N1', 'T2'));
  const maus = [[230, 34, 46], [420, 44, 58], [720, 30, 40]];
  for (const [mx, w, h] of maus) wrap(W, mx, (x) => mausoleum(b, x, ground(mx + w / 2) + 3, w, h, MID));
  // angel statue on a plinth
  wrap(W, 520, (x) => {
    const g = ground(520);
    b.rect(x - 5, g - 14, 10, 14, 'T2'); b.rect(x - 6, g - 15, 12, 2, 'T3');
    b.poly([[x - 2, g - 15], [x + 2, g - 15], [x + 3, g - 34], [x - 1, g - 36], [x - 3, g - 32]], 'T2');
    b.ell(x, g - 38, 2.5, 2.5, 'T2');
    b.poly([[x + 1, g - 33], [x + 12, g - 46], [x + 9, g - 30]], 'T2'); b.poly([[x - 1, g - 33], [x - 10, g - 44], [x - 7, g - 29]], 'T2');
    b.line(x + 12, g - 46, x + 9, g - 30, 'T4');
  });
  for (let i = 0; i < 46; i++) {
    const tx = r.int(0, W - 1), kind = r.pick(['slab', 'cross', 'slab', 'celtic', 'obelisk']);
    wrap(W, tx, (x) => tombstone(b, x, ground(tx) + 2, kind, r() < 0.3 ? 2 : 1, 'T2', 'T4', 'T1'));
  }
  // iron fence along the slope
  for (let x = 0; x < W; x += 5) { const g = ground(x); if (Math.sin(x / 70) > 0.2) { b.rect(x, g - 9, 1, 9, 'N1'); b.plot(x, g - 10, 'N2'); } }
  for (let x = 0; x < W; x++) if (Math.sin(x / 70) > 0.2) b.plot(x, ground(x) - 6, 'N1');
  // low mist over the base
  for (let y = H - 40; y < H; y++) for (let x = 0; x < W; x++) b.plot(x, y, { c: 'S2', d: Math.min(5, Math.round((y - (H - 40)) / 8)) });
  return b;
}

function midRavine() {
  const W = 960, H = 200, b = new Bitmap(W, H), r = rng(43);
  const deck = 92;
  // distant viaduct with tall arches, broken in two places
  const gaps = [[300, 360], [700, 740]];
  const broken = (x) => gaps.some(([a, c]) => x > a && x < c);
  for (let x = 0; x < W; x++) if (!broken(x)) { b.rect(x, deck, 1, 8, 'T2'); b.plot(x, deck, 'T4'); }
  for (let px = 20; px < W; px += 56) {
    if (broken(px) || broken(px + 10)) continue;
    b.rect(px, deck + 8, 12, H - deck, 'T2'); b.rect(px + 11, deck + 8, 1, H - deck, 'T4'); b.rect(px, deck + 8, 2, H - deck, 'T1');
    if (!broken(px + 40)) {
      for (let y = deck + 8; y < deck + 34; y++) {
        const k = (y - deck - 8) / 26, half = 22 * Math.sqrt(Math.max(0, 1 - (1 - k) * (1 - k)));
        b.rect(px + 12, y, 22 - half, 1, 'T2'); b.rect(px + 56 - 22 + half, y, 22 - half, 1, 'T2');
      }
    }
  }
  for (let x = 0; x < W; x += 4) if (!broken(x)) { b.rect(x, deck - 6, 1, 6, 'T2'); }
  for (let x = 0; x < W; x++) if (!broken(x)) b.plot(x, deck - 6, 'T3');
  // broken ends: jagged masonry and falling stones
  for (const [a, c] of gaps) {
    b.poly([[a - 6, deck - 6], [a, deck - 10], [a + 3, deck + 4], [a - 2, deck + 18], [a - 8, deck + 10]], 'T2');
    b.poly([[c + 6, deck - 6], [c, deck - 12], [c - 4, deck + 6], [c + 2, deck + 16], [c + 8, deck + 8]], 'T2');
    for (let k = 0; k < 6; k++) b.rect(r.int(a, c), r.int(deck + 14, H - 20), r.int(2, 4), r.int(2, 3), 'T2');
  }
  // cliffs at the bottom
  const cliff = noise1(r, W, 90);
  for (let x = 0; x < W; x++) { const t = Math.round(H - 30 - cliff(x) * 30); for (let y = t; y < H; y++) b.plot(x, y, 'T1'); b.plot(x, t, 'T3'); }
  for (let y = H - 50; y < H; y++) for (let x = 0; x < W; x++) b.plot(x, y, { c: 'S2', d: Math.min(6, Math.round((y - (H - 50)) / 8)) });
  return b;
}

function midRuins() {
  const W = 960, H = 200, b = new Bitmap(W, H), r = rng(47);
  const g = 160;
  b.rect(0, g, W, H - g, 'T1'); b.rect(0, g, W, 1, 'T3');
  for (let x = 10; x < W; x += r.int(60, 110)) {
    const h = r.int(30, 90), w = r.int(24, 50);
    wrap(W, x, (xx) => {
      b.rect(xx, g - h, w, h, 'T2'); b.rect(xx + w - 1, g - h, 1, h, 'T4'); b.rect(xx, g - h, 2, h, 'T1');
      // ragged broken top
      for (let k = 0; k < w; k += 3) b.rect(xx + k, g - h - r.int(0, 8), 3, 8, 'T2');
      // pointed window opening
      if (w > 30) { b.rect(xx + w / 2 - 4, g - h + 14, 8, 22, 'N1'); b.poly([[xx + w / 2 - 4, g - h + 14], [xx + w / 2, g - h + 6], [xx + w / 2 + 4, g - h + 14]], 'N1'); }
    });
  }
  for (let i = 0; i < 30; i++) { const x = r.int(0, W - 4); b.rect(x, g - r.int(2, 6), r.int(3, 7), 6, 'T2'); b.plot(x + 2, g - 6, 'T4'); }
  for (let y = H - 40; y < H; y++) for (let x = 0; x < W; x++) b.plot(x, y, { c: 'S2', d: Math.min(5, Math.round((y - (H - 40)) / 8)) });
  return b;
}

const NEAR = { body: 'T1', rim: 'T3', shade: 'T0', dark: 'N0' };

function nearWall() {
  const W = 640, H = 170, b = new Bitmap(W, H), r = rng(53), top = H - 34;
  for (const [tx, h, s] of [[70, 150, 61], [330, 120, 67], [520, 160, 71]]) wrap(W, tx, (x) => tree(b, x, top + 6, h, s, 'N0', 'T1'));
  // wall with pillars and urns, stone courses
  b.rect(0, top, W, H - top, 'T1');
  b.rect(0, top, W, 2, 'T3'); b.rect(0, top + 2, W, 1, 'T2');
  for (let y = top + 8; y < H; y += 7) { b.rect(0, y, W, 1, 'T0'); for (let x = (y / 7) % 2 ? 0 : 7; x < W; x += 14) b.rect(x, y - 6, 1, 6, 'T0'); }
  b.speckle(r, 'T1', ['T2'], 0.03, [1, 2]);
  for (let px = 40; px < W; px += 96) {
    b.rect(px, top - 14, 12, H - top + 14, 'T1'); b.rect(px + 11, top - 14, 1, H - top + 14, 'T3'); b.rect(px - 1, top - 16, 14, 3, 'T2'); b.rect(px - 1, top - 16, 14, 1, 'T3');
    b.ell(px + 6, top - 20, 4, 3, 'T1'); b.rect(px + 5, top - 25, 2, 3, 'T1'); b.plot(px + 9, top - 21, 'T3');
  }
  // iron gate
  const gx = 230;
  b.rect(gx, top - 10, 50, H - top + 10, 'N0');
  for (let x = gx + 2; x < gx + 50; x += 4) { b.rect(x, top - 26, 1, 30, 'N2'); b.plot(x, top - 27, 'N3'); }
  b.ellRing(gx + 25, top - 10, 24, 14, 1, 'N2'); b.rect(gx, top - 2, 50, 1, 'N2');
  // leaning tombstones in front of the wall
  for (let i = 0; i < 10; i++) { const x = r.int(0, W); wrap(W, x, (xx) => tombstone(b, xx, H, r.pick(['slab', 'cross', 'slab']), 2, 'T1', 'T3', 'T0')); }
  return b;
}

function nearBridge() {
  const W = 640, H = 170, b = new Bitmap(W, H), r = rng(59), deck = 96;
  // arches under the deck
  b.rect(0, deck, W, H - deck, 'T1');
  for (let ax = 0; ax < W; ax += 160) {
    const cx = ax + 80;
    for (let y = deck + 18; y < H; y++) {
      const k = (y - deck - 18) / 40, half = k < 1 ? 56 * Math.sqrt(1 - (1 - k) * (1 - k)) : 56;
      b.rect(cx - half, y, half * 2, 1, 'N0');
    }
    for (let a = 0; a < Math.PI; a += 0.02) { const x = cx + Math.cos(a) * 60, y = deck + 58 - Math.sin(a) * 42; b.plot(x, y, 'T3'); }
    b.rect(ax - 4, deck + 18, 8, H - deck - 18, 'T1'); b.rect(ax + 3, deck + 18, 1, H - deck - 18, 'T3');
  }
  for (let y = deck + 4; y < deck + 16; y += 4) b.rect(0, y, W, 1, 'T0');
  b.rect(0, deck, W, 3, 'T3'); b.rect(0, deck + 3, W, 1, 'T2');
  // balustrade (broken in places)
  const broken = (x) => (x > 250 && x < 300) || (x > 520 && x < 548);
  for (let x = 0; x < W; x += 8) if (!broken(x)) { b.rect(x + 2, deck - 14, 4, 14, 'T1'); b.ell(x + 4, deck - 9, 2.5, 3, 'T1'); b.plot(x + 5, deck - 12, 'T3'); }
  for (let x = 0; x < W; x++) if (!broken(x)) { b.plot(x, deck - 16, 'T3'); b.plot(x, deck - 15, 'T1'); b.plot(x, deck - 14, 'T1'); }
  for (const x0 of [250, 520]) for (let k = 0; k < 7; k++) b.rect(x0 + r.int(0, 40), deck - r.int(2, 8), r.int(3, 6), r.int(2, 4), 'T1');
  // lamp posts (unlit)
  for (const lx of [120, 440]) { b.rect(lx, deck - 52, 2, 52, 'N1'); b.rect(lx - 4, deck - 58, 10, 6, 'N1'); b.rect(lx - 2, deck - 56, 6, 3, 'N3'); b.plot(lx + 1, deck - 61, 'N1'); }
  b.speckle(r, 'T1', ['T2'], 0.02, [1, 2]);
  return b;
}

function nearRuins() {
  const W = 640, H = 170, b = new Bitmap(W, H), r = rng(61), g = H - 20;
  b.rect(0, g, W, H - g, 'T1'); b.rect(0, g, W, 1, 'T3');
  for (const [x, h] of [[60, 110], [250, 70], [430, 130], [590, 90]]) wrap(W, x, (xx) => {
    b.rect(xx, g - h, 14, h, 'T1'); b.rect(xx + 13, g - h, 1, h, 'T3'); b.rect(xx - 2, g - h + 6, 18, 3, 'T1');
    for (let k = 0; k < 14; k += 2) b.rect(xx + k, g - h - r.int(0, 6), 2, 6, 'T1');
    for (let y = g - h + 14; y < g; y += 9) b.rect(xx, y, 14, 1, 'T0');
  });
  // fallen arch
  wrap(W, 300, (xx) => { for (let a = 0; a < Math.PI; a += 0.01) { const x = xx + 50 + Math.cos(a) * 46, y = g + 10 - Math.sin(a) * 30; b.rect(x - 2, y - 2, 4, 6, 'T1'); } });
  for (let i = 0; i < 40; i++) { const x = r.int(0, W - 6), s = r.int(3, 9); b.rect(x, g - s + 2, s + 2, s, 'T1'); b.rect(x, g - s + 2, s + 2, 1, 'T3'); }
  return b;
}

function ground(kind) {
  const W = 640, H = 44, b = new Bitmap(W, H), r = rng(kind === 'graves' ? 71 : kind === 'bridge' ? 73 : 79), top = 10;
  b.rect(0, top, W, H - top, 'T1');
  if (kind === 'bridge') {
    for (let y = top + 2; y < H; y += 6) { b.rect(0, y, W, 1, 'T0'); for (let x = (y / 6) % 2 ? 3 : 11; x < W; x += 16) b.rect(x, y - 5, 1, 5, 'T0'); }
    b.speckle(r, 'T1', ['T2', 'T2', 'T3'], 0.05, [1, 2]);
    b.rect(0, top, W, 2, 'T4'); b.rect(0, top + 2, W, 1, 'T2');
  } else {
    const hump = noise1(r, W, 40);
    for (let x = 0; x < W; x++) { const t = Math.round(top - hump(x) * 4); for (let y = t; y < top; y++) b.plot(x, y, 'T1'); b.plot(x, t, 'T3'); }
    b.speckle(r, 'T1', ['T2', 'T0'], 0.06, [1, 3]);
    // dead grass tufts
    for (let i = 0; i < 90; i++) { const x = r.int(0, W - 1), h = r.int(2, 6); for (let k = 0; k < h; k++) b.plot(x + (k > h / 2 ? r.int(-1, 1) : 0), top - k + 1, r() < 0.5 ? 'N2' : 'T2'); }
    if (kind === 'graves') {
      for (let i = 0; i < 10; i++) { const x = r.int(4, W - 8); tombstone(b, x, top + 12, r.pick(['slab', 'cross']), 1, 'T2', 'T4', 'T1'); }
      for (let i = 0; i < 5; i++) { const x = r.int(4, W - 8), y = r.int(top + 6, H - 6); b.ell(x, y, 2.5, 2, 'B1'); b.plot(x - 1, y, 'N1'); b.plot(x + 1, y, 'N1'); b.plot(x, y - 1, 'B2'); }
    } else {
      for (let i = 0; i < 26; i++) { const x = r.int(0, W - 8), s = r.int(3, 8); b.rect(x, top - s + 4, s + 3, s, 'T2'); b.rect(x, top - s + 4, s + 3, 1, 'T4'); b.rect(x, top - s + 4, 1, s, 'T1'); }
      for (let i = 0; i < 6; i++) { const x = r.int(0, W - 12), y = r.int(top + 4, H - 8); b.poly([[x, y + 6], [x + 4, y], [x + 10, y + 2], [x + 8, y + 7]], 'Z2'); b.line(x + 4, y, x + 10, y + 2, 'Z4'); }
    }
  }
  return b;
}

function foreTop() {
  const W = 960, H = 64, b = new Bitmap(W, H), r = rng(83);
  const branch = (x, y, ang, len, w) => {
    let cx = x, cy = y, a = ang;
    const pts = [[cx, cy]];
    for (let i = 0; i < len; i += 3) { a += r.range(-0.25, 0.25); cx += Math.cos(a) * 3; cy += Math.sin(a) * 3; pts.push([cx, cy]); }
    b.stroke(pts, w, 1, 'N0');
    if (len > 12) for (let k = 0; k < 2; k++) { const p = pts[Math.floor(pts.length * r.range(0.3, 0.8))]; branch(p[0], p[1], a + r.range(-0.9, 0.9), len * 0.5, Math.max(1, w - 1)); }
  };
  wrap(W, 40, (x) => { branch(x - 30, -2, 0.55, 90, 4); branch(x - 10, -2, 1.0, 50, 3); });
  wrap(W, 560, (x) => { branch(x + 60, -2, 2.4, 70, 3); });
  // hanging chain
  wrap(W, 700, (x) => { for (let y = 0; y < 44; y += 3) { b.ellRing(x + 0.5, y + 1.5, 1.5, 2, 1, 'N0'); } b.rect(x - 3, 44, 7, 6, 'N0'); });
  return b;
}

function foreBottom() {
  const W = 960, H = 34, b = new Bitmap(W, H), r = rng(89);
  for (const [x0, len] of [[120, 120], [600, 90]]) wrap(W, x0, (x) => {
    for (let k = 0; k < len; k += 6) { b.rect(x + k, H - 26, 2, 26, 'N0'); b.poly([[x + k - 1, H - 26], [x + k + 1, H - 31], [x + k + 3, H - 26]], 'N0'); }
    b.rect(x - 2, H - 18, len + 2, 2, 'N0'); b.rect(x - 2, H - 8, len + 2, 2, 'N0');
  });
  for (let i = 0; i < 60; i++) { const x = r.int(0, W - 1); if ((x > 100 && x < 260) || (x > 580 && x < 700)) continue; const h = r.int(4, 14); b.stroke([[x, H], [x + r.int(-3, 3), H - h]], 2, 1, 'N0'); }
  return b;
}

function fog(seed) {
  const W = 640, H = 128, b = new Bitmap(W, H), r = rng(seed), n = noise2(r, W, 38), n2 = noise2(r, W, 13);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = Math.sin((y / H) * Math.PI);
    const v = (n(x, y * 1.6) * 0.75 + n2(x, y * 2) * 0.25) * edge;
    if (v > 0.52) b.plot(x, y, { c: 'N0', a: 205 });
    else if (v > 0.42) b.plot(x, y, { c: 'N0', a: 140 });
    else if (v > 0.33) { if (((x + y) & 1) === 0) b.plot(x, y, { c: 'N0', a: 140 }); }
    else if (v > 0.27) { if ((x & 1) === 0 && (y & 1) === 0) b.plot(x, y, { c: 'N0', a: 110 }); }
  }
  return b;
}

function belfry(stage) {
  const W = 232, H = 300, b = new Bitmap(W, H), r = rng(97), x0 = 56, tw = 112, base = H - 6;
  const top = stage === 'broken' ? 70 : 40;
  // buttresses
  for (const bx of [x0 - 14, x0 + tw + 2]) { b.poly([[bx, base], [bx + 6, top + 60], [bx + 12, top + 60], [bx + 12, base]], 'T2'); b.line(bx + 12, top + 60, bx + 12, base, 'T4'); }
  b.rect(x0, top, tw, base - top, 'T2');
  b.rect(x0 + tw - 3, top, 3, base - top, 'T3'); b.rect(x0 + tw - 1, top, 1, base - top, 'T4'); b.rect(x0, top, 4, base - top, 'T1');
  for (let y = top + 30; y < base; y += 40) { b.rect(x0 - 2, y, tw + 4, 3, 'T3'); b.rect(x0 - 2, y, tw + 4, 1, 'T4'); }
  // stone blocks
  for (let y = top + 4; y < base; y += 8) for (let x = x0 + ((y / 8) % 2 ? 6 : 14); x < x0 + tw - 4; x += 16) b.rect(x, y, 1, 7, 'T1');
  b.speckle(r, 'T2', ['T3', 'T1'], 0.035, [1, 2]);
  // empty belfry arches (sky shows through)
  for (const ax of [x0 + 14, x0 + 62]) {
    const aw = 36, ay = top + 40;
    b.rect(ax, ay, aw, 70, 'S2'); b.ell(ax + aw / 2, ay, aw / 2, 20, 'S2');
    b.rect(ax, ay, aw, 70, { c: 'S1', d: 8 });
    b.rect(ax + aw / 2 - 1, ay - 12, 2, 82, 'T2'); b.rect(ax, ay + 40, aw, 2, 'T2');
    b.rect(ax - 2, ay + 70, aw + 4, 4, 'T3'); b.rect(ax - 2, ay + 70, aw + 4, 1, 'T4');
  }
  // door and lower windows
  b.rect(x0 + 44, base - 54, 24, 54, 'N0'); b.ell(x0 + 56, base - 54, 12, 12, 'N0');
  for (const wx of [x0 + 18, x0 + 86]) { b.rect(wx, top + 150, 8, 26, 'N1'); b.poly([[wx, top + 150], [wx + 4, top + 142], [wx + 8, top + 150]], 'N1'); }
  // broken crown: jagged top, missing chunk on the right, crack
  const jag = [[x0 - 4, top], [x0 + 10, top - 14], [x0 + 22, top - 4], [x0 + 34, top - 22], [x0 + 48, top - 8], [x0 + 60, top - 16], [x0 + 74, top - 2], [x0 + 86, top - 10], [x0 + 98, top + 6], [x0 + tw + 4, top + 18], [x0 + tw + 4, top]];
  b.poly([...jag, [x0 + tw + 4, top + 2], [x0 - 4, top + 2]], 'T2');
  for (let i = 0; i < jag.length - 1; i++) b.line(jag[i][0], jag[i][1], jag[i + 1][0], jag[i + 1][1], 'T4');
  b.poly([[x0 + tw - 10, top + 20], [x0 + tw + 4, top + 18], [x0 + tw + 4, top + 70], [x0 + tw - 6, top + 54]], null);
  let cx = x0 + 70, cy = top + 4;
  for (let i = 0; i < 20; i++) { const nx = cx + r.int(-3, 3), ny = cy + r.int(4, 9); b.line(cx, cy, nx, ny, 'N0'); cx = nx; cy = ny; }
  if (stage === 'broken') { cx = x0 + 30; cy = top + 10; for (let i = 0; i < 24; i++) { const nx = cx + r.int(-3, 4), ny = cy + r.int(4, 10); b.line(cx, cy, nx, ny, 'N0'); cx = nx; cy = ny; } }
  // rubble at the base
  for (let i = 0; i < 26; i++) { const x = r.int(x0 - 40, x0 + tw + 40), s = r.int(3, 10); b.rect(x, base - s + 4, s + 2, s, 'T2'); b.rect(x, base - s + 4, s + 2, 1, 'T4'); }
  return b;
}

function skyBolts() {
  const sheet = new Sheet('stage1/bolt', { maxWidth: 256 });
  for (const [tag, core, edge] of [['white', 'M2', 'M0'], ['red', 'R4', 'R2']]) {
    const frames = [0, 1, 2].map((f) => {
      const b = new Bitmap(40, 170), r = rng(101 + f);
      let x = 20, y = 0;
      while (y < 168) {
        const nx = Math.max(4, Math.min(36, x + r.int(-5, 5))), ny = y + r.int(6, 12);
        b.line(x - 1, y, nx - 1, ny, edge); b.line(x + 1, y, nx + 1, ny, edge); b.line(x, y, nx, ny, core);
        if (r() < 0.25) { const bx = nx + r.int(-12, 12); b.line(nx, ny, bx, ny + r.int(8, 18), edge); }
        x = nx; y = ny;
      }
      if (f === 2) b.dissolve(8);
      return b;
    });
    sheet.add(tag, frames, { duration: 40, pivot: [20, 0] });
  }
  return sheet.write();
}

export function buildStage1() {
  const bmps = {
    sky: sky(), moon: moon(), clouds: clouds(), far: far(),
    mid_cemetery: midCemetery(), mid_ravine: midRavine(), mid_ruins: midRuins(),
    near_wall: nearWall(), near_bridge: nearBridge(), near_ruins: nearRuins(),
    ground_graves: ground('graves'), ground_bridge: ground('bridge'), ground_rubble: ground('rubble'),
    fore_top: foreTop(), fore_bottom: foreBottom(), fog_a: fog(91), fog_b: fog(93),
    belfry: belfry('intact'), belfry_broken: belfry('broken'),
  };
  const files = Object.entries(bmps).map(([k, b]) => writeImage('stage1/' + k, b));
  files.push(skyBolts());
  return { files, bmps };
}
