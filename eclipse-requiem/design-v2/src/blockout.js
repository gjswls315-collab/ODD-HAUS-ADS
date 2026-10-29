'use strict';
// Native-resolution blockouts for the Visual Design Bible v2.
// Every figure is drawn at 640x360 (or its own small canvas) on the pixel grid: polygons and ellipses are
// scan-converted at pixel centres with no anti-aliasing, text uses bitmap fonts, and only palette tokens are used.
// These are value/composition/size studies, not final art.
(function () {
  const ER = (window.ER = window.ER || {});
  const PAL = (ER.PAL = {});
  ER.loadPalette = (json) => {
    for (const r of json.ramps) r.colors.forEach((h, i) => (PAL[r.id + i] = h));
  };

  const W = 640, H = 360;
  const GUIDE = '#39F0FF';
  const DEG = Math.PI / 180;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  // ---------- dither patterns (aligned to canvas origin so parity matches across shapes) ----------
  const patCache = new Map();
  const PATS = {
    50: [[0, 0], [1, 1], [2, 2], [3, 3], [2, 0], [0, 2], [3, 1], [1, 3]],
    '50b': [[1, 0], [0, 1], [3, 0], [2, 1], [1, 2], [0, 3], [3, 2], [2, 3]],
    25: [[0, 0], [2, 0], [0, 2], [2, 2]],
    12: [[0, 0], [2, 2]],
    h2: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 2], [1, 2], [2, 2], [3, 2]],
    hatch: [[0, 0], [1, 1], [2, 2], [3, 3]],
  };

  class Px {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.c = document.createElement('canvas');
      this.c.width = w;
      this.c.height = h;
      this.g = this.c.getContext('2d', { willReadFrequently: true });
      this.g.imageSmoothingEnabled = false;
    }
    fs(c) {
      if (typeof c === 'object') {
        const key = c.p + '|' + c.c;
        if (!patCache.has(key)) {
          const t = document.createElement('canvas');
          t.width = t.height = 4;
          const tg = t.getContext('2d');
          tg.fillStyle = PAL[c.c] || c.c;
          for (const [x, y] of PATS[c.p]) tg.fillRect(x, y, 1, 1);
          patCache.set(key, t);
        }
        return this.g.createPattern(patCache.get(key), 'repeat');
      }
      return PAL[c] || c;
    }
    rect(x, y, w, h, c) {
      if (w <= 0 || h <= 0) return;
      this.g.fillStyle = this.fs(c);
      this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    dot(x, y, c) {
      this.rect(x, y, 1, 1, c);
    }
    box(x, y, w, h, c) {
      this.rect(x, y, w, 1, c);
      this.rect(x, y + h - 1, w, 1, c);
      this.rect(x, y, 1, h, c);
      this.rect(x + w - 1, y, 1, h, c);
    }
    poly(pts, c) {
      let y0 = Infinity, y1 = -Infinity;
      for (const p of pts) {
        y0 = Math.min(y0, p[1]);
        y1 = Math.max(y1, p[1]);
      }
      this.g.fillStyle = this.fs(c);
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
        const sy = y + 0.5, xs = [];
        for (let i = 0, n = pts.length; i < n; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n];
          if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const a = Math.round(xs[k]), b = Math.round(xs[k + 1]);
          if (b > a) this.g.fillRect(a, y, b - a, 1);
        }
      }
    }
    ell(cx, cy, rx, ry, c) {
      this.g.fillStyle = this.fs(c);
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        const dy = (y + 0.5 - cy) / ry;
        if (Math.abs(dy) >= 1) continue;
        const hw = rx * Math.sqrt(1 - dy * dy);
        const a = Math.round(cx - hw), b = Math.round(cx + hw);
        if (b > a) this.g.fillRect(a, y, b - a, 1);
      }
    }
    ellRing(cx, cy, rx, ry, t, c) {
      this.g.fillStyle = this.fs(c);
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        const dy = (y + 0.5 - cy) / ry;
        if (Math.abs(dy) >= 1) continue;
        const hw = rx * Math.sqrt(1 - dy * dy);
        const a = Math.round(cx - hw), b = Math.round(cx + hw);
        const idy = (y + 0.5 - cy) / (ry - t);
        if (ry - t > 0 && Math.abs(idy) < 1) {
          const ihw = (rx - t) * Math.sqrt(1 - idy * idy);
          const ia = Math.round(cx - ihw), ib = Math.round(cx + ihw);
          if (ia > a) this.g.fillRect(a, y, ia - a, 1);
          if (b > ib) this.g.fillRect(ib, y, b - ib, 1);
        } else if (b > a) this.g.fillRect(a, y, b - a, 1);
      }
    }
    ring(cx, cy, r0, r1, c, filter) {
      this.g.fillStyle = this.fs(c);
      for (let y = Math.floor(cy - r1); y <= Math.ceil(cy + r1); y++)
        for (let x = Math.floor(cx - r1); x <= Math.ceil(cx + r1); x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          if (d >= r0 && d < r1 && (!filter || filter(x + 0.5 - cx, y + 0.5 - cy))) this.g.fillRect(x, y, 1, 1);
        }
    }
    line(x0, y0, x1, y1, c, step = 1) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy, i = 0;
      this.g.fillStyle = this.fs(c);
      for (;;) {
        if (i++ % step === 0) this.g.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    bar(x0, y0, x1, y1, w, c) {
      const a = Math.atan2(y1 - y0, x1 - x0), nx = (-Math.sin(a) * w) / 2, ny = (Math.cos(a) * w) / 2;
      this.poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], c);
    }
    blit(src, x, y, alpha = 1) {
      this.g.globalAlpha = alpha;
      this.g.drawImage(src.c || src, Math.round(x), Math.round(y));
      this.g.globalAlpha = 1;
    }
    alpha(a, fn) {
      this.g.globalAlpha = a;
      fn();
      this.g.globalAlpha = 1;
    }
    erase(pts) {
      this.g.globalCompositeOperation = 'destination-out';
      this.poly(pts, '#000');
      this.g.globalCompositeOperation = 'source-over';
    }
    // Highlight the lit (right / top) edge pixels of the shape.
    rim(col, sides = 'rt') {
      const { w, h } = this, d = this.g.getImageData(0, 0, w, h).data;
      const A = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? d[(y * w + x) * 4 + 3] : 0);
      this.g.fillStyle = this.fs(col);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (!A(x, y)) continue;
          if ((sides.includes('r') && !A(x + 1, y)) || (sides.includes('t') && !A(x, y - 1) && A(x + 1, y - 1) === 0)) this.g.fillRect(x, y, 1, 1);
        }
    }
    // Selective outline: N0 on the shadow side (left / bottom), a darkened local colour on the lit side (right / top).
    selout() {
      const { w, h } = this, img = this.g.getImageData(0, 0, w, h), d = img.data, out = new Uint8ClampedArray(d);
      const A = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? d[(y * w + x) * 4 + 3] : 0);
      const n0 = hexRgb(PAL.N0);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (A(x, y)) continue;
          const i = (y * w + x) * 4;
          let lit = -1, shade = false;
          if (A(x + 1, y) || A(x, y - 1)) shade = true;
          if (A(x - 1, y)) lit = (y * w + x - 1) * 4;
          else if (A(x, y + 1)) lit = ((y + 1) * w + x) * 4;
          if (shade) { out[i] = n0[0]; out[i + 1] = n0[1]; out[i + 2] = n0[2]; out[i + 3] = 255; }
          else if (lit >= 0) { out[i] = d[lit] * 0.42; out[i + 1] = d[lit + 1] * 0.42; out[i + 2] = d[lit + 2] * 0.46; out[i + 3] = 255; }
        }
      img.data.set(out);
      this.g.putImageData(img, 0, 0);
      return this;
    }
    // Silhouette copy (every opaque pixel -> one colour).
    silhouette(col) {
      const s = new Px(this.w, this.h);
      s.g.drawImage(this.c, 0, 0);
      s.g.globalCompositeOperation = 'source-in';
      s.g.fillStyle = PAL[col] || col;
      s.g.fillRect(0, 0, this.w, this.h);
      return s;
    }
    // Map every pixel to the Ash ramp by luminance (game-over palette swap).
    toAsh() {
      const img = this.g.getImageData(0, 0, this.w, this.h), d = img.data;
      const ramp = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => hexRgb(PAL['N' + i]));
      const lum = ramp.map(([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b);
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        let best = 0;
        for (let k = 1; k < lum.length; k++) if (Math.abs(lum[k] - l) < Math.abs(lum[best] - l)) best = k;
        [d[i], d[i + 1], d[i + 2]] = ramp[best];
      }
      this.g.putImageData(img, 0, 0);
    }
    // 5x7 bitmap font (same glyph set as the game HUD font).
    t5(str, x, y, c, o = {}) {
      str = String(str).replace(/[a-wyz]/g, (c) => c.toUpperCase());
      const w = t5w(str);
      if (o.align === 'right') x -= w;
      else if (o.align === 'center') x -= Math.floor(w / 2);
      if (o.outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) this.t5raw(str, x + ox, y + oy, o.outline);
      this.t5raw(str, x, y, c);
      return w;
    }
    t5raw(str, x, y, c) {
      this.g.fillStyle = this.fs(c);
      let cx = x;
      for (const ch of str) {
        if (ch === ' ') { cx += 4; continue; }
        const gl = GLYPHS[ch];
        if (gl) for (let i = 0; i < 35; i++) if (gl[i]) this.g.fillRect(cx + (i % 5), y + ((i / 5) | 0), 1, 1);
        cx += 6;
      }
    }
    // Galmuri bitmap text (thresholded at its native pixel size).
    tg(str, x, y, c, o = {}) {
      const m = gmask(str, o.f || 'G11');
      if (o.align === 'right') x -= m.w;
      else if (o.align === 'center') x -= Math.floor(m.w / 2);
      if (o.outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) this.g.drawImage(tint(m, o.outline), x + ox, y + oy);
      this.g.drawImage(tint(m, c), x, y);
      return m.w;
    }
  }
  ER.Px = Px;

  // ---------- fonts ----------
  const G5 = {
    A: '.###. #...# #...# ##### #...# #...# #...#', B: '####. #...# #...# ####. #...# #...# ####.', C: '.###. #...# #.... #.... #.... #...# .###.',
    D: '####. #...# #...# #...# #...# #...# ####.', E: '##### #.... #.... ####. #.... #.... #####', F: '##### #.... #.... ####. #.... #.... #....',
    G: '.###. #...# #.... #.### #...# #...# .###.', H: '#...# #...# #...# ##### #...# #...# #...#', I: '.###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.',
    J: '..### ...#. ...#. ...#. ...#. #..#. .##..', K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#', L: '#.... #.... #.... #.... #.... #.... #####',
    M: '#...# ##.## #.#.# #.#.# #...# #...# #...#', N: '#...# #...# ##..# #.#.# #..## #...# #...#', O: '.###. #...# #...# #...# #...# #...# .###.',
    P: '####. #...# #...# ####. #.... #.... #....', Q: '.###. #...# #...# #...# #.#.# #..#. .##.#', R: '####. #...# #...# ####. #.#.. #..#. #...#',
    S: '.#### #.... #.... .###. ....# ....# ####.', T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..', U: '#...# #...# #...# #...# #...# #...# .###.',
    V: '#...# #...# #...# #...# #...# .#.#. ..#..', W: '#...# #...# #...# #.#.# #.#.# #.#.# .#.#.', X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
    Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..', Z: '##### ....# ...#. ..#.. .#... #.... #####',
    0: '.###. #...# #..## #.#.# ##..# #...# .###.', 1: '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.', 2: '.###. #...# ....# ...#. ..#.. .#... #####',
    3: '####. ....# ....# .###. ....# ....# ####.', 4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.', 5: '##### #.... ####. ....# ....# #...# .###.',
    6: '..##. .#... #.... ####. #...# #...# .###.', 7: '##### ....# ...#. ..#.. .#... .#... .#...', 8: '.###. #...# #...# .###. #...# #...# .###.',
    9: '.###. #...# #...# .#### ....# ...#. .##..', '.': '..... ..... ..... ..... ..... .##.. .##..', ':': '..... .##.. .##.. ..... .##.. .##.. .....',
    '/': '....# ...#. ...#. ..#.. .#... .#... #....', '-': '..... ..... ..... ##### ..... ..... .....', '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....',
    x: '..... ..... #...# .#.#. ..#.. .#.#. #...#', '%': '##..# ##..# ...#. ..#.. .#... #..## #..##', '·': '..... ..... ..... ..#.. ..... ..... .....',
    '<': '...#. ..#.. .#... #.... .#... ..#.. ...#.', '>': '.#... ..#.. ...#. ....# ...#. ..#.. .#...', '(': '...#. ..#.. .#... .#... .#... ..#.. ...#.',
    ')': '.#... ..#.. ...#. ...#. ...#. ..#.. .#...', '=': '..... ..... ##### ..... ##### ..... .....', '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
  };
  const GLYPHS = {};
  for (const [k, s] of Object.entries(G5)) GLYPHS[k] = s.split(' ').join('').split('').map((ch) => (ch === '#' ? 1 : 0));
  const t5w = (s) => { let w = 0; for (const ch of s) w += ch === ' ' ? 4 : 6; return Math.max(0, w - 1); };
  ER.t5w = t5w;

  // Galmuri11: upem 1200 at 12px, Galmuri9: upem 1000 at 10px -> 1 design pixel = 1 canvas pixel; glyph tops sit `base` px above the baseline.
  const GF = { G11: ['12px Galmuri11', 14, 11], G11B: ['12px Galmuri11B', 14, 11], G9: ['10px Galmuri9', 12, 9] };
  const gCache = new Map(), tCache = new Map();
  const scratch = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function gmask(str, f) {
    const key = f + '|' + str;
    if (gCache.has(key)) return gCache.get(key);
    const [css, h, base] = GF[f];
    scratch.font = css;
    const w = Math.ceil(scratch.measureText(str).width) + 1;
    const c = document.createElement('canvas');
    c.width = Math.max(1, w);
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.font = css;
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#000';
    g.fillText(str, 0, base);
    const d = g.getImageData(0, 0, c.width, h).data, bits = new Uint8Array(c.width * h);
    let maxX = 0;
    for (let i = 0; i < bits.length; i++) if (d[i * 4 + 3] >= 110) { bits[i] = 1; maxX = Math.max(maxX, i % c.width); }
    const m = { key, w: maxX + 1, cw: c.width, h, bits };
    gCache.set(key, m);
    return m;
  }
  function tint(m, col) {
    const key = m.key + '|' + col;
    if (tCache.has(key)) return tCache.get(key);
    const c = document.createElement('canvas');
    c.width = m.cw;
    c.height = m.h;
    const g = c.getContext('2d');
    const img = g.createImageData(m.cw, m.h), [r, gg, b] = hexRgb(PAL[col] || col);
    for (let i = 0; i < m.bits.length; i++) if (m.bits[i]) { img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
    tCache.set(key, c);
    return c;
  }

  // ======================================================================================
  // Sprites (all face right for players, left for enemies; light from the upper right)
  // ======================================================================================
  const spriteCache = new Map();
  const memo = (key, fn) => { if (!spriteCache.has(key)) spriteCache.set(key, fn()); return spriteCache.get(key); };

  const HERO = {
    seraphine: () => memo('ser', () => {
      const s = new Px(48, 32);
      s.poly([[18, 19], [12, 21], [6, 24], [1, 28], [5, 28], [10, 26], [16, 23], [21, 21]], 'B2'); // rear tabard tail
      s.poly([[29, 9], [20, 8], [12, 9], [3, 11], [9, 12], [16, 11], [23, 11], [29, 12]], 'B2'); // veil trailing
      s.ellRing(26.5, 5.5, 3.5, 5.5, 1, 'N7'); // iron halo ring (side view), hole kept open
      s.dot(28, 1, 'G2'); s.dot(29, 2, 'G3'); s.dot(29, 3, 'G3'); s.dot(29, 4, 'G2');
      s.poly([[17, 18], [12, 20], [7, 22], [8, 25], [14, 24], [20, 21]], 'N4'); // greaves
      s.ell(8, 23.5, 2.2, 1.6, 'N3');
      s.poly([[18, 12], [27, 10], [31, 13], [29, 19], [20, 21], [16, 18]], 'B3'); // white surcoat
      s.poly([[16, 18], [20, 21], [25, 20], [20, 16]], 'B2');
      s.line(27, 10, 30, 12, 'B4');
      s.ell(28.5, 13, 3.5, 2.6, 'N5'); s.ell(29.5, 12, 2, 1, 'N7'); // pauldron
      s.poly([[26, 15], [33, 15], [33, 18], [26, 18]], 'N5'); // couching arm
      s.ell(32.5, 8, 3.5, 3.6, 'B2'); s.ell(33, 7.5, 2.8, 2.8, 'B3'); // coif
      s.rect(34, 7, 2, 3, 'B4'); s.dot(35, 8, 'N2'); // face
      s.poly([[22, 16], [41, 13.5], [41, 15.5], [22, 18]], 'N7'); s.line(23, 16, 40, 14, 'N9'); // lance shaft
      s.poly([[29, 13], [33, 15.5], [29, 19]], 'N6'); // vamplate
      s.poly([[41, 12.5], [47, 14.6], [41, 16.6]], 'G2'); s.line(41, 13, 46, 14, 'G3'); s.dot(46, 14, 'G4');
      return s.selout();
    }),
    noctis: () => memo('noc', () => {
      const s = new Px(48, 32);
      s.poly([[25, 12], [17, 6], [8, 1], [2, 1], [5, 4], [11, 8], [19, 12], [24, 14]], 'N3'); // far wing
      s.poly([[33, 12], [22, 11], [12, 12], [3, 11], [9, 13], [20, 14], [32, 14]], 'N6'); // scarf A
      s.poly([[26, 13], [16, 8], [6, 4], [1, 5], [4, 8], [12, 12], [22, 15]], 'N5'); // near wing
      s.line(25, 12, 3, 4, 'N7');
      s.ell(8.5, 7, 2.4, 1.7, 'A1'); s.dot(8, 7, 'A3'); s.dot(9, 7, 'A4');
      s.poly([[24, 16], [14, 19], [5, 22], [3, 24], [8, 24], [16, 21], [24, 18]], 'N4'); // lower wing
      s.dot(8, 23, 'A3');
      s.poly([[22, 17], [14, 18], [9, 19], [14, 21], [23, 19]], 'N2'); // legs
      s.poly([[22, 13], [32, 11], [36, 14], [34, 18], [26, 19], [20, 17]], 'N3'); // coat
      s.poly([[20, 17], [26, 19], [31, 18], [24, 16]], 'N2');
      s.poly([[32, 14], [24, 15], [16, 17], [22, 17], [31, 16]], 'N7'); // scarf B
      s.line(25, 11, 29, 8, 'N8'); s.line(29, 8, 33, 8, 'N8'); // folded scythe
      s.ell(37, 11, 3.6, 3.1, 'N3'); s.rect(38, 11, 3, 2, 'N4'); s.dot(40, 11, 'A4'); // hood + eye
      s.line(36, 8, 31, 3, 'N6'); s.line(37, 8, 34, 2, 'N6'); // feelers
      s.poly([[34, 15], [43, 15], [43, 17], [34, 17]], 'N5'); s.line(42, 12, 43, 20, 'N6'); s.dot(44, 16, 'A3');
      return s.selout();
    }),
    morgana: () => memo('mor', () => {
      const s = new Px(48, 32);
      s.poly([[17, 4], [10, 5], [4, 8], [1, 13], [5, 12], [10, 9], [16, 8]], 'N2'); // mourning veil
      s.line(16, 5, 3, 11, 'N4');
      s.poly([[4, 21], [38, 20], [45, 23], [38, 27], [4, 27], [2, 24]], 'T3'); // coffin body
      s.rect(4, 25, 34, 2, 'T2');
      s.poly([[5, 19], [37, 18], [44, 21.5], [38, 20.5], [4, 21]], 'T4'); s.line(6, 19, 36, 18, 'T5'); // lid
      s.rect(12, 19, 2, 8, 'N6'); s.rect(30, 18, 2, 9, 'N6'); // iron bands
      s.line(10, 28, 8, 30, 'N6', 2); s.line(35, 28, 37, 30, 'N6', 2); // chains
      s.poly([[10, 19], [22, 18], [25, 21], [18, 24], [8, 24]], 'N1'); s.line(11, 19, 21, 18, 'N3'); // skirt
      s.poly([[13, 10], [20, 9], [22, 18], [12, 19]], 'N2');
      s.ell(19, 7, 3.1, 3.1, 'N1'); s.rect(20, 6, 2, 3, 'B4'); s.dot(21, 9, 'V2'); // head, face, green uplight
      s.poly([[19, 12], [25, 13], [25, 15], [19, 15]], 'N2'); s.dot(26, 14, 'B3');
      s.line(25, 15, 43, 6, 'N6'); s.dot(44, 6, 'N6'); s.dot(44, 7, 'N6');
      s.box(42, 8, 5, 7, 'N5'); s.rect(43, 10, 3, 3, 'V3'); s.dot(44, 11, 'V4'); s.dot(44, 9, 'V2'); // lantern
      s.rect(29, 13, 3, 1, 'V3'); s.dot(31, 13, 'V4'); s.rect(5, 16, 2, 1, 'V2'); // spirits
      return s.selout();
    }),
  };
  ER.HERO = HERO;

  const ENEMY = {
    bat: () => memo('bat', () => {
      const s = new Px(22, 14);
      s.poly([[10, 6], [5, 1], [1, 3], [4, 5], [1, 8], [7, 7]], 'N4');
      s.poly([[12, 6], [17, 1], [21, 4], [18, 5], [21, 8], [15, 8]], 'N5');
      s.ell(11, 7, 3, 2.6, 'N3'); s.dot(9, 3, 'N3'); s.dot(12, 3, 'N3'); s.rect(9, 4, 4, 2, 'N3');
      s.dot(9, 7, 'R4'); s.dot(11, 7, 'R4');
      s.rim('M0');
      return s.selout();
    }),
    skeleton: () => memo('skel', () => {
      const s = new Px(30, 42);
      s.poly([[10, 13], [20, 12], [24, 39], [5, 39]], 'N4'); s.poly([[10, 13], [14, 13], [12, 39], [5, 39]], 'N3');
      s.ell(15, 9, 5.5, 5.5, 'N4'); s.ell(12, 10, 3.4, 3.6, 'B3'); s.rect(10, 12, 3, 2, 'B2');
      s.dot(10, 9, 'R4'); s.rect(9, 13, 3, 1, 'B4');
      s.bar(11, 17, 3, 22, 2, 'B2'); s.poly([[0, 21], [6, 21], [5, 27], [1, 27]], 'Z3'); s.line(1, 21, 5, 21, 'Z4'); s.dot(3, 28, 'Z2');
      s.rim('M0');
      return s.selout();
    }),
    candle: () => memo('cand', () => {
      const s = new Px(14, 26);
      s.rect(4, 9, 6, 13, 'B3'); s.rect(4, 9, 2, 13, 'B2'); s.rect(8, 10, 1, 4, 'B4'); s.rect(5, 15, 1, 3, 'B4');
      s.dot(5, 13, 'R4'); s.dot(7, 13, 'R4'); s.rect(5, 15, 3, 1, 'N3');
      s.rect(2, 21, 10, 3, 'Z2'); s.rect(2, 21, 10, 1, 'Z4');
      s.ell(7, 5, 2, 3.2, 'M0'); s.ell(7, 5.5, 1.1, 1.8, 'M1'); s.dot(7, 5, 'M2'); s.dot(7, 1, 'M0');
      return s.selout();
    }),
  };
  ER.ENEMY = ENEMY;

  // Bellkeeper Abaddon: the bell IS the body. Hooded skull on the crown, two bone arms, the clapper is the core.
  function boss(phase) {
    return memo('boss' + phase, () => {
      const s = new Px(160, 176), rimC = phase === 1 ? 'M0' : 'R2';
      // back arm
      s.bar(112, 52, 128, 82, 3, 'B1'); s.bar(128, 82, 136, 104, 2, 'B1'); s.line(136, 104, 140, 108, 'B1');
      // bell
      const bell = [[46, 44], [108, 44], [118, 60], [124, 90], [132, 120], [150, 146], [150, 153], [6, 153], [6, 146], [24, 120], [32, 90], [38, 60]];
      s.poly(bell, 'Z2');
      s.poly([[46, 44], [62, 44], [52, 90], [44, 146], [6, 153], [6, 146], [24, 120], [32, 90], [38, 60]], 'Z1');
      s.poly([[100, 46], [108, 44], [118, 60], [124, 90], [132, 120], [146, 142], [140, 142], [126, 120], [117, 90], [111, 62]], 'Z3');
      s.rect(10, 141, 140, 4, 'Z3'); s.rect(8, 145, 144, 2, 'Z1'); // sound bow
      for (let x = 44; x < 116; x += 5) s.rect(x, 60, 3, 2, 'Z1'); // rune band
      s.rect(38, 64, 84, 1, 'Z3');
      if (phase >= 2) {
        s.line(62, 66, 70, 92, 'R3'); s.line(70, 92, 63, 118, 'R3'); s.line(63, 118, 70, 140, 'R2');
        s.line(102, 76, 94, 104, 'R3'); s.line(94, 104, 106, 134, 'R3'); s.dot(70, 92, 'R4'); s.dot(94, 104, 'R4');
        s.erase([[118, 156], [124, 136], [130, 146], [136, 134], [140, 156]]); s.erase([[18, 156], [22, 140], [28, 150], [32, 156]]);
      }
      if (phase === 3) {
        // lower bell shattered: jagged rim, exposed rib cage holding the core
        s.erase([[0, 176], [0, 104], [30, 104], [38, 114], [48, 102], [58, 118], [70, 104], [82, 120], [94, 104], [106, 116], [118, 100], [130, 112], [160, 100], [160, 176]]);
        s.ell(80, 108, 42, 5, 'N0');
        for (const k of [-30, -18, -6, 6, 18, 30]) s.bar(78 + k, 108, 78 + k * 0.5, 150, 2, k > 0 ? 'B3' : 'B2');
        s.ellRing(78, 150, 17, 3.5, 2, 'B2');
      }
      // mouth + core (weak point)
      const coreY = phase === 3 ? 134 : 158;
      if (phase < 3) s.ell(78, 151, 66, 6, 'N0');
      s.line(78, 118, 78, coreY - 7, 'N5', 2);
      const cr = phase === 3 ? 9 : 7;
      s.ell(78, coreY, cr, cr, 'R2'); s.ell(78, coreY, cr - 2, cr - 2, 'R3'); s.ell(77, coreY - 1, cr - 4, cr - 4, 'R4');
      s.dot(75, coreY - 3, 'R6'); s.dot(76, coreY - 3, 'R5');
      // hood + skull (facing left, back-lit)
      s.poly([[52, 8], [76, 1], [100, 10], [106, 34], [92, 48], [56, 46], [44, 28]], 'N2');
      s.poly([[76, 1], [100, 10], [106, 34], [98, 40], [92, 14]], 'N3');
      s.ell(64, 29, 10, 11, 'B2'); s.ell(66, 25, 7, 6, 'B3');
      s.ell(59, 27, 2.6, 2.2, 'N0'); s.ell(67, 27, 2.2, 2.2, 'N0'); s.dot(59, 27, 'R4'); s.dot(67, 27, 'R4');
      s.rect(56, 36, 12, 2, 'B3'); for (let x = 57; x < 68; x += 2) s.dot(x, 37, 'N1');
      if (phase >= 2) { s.line(84, 6, 92, 22, 'N0'); s.line(94, 30, 101, 40, 'N0'); }
      // front arm + bell hammer (raised = telegraph pose)
      s.bar(46, 52, 26, 74, 3, 'B2'); s.bar(26, 74, 16, 46, 2, 'B2'); s.ell(15, 44, 3, 3, 'B3');
      s.bar(15, 46, 30, 10, 2, 'N6');
      s.poly([[20, 3], [38, 9], [35, 17], [17, 11]], 'N5'); s.line(21, 3, 37, 9, 'N8');
      s.rim(rimC);
      return s.selout();
    });
  }
  ER.boss = boss;

  // Bellkeeper silhouette at title scale (the belfry interior) is not needed; figures below are title-scale heroines.
  function tinyFigures(p, x, y) {
    // three heroines seen from behind on the parapet, facing the eclipse (upper right)
    const f = new Px(64, 30);
    // Seraphine: lance upright + halo
    f.rect(7, 4, 1, 24, 'N1'); f.ellRing(10.5, 5.5, 3, 3, 1, 'N3'); f.poly([[8, 10], [13, 10], [14, 26], [7, 26]], 'N1'); f.ell(10.5, 9, 2, 2.2, 'N1');
    // Noctis: folded wings like a cloak, feelers
    f.poly([[24, 11], [31, 11], [34, 27], [21, 27]], 'N1'); f.ell(27.5, 9, 2, 2.2, 'N1'); f.line(27, 7, 25, 3, 'N2'); f.line(28, 7, 30, 3, 'N2');
    f.poly([[22, 12], [18, 25], [22, 23]], 'N2'); f.poly([[33, 12], [37, 25], [33, 23]], 'N2');
    // Morgana: veil, upright coffin, lantern
    f.poly([[42, 11], [48, 11], [50, 27], [40, 27]], 'N1'); f.ell(45, 8.5, 2.3, 2.4, 'N1'); f.poly([[43, 7], [47, 7], [41, 16]], 'N2');
    f.poly([[52, 6], [58, 4], [61, 8], [60, 27], [53, 27], [51, 9]], 'T1'); f.rect(54, 13, 5, 1, 'N3');
    f.line(50, 15, 52, 12, 'N3'); f.dot(49, 16, 'V3'); f.dot(49, 17, 'V2');
    f.rim('M1', 'r');
    p.blit(f, x, y);
  }

  // ---------- bullets, shots, items, icons ----------
  const BUL = {
    S: () => memo('bS', () => fromRows(['..ooo..', '.oRRRo.', 'oRWWWRo', 'oRWWWRo', 'oRWWWRo', '.oRRRo.', '..ooo..'], { o: 'R0', R: 'R4', W: 'R6' })),
    M: () => memo('bM', () => { const s = new Px(11, 11); s.ell(5.5, 5.5, 5.5, 5.5, 'R0'); s.ell(5.5, 5.5, 4.5, 4.5, 'R3'); s.ell(5.5, 5.5, 3.6, 3.6, 'R4'); s.ell(5.5, 5.5, 2.6, 2.6, 'R6'); return s; }),
    L: () => memo('bL', () => { const s = new Px(17, 17); s.ell(8.5, 8.5, 8.5, 8.5, 'R0'); s.ell(8.5, 8.5, 7.5, 7.5, 'R2'); s.ell(8.5, 8.5, 6.5, 6.5, 'R3'); s.ell(8.5, 8.5, 5.6, 5.6, 'R5'); s.ell(8.5, 8.5, 4.7, 4.7, 'R6'); return s; }),
    boneM: () => memo('bbM', () => { const s = new Px(11, 11); s.ell(5.5, 5.5, 5.5, 5.5, 'R0'); s.ell(5.5, 5.5, 4.5, 4.5, 'R3'); s.ell(5.5, 5.5, 3.6, 3.6, 'B5'); s.ell(5.5, 5.5, 1.6, 1.6, 'R6'); return s; }),
    boneL: () => memo('bbL', () => { const s = new Px(17, 17); s.ell(8.5, 8.5, 8.5, 8.5, 'R0'); s.ell(8.5, 8.5, 7.5, 7.5, 'R3'); s.ell(8.5, 8.5, 6.5, 6.5, 'B5'); s.ell(8.5, 8.5, 2.6, 2.6, 'R6'); s.dot(10, 5, 'R6'); s.dot(11, 6, 'R6'); return s; }),
    needle: (dir) => memo('bN' + dir, () => {
      const s = new Px(15, 15), a = dir * 22.5 * DEG, ca = Math.cos(a), sa = Math.sin(a);
      const cap = (len, r, c) => { const pts = []; for (let i = 0; i <= 8; i++) { const t = -Math.PI / 2 + (i / 8) * Math.PI; pts.push([len / 2 + Math.cos(t) * r, Math.sin(t) * r]); } for (let i = 0; i <= 8; i++) { const t = Math.PI / 2 + (i / 8) * Math.PI; pts.push([-len / 2 + Math.cos(t) * r, Math.sin(t) * r]); } s.poly(pts.map(([x, y]) => [7.5 + x * ca - y * sa, 7.5 + x * sa + y * ca]), c); };
      cap(9, 2.5, 'R0'); cap(9, 1.6, 'R4'); s.line(7.5 - ca * 4, 7.5 - sa * 4, 7.5 + ca * 4, 7.5 + sa * 4, 'R6');
      return s;
    }),
  };
  ER.BUL = BUL;
  function fromRows(rows, map) {
    const s = new Px(rows[0].length, rows.length);
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (map[ch]) s.dot(x, y, map[ch]); }));
    return s;
  }

  const SHOT = {
    seraphine: (p, x, y) => { p.alpha(0.78, () => { p.rect(x, y, 10, 1, 'G3'); p.rect(x + 2, y + 1, 8, 1, 'G2'); p.dot(x + 9, y, 'G4'); }); },
    noctis: (p, x, y) => { p.alpha(0.8, () => { p.rect(x, y, 2, 1, 'A1'); p.rect(x + 2, y, 3, 1, 'A3'); p.rect(x + 5, y, 3, 1, 'A4'); }); },
    morgana: (p, x, y) => { p.alpha(0.8, () => { p.rect(x + 2, y, 2, 1, 'V2'); p.rect(x, y + 1, 4, 2, 'V2'); p.rect(x + 3, y + 1, 2, 2, 'V3'); p.rect(x + 4, y, 1, 1, 'V3'); p.rect(x + 5, y + 1, 1, 2, 'V4'); p.rect(x + 2, y + 3, 2, 1, 'V2'); }); },
  };
  ER.SHOT = SHOT;

  const ITEM = {
    P: (col) => memo('iP' + col, () => { const s = new Px(9, 9); s.poly([[4.5, 0], [9, 4.5], [4.5, 9], [0, 4.5]], 'N0'); s.poly([[4.5, 1.2], [7.8, 4.5], [4.5, 7.8], [1.2, 4.5]], col + '2'); s.poly([[4.5, 1.2], [7.8, 4.5], [4.5, 4.5]], col + '3'); s.dot(5, 3, col + '4'); return s; }),
    S: () => memo('iS', () => fromRows(['.ooo.', '.oBo.', 'ooBoo', 'oBBBo', 'ooBoo', '.oBo.', '.ooo.'], { o: 'N0', B: 'B4' })),
    H: () => memo('iH', () => fromRows(['.ooooo.', 'oMMMMMo', 'oMLLLMo', 'oMLWLMo', 'oMLLLMo', 'oMMMMMo', '.oo.oo.', '..ooo..'], { o: 'N0', M: 'M0', L: 'M1', W: 'M2' })),
    B: () => memo('iB', () => fromRows(['...o...', '..oNo..', '.oNNNo.', '.oNNNo.', 'oNNNNNo', 'ooooooo', '...o...'], { o: 'N0', N: 'N9' })),
  };
  ER.ITEM = ITEM;

  const ICON = {
    hp: (state) => memo('hp' + state, () => {
      const s = new Px(9, 9);
      s.poly([[4.5, 0], [9, 4.5], [4.5, 9], [0, 4.5]], 'N0');
      if (state === 'empty') { s.poly([[4.5, 1.4], [7.6, 4.5], [4.5, 7.6], [1.4, 4.5]], 'N4'); s.poly([[4.5, 2.6], [6.4, 4.5], [4.5, 6.4], [2.6, 4.5]], 'N1'); }
      else { const c = state === 'danger' ? 'R4' : 'B4'; s.poly([[4.5, 1.2], [7.8, 4.5], [4.5, 7.8], [1.2, 4.5]], c); s.poly([[4.5, 1.2], [7.8, 4.5], [4.5, 4.5]], state === 'danger' ? 'R5' : 'B5'); }
      return s;
    }),
    bomb: () => memo('bomb', () => fromRows(['...o...', '..oLo..', '.oLLLo.', '.oNLLo.', 'oNNLLLo', 'ooooooo', '..oLo..', '...o...'], { o: 'N0', L: 'N9', N: 'N7' })),
    cursor: () => memo('cur', () => fromRows(['..o..', '.oUo.', 'oUUUo', '.oUo.', '..o..'], { o: 'N0', U: 'U1' })),
  };
  ER.ICON = ICON;

  // ======================================================================================
  // Environment
  // ======================================================================================
  function sky(p, bands, bottom = H) {
    for (let i = 0; i < bands.length; i++) {
      const [y, c] = bands[i], y2 = i + 1 < bands.length ? bands[i + 1][0] : bottom;
      p.rect(0, y, W, y2 - y, c);
    }
    for (let i = 1; i < bands.length; i++) {
      const [y, c] = bands[i], prev = bands[i - 1][1];
      p.rect(0, y - 8, W, 2, { p: '12', c });
      p.rect(0, y - 6, W, 2, { p: '25', c });
      p.rect(0, y - 4, W, 4, { p: '50', c });
      p.rect(0, y, W, 2, { p: '25', c: prev });
      p.rect(0, y + 2, W, 2, { p: '12', c: prev });
    }
  }
  function stars(p, n, x0, y0, w, h, seed, cols = ['N6', 'N7', 'M0']) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) p.dot(x0 + Math.floor(r() * w), y0 + Math.floor(r() * h), cols[Math.floor(r() * r() * cols.length)]);
  }
  // Eclipse states follow the stage colour script: partial -> diamond ring -> total -> bleed (boss) -> ending.
  function eclipse(p, cx, cy, r, mode, k = 0.6) {
    if (mode === 'partial') {
      p.ring(cx, cy, r, r + 3, { p: '25', c: 'M0' });
      p.ell(cx, cy, r, r, 'M1'); p.ell(cx + 1, cy - 1, r - 2, r - 2, 'M2');
      p.ell(cx - (1 - k) * 2 * r + 1, cy + 1, r + 0.6, r + 0.6, 'S1');
      return;
    }
    const bleed = mode === 'bleed';
    // corona: tapered rays + rings (pearl), drawn dithered so it never becomes a solid bright area
    const rays = [20, 75, 140, 200, 250, 315];
    for (const a of rays) {
      const len = r * (bleed ? 1.15 : 0.95);
      for (let d = 0; d < len; d++) {
        const ww = Math.max(0, 2.2 - (d / len) * 2.2), x = cx + Math.cos(a * DEG) * (r + 2 + d), y = cy + Math.sin(a * DEG) * (r + 2 + d);
        p.rect(x - ww / 2, y - ww / 2, Math.max(1, ww), Math.max(1, ww), { p: d < len * 0.4 ? '50' : '25', c: 'M0' });
      }
    }
    p.ring(cx, cy, r + 1, r + 4, { p: '50', c: 'M0' });
    p.ring(cx, cy, r, r + 1.2, 'M1');
    p.ell(cx, cy, r, r, 'N0');
    // prominences (the only red in the sky)
    const proms = bleed ? [[200, 3], [235, 2], [330, 3], [100, 2]] : [[210, 1], [320, 1]];
    for (const [a, sz] of proms) {
      const x = cx + Math.cos(a * DEG) * (r + 0.5), y = cy + Math.sin(a * DEG) * (r + 0.5);
      p.ell(x, y, sz * 0.9, sz * 0.9, 'R3'); if (sz > 1) p.dot(x, y, 'R4');
    }
    if (bleed) p.ring(cx, cy, r + 5, r + 7, { p: '25', c: 'R1' });
    if (mode === 'diamond' || mode === 'ending') {
      const a = (mode === 'ending' ? 330 : 210) * DEG, x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
      p.ell(x + 0.5, y + 0.5, 2.2, 2.2, 'M2'); p.dot(x, y, 'M2');
      p.rect(x - 5, y, 11, 1, { p: '50', c: 'M2' }); p.rect(x, y - 4, 1, 9, { p: '50', c: 'M2' }); p.dot(x, y, 'M2');
    }
  }
  function skyline(p, base, seed, col, hMin, hMax, x0 = 0, x1 = W) {
    const r = rng(seed);
    let x = x0 - 10;
    while (x < x1) {
      const w = 8 + Math.floor(r() * 22), h = hMin + Math.floor(r() * (hMax - hMin));
      p.rect(x, base - h, w, h, col);
      const kind = r();
      if (kind < 0.45) p.poly([[x - 1, base - h], [x + w / 2, base - h - w * (1.2 + r() * 1.4)], [x + w + 1, base - h]], col);
      else if (kind < 0.7) { p.poly([[x, base - h], [x + 2, base - h - 6], [x + 4, base - h]], col); p.poly([[x + w - 4, base - h], [x + w - 2, base - h - 6], [x + w, base - h]], col); }
      x += w + Math.floor(r() * 6) - 2;
    }
  }
  // Mid layer: cathedral flank with buttresses and dark lancet windows (no lit windows in v2).
  function cathedral(p, x0, x1, top, base) {
    p.rect(x0, top, x1 - x0, base - top, 'T2');
    for (let y = top + 56; y < base; y += 30) p.rect(x0, y, x1 - x0, 1, 'T3');
    p.poly([[x0, top], [x0 + 20, top - 18], [x1, top - 18], [x1, top]], 'T2');
    p.rect(x0, top - 18, x1 - x0, 1, 'T4');
    for (let x = x0 + 14; x < x1 - 8; x += 44) {
      p.rect(x + 8, top + 18, 8, 34, 'N1'); p.poly([[x + 8, top + 18], [x + 12, top + 10], [x + 16, top + 18]], 'N1');
      p.rect(x + 11, top + 14, 2, 38, 'T2'); p.rect(x + 8, top + 34, 8, 1, 'T2');
      const bx = x + 26;
      p.rect(bx, top - 24, 9, base - top + 24, 'T3'); p.rect(bx + 8, top - 24, 1, base - top + 24, 'T5');
      p.poly([[bx - 1, top - 24], [bx + 4.5, top - 40], [bx + 10, top - 24]], 'T3'); p.line(bx + 5, top - 39, bx + 9, top - 25, 'T5');
    }
    p.rect(x0, base - 30, x1 - x0, 30, { p: '25', c: 'S3' });
    p.rect(x0, base - 40, x1 - x0, 10, { p: '12', c: 'S3' });
  }
  // Equilateral pointed arch band between springers (x, sy) and (x + w, sy), thickness t.
  function archBand(p, x, w, sy, t, c) {
    const pts = [], N = 8, r = w - t;
    for (let i = 0; i <= N; i++) { const th = Math.PI - (i / N) * (Math.PI / 3); pts.push([x + w + w * Math.cos(th), sy - w * Math.sin(th)]); }
    for (let i = 0; i <= N; i++) { const th = Math.PI / 3 - (i / N) * (Math.PI / 3); pts.push([x + w * Math.cos(th), sy - w * Math.sin(th)]); }
    const tr = Math.acos(Math.min(1, w / (2 * r))), tl = Math.acos(Math.max(-1, -w / (2 * r)));
    for (let i = 0; i <= N; i++) { const th = (i / N) * tr; pts.push([x + r * Math.cos(th), sy - r * Math.sin(th)]); }
    for (let i = 0; i <= N; i++) { const th = tl + (i / N) * (Math.PI - tl); pts.push([x + w + r * Math.cos(th), sy - r * Math.sin(th)]); }
    p.poly(pts, c);
  }
  ER.archBand = archBand;
  // Near layer: ruined cloister arcade (dark silhouettes against the sky).
  function arcade(p, x0, x1, base, sy, seed) {
    const r = rng(seed), bay = 40;
    for (let x = x0, i = 0; x < x1; x += bay, i++) {
      const broken = r() < 0.3, h = base - sy + (broken ? -10 - Math.floor(r() * 24) : 0);
      p.rect(x, base - h, 8, h, 'T1'); p.rect(x + 7, base - h, 1, h, 'T3');
      p.rect(x - 1, sy - 2, 10, 3, 'T1');
      if (!broken && x + bay < x1) {
        archBand(p, x + 8, bay - 8, sy, 4, 'T1');
        p.rect(x + 8, sy - Math.round((bay - 8) * 0.866) - 6, bay - 8, 4, 'T1');
        p.rect(x + 8, sy - Math.round((bay - 8) * 0.866) - 6, bay - 8, 1, 'T3');
      }
    }
  }
  function floor(p, seed, y0 = 324, opts = {}) {
    const r = rng(seed);
    p.rect(0, y0, W, H - y0, 'T1');
    p.rect(0, y0, W, 1, 'T4'); p.rect(0, y0 + 1, W, 2, 'T2');
    for (let y = y0 + 5; y < H; y += 7) for (let x = -Math.floor(r() * 20); x < W; x += 14 + Math.floor(r() * 12)) p.rect(x, y, 1, 6, 'T0');
    for (let y = y0 + 4; y < H; y += 7) p.rect(0, y, W, 1, 'T0');
    if (opts.graves !== false)
      for (let i = 0; i < (opts.n || 9); i++) {
        const x = Math.floor(r() * (W - 20)) + 4, h = 10 + Math.floor(r() * 12), w = 7 + Math.floor(r() * 5);
        if (opts.avoid && opts.avoid.some(([a, b]) => x + w > a && x < b)) continue;
        if (r() < 0.4) { p.rect(x + w / 2 - 1, y0 - h, 3, h, 'T3'); p.rect(x, y0 - h + 4, w, 3, 'T3'); p.rect(x + w / 2 + 1, y0 - h, 1, h, 'T5'); }
        else { p.rect(x, y0 - h + 3, w, h - 3, 'T3'); p.ell(x + w / 2, y0 - h + 4, w / 2, 4, 'T3'); p.rect(x + w - 1, y0 - h + 3, 1, h - 3, 'T5'); p.rect(x, y0 - h + 3, 1, h - 3, 'T1'); }
      }
  }
  function branches(p, x, y, seed, len = 60) {
    const r = rng(seed);
    const walk = (x, y, a, l, w) => {
      for (let i = 0; i < l; i++) {
        p.rect(x, y, w, w, 'N0');
        x += Math.cos(a); y += Math.sin(a); a += (r() - 0.5) * 0.25;
        if (w > 1 && i > l * 0.5) w = 1;
        if (r() < 0.06 && l > 10) walk(x, y, a + (r() < 0.5 ? -0.7 : 0.7), Math.floor(l * 0.45), 1);
      }
    };
    walk(x, y, 0.35, len, 2);
  }
  function fence(p, x0, x1, base) {
    for (let x = x0; x < x1; x += 7) { p.rect(x, base - 18, 2, 18, 'N0'); p.poly([[x - 1, base - 18], [x + 1, base - 23], [x + 3, base - 18]], 'N0'); }
    p.rect(x0 - 2, base - 12, x1 - x0 + 2, 2, 'N0');
  }
  function fog(p, y, h, c = 'S4', kind = '25') {
    p.rect(0, y, W, h, { p: kind, c });
    p.rect(0, y - 4, W, 4, { p: '12', c });
  }
  function ash(p, x, y, seed) {
    const r = rng(seed);
    for (let i = 0; i < 12; i++) { const a = r() * Math.PI * 2, d = 3 + r() * 12; p.rect(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, r() < 0.4 ? 2 : 1, r() < 0.4 ? 2 : 1, r() < 0.5 ? 'N7' : 'N8'); }
    p.rect(x - 1, y - 2, 3, 1, 'B3'); p.dot(x + 4, y + 3, 'B2');
  }

  // ---------- HUD ----------
  function hudBottom(p, hero, { hp, hpMax, bombs, lv, score, chain }) {
    const key = { seraphine: 'G', noctis: 'A', morgana: 'V' }[hero];
    let x = 6;
    for (let i = 0; i < hpMax; i++) { p.blit(ICON.hp(i >= hp ? 'empty' : hp === 1 ? 'danger' : 'full'), x, 345); x += 9; }
    x += 5;
    for (let i = 0; i < bombs; i++) { p.blit(ICON.bomb(), x, 345); x += 9; }
    x += 6;
    x += p.t5('PWR', x, 347, 'N8', { outline: 'N0' }) + 3;
    for (let i = 0; i < 3; i++) { p.rect(x - 1, 346, 5, 7, 'N0'); p.rect(x, 347, 3, 5, i < lv ? key + '2' : 'N4'); if (i < lv) p.rect(x, 347, 3, 1, key + '3'); x += 5; }
    p.t5(String(score).padStart(8, '0'), 634, 347, 'B4', { align: 'right', outline: 'N0' });
    p.t5('SCORE', 634 - 47 - 4, 347, 'N8', { align: 'right', outline: 'N0' });
    if (chain) p.t5(chain, 634, 337, 'N8', { align: 'right', outline: 'N0' });
  }
  function chargeGauge(p, cx, y, k, hero, state = 'charging') {
    const key = { seraphine: 'G', noctis: 'A', morgana: 'V' }[hero];
    p.rect(cx - 9, y - 1, 18, 4, 'N0');
    p.rect(cx - 8, y, 16, 2, 'N3');
    const fill = Math.round(16 * k);
    p.rect(cx - 8, y, fill, 2, state === 'cooldown' ? 'N5' : k >= 0.5 ? key + '3' : 'N9');
    if (k >= 1 && state !== 'cooldown') p.rect(cx - 8, y, 16, 1, key + '4');
    p.dot(cx, y - 1, 'N7');
  }
  function bossBar(p, { name = 'BELLKEEPER ABADDON', hp = 0.74, trail = 0.04, timer = '31', state = 'normal' }) {
    p.t5(name, 6, 4, state === 'wrath' ? 'R4' : 'B4', { outline: 'N0' });
    const x = 120, w = 496;
    p.rect(x - 1, 4, w + 2, 5, 'N0'); p.rect(x, 5, w, 3, 'N3');
    if (state === 'invuln') { p.rect(x, 5, Math.round(w * hp), 3, 'N6'); p.rect(x, 5, Math.round(w * hp), 3, { p: 'hatch', c: 'N8' }); }
    else {
      p.rect(x, 5, Math.round(w * hp), 3, state === 'wrath' ? 'R4' : 'R3');
      p.rect(x + Math.round(w * hp), 5, Math.round(w * trail), 3, 'R1');
      p.rect(x, 5, Math.round(w * hp), 1, state === 'wrath' ? 'R5' : 'R4');
    }
    for (const t of [0.65, 0.3]) { const tx = x + Math.round(w * t); p.rect(tx, 5, 1, 3, 'N0'); p.rect(tx, 1, 1, 3, 'B4'); }
    p.t5(timer, 634, 4, 'N8', { align: 'right', outline: 'N0' });
  }
  ER.hud = { hudBottom, chargeGauge, bossBar };

  function fan(p, ox, oy, tx, ty, offs, dists, b) {
    const a0 = Math.atan2(ty - oy, tx - ox);
    const spr = typeof b === 'function' ? b() : b;
    for (const d of dists) for (const o of offs) { const a = a0 + o * DEG; p.blit(spr, Math.round(ox + Math.cos(a) * d - spr.w / 2), Math.round(oy + Math.sin(a) * d - spr.h / 2)); }
  }
  const dirIndex = (a) => ((Math.round(a / (22.5 * DEG)) % 16) + 16) % 16;

  // ======================================================================================
  // Screens
  // ======================================================================================
  const S = (ER.scenes = {});
  const G = (ER.guides = {});

  // ---- Stage 1 combat (section A -> B) ----
  S.combat = (p) => {
    sky(p, [[0, 'S0'], [64, 'S1'], [132, 'S2'], [196, 'S3'], [238, 'S4']], 324);
    stars(p, 70, 0, 0, W, 160, 7);
    eclipse(p, 560, 52, 12, 'partial', 0.55);
    skyline(p, 276, 3, 'S1', 26, 96);
    fog(p, 262, 18, 'S4', '25');
    cathedral(p, 300, W + 20, 212, 324);
    arcade(p, -4, 236, 324, 268, 11);
    floor(p, 21, 324, { n: 11, avoid: [[0, 120], [540, 640]] });
    branches(p, -2, 2, 5, 70); branches(p, 0, 18, 9, 44);
    fence(p, 180, 290, 360);

    const pl = { x: 78, y: 160 };
    for (let x = 136; x < 430; x += 48) { SHOT.seraphine(p, x, pl.y + 13); SHOT.seraphine(p, x + 3, pl.y + 19); }
    p.blit(HERO.seraphine(), pl.x, pl.y);
    chargeGauge(p, pl.x + 26, pl.y + 34, 0.6, 'seraphine');

    ash(p, 392, 96, 4);
    p.blit(ITEM.S(), 404, 108); p.blit(ITEM.S(), 386, 116); p.blit(ITEM.P('G'), 300, 108);

    p.blit(ENEMY.skeleton(), 468, 126); p.blit(ENEMY.skeleton(), 514, 208);
    for (const [bx, by] of [[548, 76], [568, 64], [568, 90], [590, 52], [590, 104]]) p.blit(ENEMY.bat(), bx, by);
    p.blit(ENEMY.candle(), 596, 298);

    const tgt = [pl.x + 26, pl.y + 16];
    fan(p, 470, 148, tgt[0], tgt[1], [-30, -15, 0, 15, 30], [64, 132], BUL.S);
    fan(p, 516, 231, tgt[0], tgt[1], [0], [40, 82, 124], BUL.M);
    fan(p, 600, 304, 300, 250, [-14, 0, 14], [34], BUL.boneM);
    const na = Math.atan2(tgt[1] - 82, tgt[0] - 548);
    p.blit(BUL.needle(dirIndex(na)), 548 + Math.cos(na) * 30 - 7, 82 + Math.sin(na) * 30 - 7);

    p.t5('I  ASHEN CEMETERY', 320, 5, 'N8', { align: 'center', outline: 'N0' });
    hudBottom(p, 'seraphine', { hp: 3, hpMax: 3, bombs: 2, lv: 1, score: 14670, chain: 'CHAIN 7  x1.14' });
  };
  G.combat = (p) => {
    p.rect(0, 14, W, 1, { p: '50', c: GUIDE }); p.rect(0, 324, W, 1, { p: '50', c: GUIDE });
    p.rect(200, 14, 1, 310, { p: '50', c: GUIDE }); p.rect(440, 14, 1, 310, { p: '50', c: GUIDE });
    p.t5('TOP BAND 0-14  CAPTION / BOSS BAR ONLY', 6, 17, GUIDE, { outline: 'N0' });
    p.t5('PLAYER ZONE', 100, 300, GUIDE, { align: 'center', outline: 'N0' });
    p.t5('ENGAGE', 320, 300, GUIDE, { align: 'center', outline: 'N0' });
    p.t5('ENTRY', 540, 300, GUIDE, { align: 'center', outline: 'N0' });
    p.t5('FLOOR BAND 324-360', 320, 328, GUIDE, { align: 'center', outline: 'N0' });
    p.box(4, 343, 124, 13, GUIDE); p.box(546, 335, 91, 21, GUIDE);
    p.box(76, 158, 52, 36, GUIDE);
  };

  // ---- Stage 1 boss ----
  S.boss = (p) => {
    sky(p, [[0, 'S0'], [110, 'S1'], [196, 'S2'], [246, 'S3'], [272, 'S4']], 324);
    p.rect(0, 284, W, 12, { p: '25', c: 'S5' });
    stars(p, 50, 0, 0, W, 150, 17);
    eclipse(p, 566, 52, 17, 'bleed');
    skyline(p, 300, 31, 'S2', 20, 70);
    // belfry behind the boss: slate silhouette, broken crown, the empty bell arch the boss came out of
    p.rect(486, 100, 112, 224, 'S1'); p.rect(597, 100, 1, 224, 'S3');
    p.poly([[482, 100], [496, 90], [510, 96], [524, 84], [540, 94], [556, 88], [574, 96], [590, 90], [602, 100]], 'S1');
    archBand(p, 502, 80, 200, 80, 'N0');
    for (const y of [130, 250, 290]) p.rect(486, y, 112, 1, 'S2');
    p.rect(486, 284, 112, 40, { p: '25', c: 'S3' });
    arcade(p, 40, 250, 324, 270, 41);
    floor(p, 51, 324, { n: 6, avoid: [[0, 130], [540, 640]] });
    for (const [x, y, s] of [[300, 54, 4], [364, 132, 3], [252, 92, 3]]) { p.rect(x, y, s + 1, s, 'T3'); p.rect(x + s, y, 1, s, 'T5'); }

    p.blit(boss(1), 440, 52);

    const pl = { x: 96, y: 196 }, tgt = [pl.x + 24, pl.y + 16];
    for (let x = 140; x < 440; x += 26) { SHOT.noctis(p, x, pl.y + 14); SHOT.noctis(p, x + 6, pl.y + 17); SHOT.noctis(p, x + 12, pl.y + 20); }
    p.blit(HERO.noctis(), pl.x, pl.y);
    // P1 "Silent Toll": an expanding ring of crimson bullets released from the core, bone curtain, hammer needles
    const cx = 518, cy = 212;
    for (let i = 0; i < 16; i++) { const a = (i * 22.5 + 11) * DEG, d = 86; if (Math.cos(a) > 0.55) continue; p.blit(BUL.M(), cx + Math.cos(a) * d - 5, cy + Math.sin(a) * d - 5); }
    for (const [x, y] of [[318, 104], [292, 172], [326, 262]]) p.blit(BUL.boneL(), x, y);
    const ha = Math.atan2(tgt[1] - 66, tgt[0] - 462);
    for (const d of [34, 62, 90, 118]) p.blit(BUL.needle(dirIndex(ha)), 462 + Math.cos(ha) * d - 7, 66 + Math.sin(ha) * d - 7);
    p.line(462 + Math.cos(ha) * 130, 66 + Math.sin(ha) * 130, tgt[0] + 40, tgt[1] - 6, 'R1', 3);
    for (const [x, y] of [[248, 236], [210, 120]]) p.blit(BUL.S(), x, y);

    bossBar(p, { hp: 0.74, trail: 0.04, timer: '31' });
    hudBottom(p, 'noctis', { hp: 2, hpMax: 3, bombs: 1, lv: 2, score: 32348 });
  };
  G.boss = (p) => {
    p.box(440, 52, 160, 176, GUIDE);
    p.t5('BOSS <= 160x176 (49% H)', 520, 232, GUIDE, { align: 'center', outline: 'N0' });
    p.rect(420, 14, 1, 310, { p: '50', c: GUIDE });
    p.t5('DODGE SPACE x 0-420 (66%)', 210, 30, GUIDE, { align: 'center', outline: 'N0' });
    p.ring(518, 210, 9, 10, GUIDE); p.t5('CORE x1.0', 532, 206, GUIDE, { outline: 'N0' });
    p.box(119, 0, 498, 10, GUIDE); p.t5('BAR 496x3', 368, 12, GUIDE, { align: 'center', outline: 'N0' });
  };

  // ---- Title ----
  S.title = (p) => {
    sky(p, [[0, 'S0'], [96, 'S1'], [168, 'S2'], [222, 'S3'], [256, 'S4'], [282, 'S5']], H);
    p.rect(0, 296, W, 30, { p: '25', c: 'S6' });
    stars(p, 120, 0, 0, W, 210, 23);
    eclipse(p, 492, 96, 22, 'total');
    skyline(p, 330, 77, 'S2', 18, 74);
    p.rect(0, 330, W, 30, 'S1');
    // belfry parapet (near, right)
    p.rect(360, 268, 280, 92, 'T0');
    p.rect(360, 265, 280, 4, 'T2'); p.rect(360, 265, 280, 1, 'T4');
    for (let x = 374; x < 640; x += 30) {
      p.rect(x, 300, 18, 36, 'S5'); archBand(p, x, 18, 300, 18, 'S5');
      p.rect(x, 300, 18, 36, { p: '25', c: 'S6' }); p.rect(x + 8, 286, 2, 50, 'T0'); p.rect(x, 318, 18, 1, 'T0');
    }
    p.rect(360, 336, 280, 24, 'T0'); p.rect(360, 262, 7, 98, 'T1'); p.rect(366, 262, 1, 98, 'T3');
    tinyFigures(p, 430, 237);
    stars(p, 26, 0, 120, W, 230, 99, ['N7']);

    // logo placeholder (custom lettering is a separate commission)
    p.box(40, 64, 240, 44, 'N6'); p.rect(40, 64, 240, 44, { p: '12', c: 'N4' });
    p.t5('LOGO 240x44', 160, 76, 'N8', { align: 'center' });
    p.t5('CUSTOM LETTERING  CAP 20PX', 160, 88, 'N7', { align: 'center' });
    p.tg('일식의 진혼곡', 40, 116, 'N8', { f: 'G11' });
    const items = [['START', 1], ['STORY', 0], ['OPTIONS', 0], ['ARCHIVE', -1], ['CREDITS', 0]];
    items.forEach(([t, s], i) => {
      const y = 170 + i * 16;
      if (s === 1) p.blit(ICON.cursor(), 28, y + 3);
      p.tg(t, 40, y, s === 1 ? 'B5' : s === -1 ? 'N6' : 'N8', { f: s === 1 ? 'G11B' : 'G11' });
    });
    p.t5('VER 0.2.0  STAGE 1 VERTICAL SLICE', 40, 344, 'N7');
    p.t5('HI 00095142', 345, 344, 'N7', { align: 'right' });
  };
  G.title = (p) => {
    p.rect(40, 0, 1, H, { p: '50', c: GUIDE }); p.rect(320, 0, 1, H, { p: '50', c: GUIDE });
    p.t5('TEXT COLUMN x 40', 44, 40, GUIDE, { outline: 'N0' });
    p.t5('SCENE  NO CHARACTER ILLUSTRATION', 330, 40, GUIDE, { outline: 'N0' });
    p.box(428, 235, 68, 34, GUIDE); p.t5('HEROES 24PX', 462, 226, GUIDE, { align: 'center', outline: 'N0' });
  };

  // ---- Character select ----
  S.select = (p) => {
    p.rect(0, 0, W, H, 'N1');
    // nave: back wall, lancet windows with corona light, columns
    p.rect(150, 0, 220, 324, 'T0');
    for (const wx of [214, 248, 282]) {
      p.rect(wx, 30, 16, 56, 'S2'); p.poly([[wx, 30], [wx + 8, 16], [wx + 16, 30]], 'S2');
      p.rect(wx, 30, 16, 56, { p: '25', c: 'M0' }); p.rect(wx + 7, 18, 2, 68, 'N1'); p.rect(wx, 54, 16, 1, 'N1');
    }
    p.poly([[214, 86], [298, 86], [318, 300], [190, 300]], { p: '12', c: 'M0' });
    for (const [x, w, c, e] of [[128, 18, 'T1', 'T3'], [374, 18, 'T1', 'T3'], [96, 12, 'N0', 'T1'], [412, 12, 'N0', 'T1']]) {
      p.rect(x, 0, w, 324, c); p.rect(x + w - 1, 0, 1, 324, e); p.rect(x - 2, 40, w + 4, 4, c);
    }
    floor(p, 61, 324, { graves: false });
    p.rect(196, 300, 120, 8, 'T3'); p.rect(196, 300, 120, 1, 'T5'); p.rect(204, 308, 104, 16, 'T2');
    p.blit(fullBody(), 208, 156);

    // left list
    p.tg('CHARACTER', 24, 24, 'N8', { f: 'G9' });
    p.rect(24, 40, 100, 1, 'N4');
    const rows = [['seraphine', 'SERAPHINE', '밸런스 · 관통'], ['noctis', 'NOCTIS', '고속 · 원거리'], ['morgana', 'MORGANA', '확산 · 근접']];
    rows.forEach(([id, name, role], i) => {
      const y = 56 + i * 58, on = i === 0;
      if (on) p.blit(ICON.cursor(), 10, y + 13);
      p.blit(HERO[id](), 18, y);
      p.tg(name, 18, y + 32, on ? 'B5' : 'N7', { f: on ? 'G11B' : 'G11' });
      p.tg(role, 18, y + 45, on ? 'N8' : 'N6', { f: 'G9' });
    });

    // right info column
    const X = 452;
    p.tg('SERAPHINE', X, 24, 'B5', { f: 'G11B' });
    p.tg('종을 잃은 성가 기사', X, 40, 'N8', { f: 'G9' });
    p.rect(X, 56, 170, 1, 'N4');
    [['HP', 6], ['SPEED', 6], ['POWER', 7], ['RANGE', 7]].forEach(([l, v], i) => {
      const y = 64 + i * 12;
      p.t5(l, X, y, 'N8');
      for (let k = 0; k < 10; k++) p.rect(X + 44 + k * 7, y + 1, 5, 5, k < v ? 'G2' : 'N3');
    });
    ['BASIC', 'CHARGE', 'BOMB'].forEach((t, i) => {
      const x = X + i * 50;
      p.t5(t, x, 124, i === 0 ? 'B4' : 'N7');
      if (i === 0) p.rect(x, 133, ER.t5w(t), 1, 'G3');
    });
    // live preview window: 1:1 crop of a sandbox, never scaled
    const px0 = X, py0 = 140, pw = 172, ph = 96;
    p.rect(px0, py0, pw, ph, 'S1');
    p.rect(px0, py0 + ph - 14, pw, 14, 'T1'); p.rect(px0, py0 + ph - 14, pw, 1, 'T4');
    p.blit(HERO.seraphine(), px0 + 4, py0 + 34);
    for (let x = px0 + 54; x < px0 + 140; x += 30) { SHOT.seraphine(p, x, py0 + 47); SHOT.seraphine(p, x + 3, py0 + 53); }
    p.rect(px0 + 146, py0 + 38, 12, 22, 'Z2'); p.rect(px0 + 146, py0 + 38, 12, 2, 'Z4'); p.ell(px0 + 152, py0 + 36, 5, 3, 'Z3'); p.rect(px0 + 151, py0 + 60, 2, 22, 'T3');
    p.rect(px0 + 143, py0 + 48, 2, 1, 'N10'); p.rect(px0 + 141, py0 + 51, 1, 1, 'N9');
    p.box(px0 - 1, py0 - 1, pw + 2, ph + 2, 'N5');
    p.tg('일직선 위의 적을 성창으로 꿰뚫는다.', X, 244, 'N8', { f: 'G9' });
    p.tg('가장 다루기 쉬운 균형형 · 입문 추천', X, 258, 'N7', { f: 'G9' });

    // key guide
    let kx = 24;
    for (const [k, t] of [['<>', 'SELECT'], ['Z', 'CONFIRM'], ['X', 'BACK']]) {
      const kw = ER.t5w(k) + 6;
      p.box(kx, 341, kw, 11, 'N5'); p.t5(k, kx + 3, 343, 'B4'); kx += kw + 4;
      kx += p.t5(t, kx, 343, 'N8') + 12;
    }
  };
  function fullBody() {
    return memo('full-ser', () => {
      const s = new Px(96, 144);
      s.ellRing(45, 18, 13, 13, 2, 'N6'); s.ring(45, 18, 11, 13, 'G2', (dx, dy) => dx > 2 && dy < -2); // halo ring
      s.poly([[34, 30], [56, 30], [64, 128], [26, 128]], 'B3'); // surcoat
      s.poly([[34, 30], [42, 30], [36, 128], [26, 128]], 'B2');
      s.poly([[56, 30], [60, 31], [66, 126], [62, 128]], 'B4');
      s.poly([[30, 30], [60, 28], [64, 40], [28, 42]], 'N5'); s.rect(30, 28, 32, 2, 'N7'); // pauldrons
      s.rect(40, 54, 18, 4, 'N4'); s.rect(42, 55, 2, 2, 'G2'); // belt
      s.poly([[36, 8], [52, 6], [58, 18], [56, 32], [34, 32], [32, 18]], 'B2'); // coif + veil
      s.poly([[40, 12], [52, 12], [53, 26], [41, 26]], 'B3'); s.rect(44, 16, 8, 9, 'B4'); s.dot(49, 19, 'N2'); s.dot(46, 19, 'N3');
      s.poly([[34, 28], [26, 34], [22, 120], [30, 122], [34, 40]], 'B1'); // veil falling behind
      s.rect(28, 128, 14, 12, 'N4'); s.rect(48, 128, 14, 12, 'N4'); s.rect(26, 138, 18, 4, 'N3'); s.rect(48, 138, 18, 4, 'N3'); // boots
      s.bar(70, 2, 70, 140, 3, 'N7'); s.rect(71, 2, 1, 138, 'N9'); // lance
      s.poly([[66, 2], [70, -8], [74, 2]], 'G3'); s.poly([[67, 4], [70, 0], [73, 4], [70, 12]], 'G2');
      s.poly([[56, 40], [64, 42], [70, 62], [66, 66], [58, 50]], 'N5'); s.ell(69, 66, 3, 3, 'B3'); // arm to lance
      s.poly([[62, 60], [78, 60], [70, 76]], 'N6'); // vamplate
      return s.selout();
    });
  }
  ER.fullBody = fullBody;
  G.select = (p) => {
    p.box(8, 50, 130, 176, GUIDE); p.t5('LIST  REAL SPRITE SIZE', 73, 232, GUIDE, { align: 'center', outline: 'N0' });
    p.box(208, 154, 96, 146, GUIDE); p.t5('FULL BODY 96x144', 256, 146, GUIDE, { align: 'center', outline: 'N0' });
    p.box(451, 139, 174, 98, GUIDE); p.t5('LIVE PREVIEW 1:1', 538, 128, GUIDE, { align: 'center', outline: 'N0' });
  };

  // ---- Stage clear ----
  S.clear = (p) => {
    sky(p, [[0, 'S1'], [90, 'S2'], [170, 'S3'], [230, 'S4'], [272, 'S5']], 324);
    p.rect(0, 290, W, 30, { p: '25', c: 'S6' });
    stars(p, 40, 0, 0, W, 140, 31);
    eclipse(p, 196, 70, 17, 'ending');
    skyline(p, 300, 31, 'S2', 20, 70);
    p.rect(486, 100, 112, 224, 'S1'); p.rect(597, 100, 1, 224, 'S3');
    p.poly([[482, 100], [496, 90], [510, 96], [524, 84], [540, 94], [556, 88], [574, 96], [590, 90], [602, 100]], 'S1');
    archBand(p, 502, 80, 200, 80, 'N0');
    floor(p, 51, 324, { n: 6 });
    p.blit(HERO.morgana(), 96, 168);
    p.rect(288, 0, W - 288, H, { p: '50', c: 'N0' });
    p.rect(288, 0, 1, H, 'N4');
    const X = 312;
    p.tg('STAGE 1 CLEARED', X, 32, 'B5', { f: 'G11B' });
    p.tg('재의 변두리 · 침묵의 종이 멎었다', X, 48, 'N8', { f: 'G9' });
    p.rect(X, 66, 304, 1, 'N5');
    const rows = [['SCORE', '00095142'], ['ENEMIES', '142/150  95%'], ['MAX CHAIN', '10'], ['GRAZE', '104'], ['DAMAGE', '0'], ['BOMBS', '0'], ['BOSS TIME', '1:34']];
    rows.forEach(([l, v], i) => { const y = 78 + i * 15; p.t5(l, X, y, 'N8'); p.t5(v, 616, y, i === 0 ? 'B5' : 'B4', { align: 'right' }); if (i) p.rect(X, y - 4, 304, 1, { p: '50', c: 'N3' }); });
    p.rect(X, 186, 304, 1, 'N5');
    p.t5('RANK', X, 200, 'N8');
    p.blit(rankS(), X, 212);
    p.t5('NO MISS  NO BOMB', X + 26, 214, 'B4');
    p.t5('NEW RECORD', X + 26, 224, 'U1');
    p.blit(ICON.cursor(), X - 12, 287);
    p.tg('NEXT STAGE', X, 284, 'B5', { f: 'G11B' });
    p.tg('TITLE', X + 100, 284, 'N8', { f: 'G11' });
  };
  function rankS() {
    return memo('rankS', () => fromRows([
      '....ooooooooo....', '..ooUUUUUUUUUoo..', '.oUUUUUUUUUUUUUo.', 'oUUUUooooooooUUUo', 'oUUUo........oUUo', 'oUUUo.........oo.',
      'oUUUUo...........', '.oUUUUUoooo......', '..ooUUUUUUUUoo...', '....ooooUUUUUUo..', '........ooooUUUo.', '.oo.........oUUUo',
      'oUUo........oUUUo', 'oUUUoooooooooUUUo', '.oUUUUUUUUUUUUUo.', '..ooUUUUUUUUUoo..', '....ooooooooo....',
    ], { o: 'N0', U: 'U1' }));
  }
  G.clear = (p) => {
    p.box(94, 166, 52, 36, GUIDE); p.t5('REAL SPRITE', 120, 206, GUIDE, { align: 'center', outline: 'N0' });
    p.rect(312, 0, 1, H, { p: '50', c: GUIDE }); p.rect(616, 0, 1, H, { p: '50', c: GUIDE });
    p.t5('RESULT COLUMN 304', 464, 300, GUIDE, { align: 'center', outline: 'N0' });
  };

  // ---- Game over ----
  S.gameover = (p) => {
    // the stage frame with actors removed, palette-swapped to the Ash ramp
    const base = new Px(W, H);
    sky(base, [[0, 'S0'], [64, 'S1'], [132, 'S2'], [196, 'S3'], [238, 'S4']], 324);
    stars(base, 70, 0, 0, W, 160, 7);
    skyline(base, 276, 3, 'S1', 26, 96); fog(base, 262, 18, 'S4', '25');
    cathedral(base, 300, W + 20, 212, 324); arcade(base, -4, 236, 324, 268, 11);
    floor(base, 21, 324, { n: 11, avoid: [[0, 120], [540, 640]] });
    branches(base, -2, 2, 5, 70); branches(base, 0, 18, 9, 44); fence(base, 180, 290, 360);
    base.blit(ENEMY.skeleton(), 468, 126); base.blit(ENEMY.skeleton(), 514, 208);
    base.ellRing(150.5, 321.5, 4, 2.2, 1, 'N7');
    base.toAsh();
    p.g.clearRect(0, 0, W, H);
    p.blit(base, 0, 0);
    p.rect(0, 0, W, H, { p: '50', c: 'N0' });
    eclipse(p, 560, 52, 12, 'total');
    p.tg('GAME OVER', 320, 112, 'B4', { f: 'G11B', align: 'center' });
    p.t5('CONTINUE?', 320, 142, 'N8', { align: 'center' });
    p.blit(digit7(), 315, 156);
    p.blit(ICON.cursor(), 262, 199);
    p.tg('YES', 274, 196, 'B5', { f: 'G11B' });
    p.tg('NO', 346, 196, 'N8', { f: 'G11' });
    p.tg('컨티뉴하면 점수가 0으로 초기화됩니다', 320, 220, 'N7', { f: 'G9', align: 'center' });
    p.t5('SCORE 00012340  STAGE 1 B', 320, 344, 'N7', { align: 'center' });
  };
  function digit7() {
    return memo('d7', () => fromRows([
      'ooooooooooo', 'oBBBBBBBBBo', 'oBBBBBBBBBo', 'ooooooBBBo.', '.....oBBBo.', '....oBBBo..', '....oBBBo..', '...oBBBo...',
      '...oBBBo...', '..oBBBo....', '..oBBBo....', '..oBBBo....', '..oBBBo....', '..ooooo....',
    ], { o: 'N0', B: 'B4' }));
  }
  G.gameover = (p) => {
    p.box(250, 104, 140, 132, GUIDE); p.t5('ONE DECISION  CENTRED', 320, 96, GUIDE, { align: 'center', outline: 'N0' });
    p.ring(560, 52, 13, 14, GUIDE); p.t5('ONLY COLOUR: PROMINENCE', 470, 74, GUIDE, { outline: 'N0' });
  };

  // ======================================================================================
  // Sheets
  // ======================================================================================
  ER.sheets = {};
  ER.sheets.silhouette = () => {
    const p = new Px(250, 126);
    p.rect(0, 0, 250, 126, 'N1');
    const rows = [['seraphine', 'SERAPHINE'], ['noctis', 'NOCTIS'], ['morgana', 'MORGANA']];
    p.t5('COLOUR', 92, 4, 'N8', { align: 'center' }); p.t5('SILHOUETTE', 152, 4, 'N8', { align: 'center' }); p.t5('ON WALL', 214, 4, 'N8', { align: 'center' });
    rows.forEach(([id, name], i) => {
      const y = 14 + i * 38, spr = HERO[id]();
      p.t5(name, 4, y + 13, 'B4');
      p.rect(64, y, 56, 36, 'S2'); p.blit(spr, 68, y + 2);
      p.rect(124, y, 56, 36, 'N9'); p.blit(spr.silhouette('N0'), 128, y + 2);
      p.rect(186, y, 56, 36, 'T3'); p.rect(186, y + 22, 56, 1, 'T5'); p.blit(spr, 190, y + 2);
    });
    return p;
  };
  ER.sheets.bullets = () => {
    const p = new Px(330, 196);
    const bgs = [['S1', 'DARK SKY S1'], ['T3', 'STONE T3'], ['S7', 'HORIZON S7']];
    bgs.forEach(([c, l], i) => {
      const x = i * 110;
      p.rect(x, 0, 110, 78, c);
      p.t5(l, x + 4, 3, i === 2 ? 'N1' : 'N8');
      p.blit(BUL.S(), x + 6, 18); p.blit(BUL.M(), x + 20, 16); p.blit(BUL.L(), x + 38, 13);
      p.blit(BUL.needle(0), x + 60, 15); p.blit(BUL.needle(2), x + 76, 15); p.blit(BUL.needle(4), x + 92, 15);
      p.blit(BUL.boneM(), x + 8, 46); p.blit(BUL.boneL(), x + 26, 43);
      p.t5('CRIMSON', x + 4, 34, i === 2 ? 'N1' : 'N7'); p.t5('BONE', x + 50, 52, i === 2 ? 'N1' : 'N7');
    });
    p.rect(0, 78, 330, 118, 'S2');
    const heroes = [['seraphine', 'G'], ['noctis', 'A'], ['morgana', 'V']];
    heroes.forEach(([id, k], i) => {
      const y = 86 + i * 30;
      p.t5(id.slice(0, 3).toUpperCase(), 4, y + 4, k + '3');
      for (let j = 0; j < 3; j++) SHOT[id](p, 26 + j * 14, y + 2 + (id === 'noctis' ? j % 3 * 3 : 0));
      chargeShot(p, id, 1, 80, y);
      chargeShot(p, id, 2, 160, y);
    });
    p.t5('BASIC', 26, 178, 'N8'); p.t5('CHARGE L1', 80, 178, 'N8'); p.t5('CHARGE L2', 160, 178, 'N8');
    p.blit(ITEM.P('G'), 262, 90); p.blit(ITEM.S(), 280, 91); p.blit(ITEM.H(), 294, 90); p.blit(ITEM.B(), 310, 90);
    p.t5('ITEMS', 262, 104, 'N8');
    p.blit(ICON.hp('full'), 262, 122); p.blit(ICON.hp('empty'), 272, 122); p.blit(ICON.hp('danger'), 282, 122); p.blit(ICON.bomb(), 294, 123); p.blit(ICON.cursor(), 306, 124);
    p.t5('HUD', 262, 136, 'N8');
    return p;
  };
  function chargeShot(p, id, lv, x, y) {
    if (id === 'seraphine') {
      const one = (yy, len) => { p.alpha(0.85, () => { p.rect(x + 6, yy - 2, len - 10, 1, 'G1'); p.rect(x + 2, yy - 1, len - 4, 1, 'G2'); p.rect(x, yy, len, 1, 'G4'); p.rect(x + 2, yy + 1, len - 4, 1, 'G2'); p.rect(x + 6, yy + 2, len - 10, 1, 'G1'); p.dot(x + len, yy, 'G3'); }); };
      if (lv === 1) one(y + 8, 44); else { one(y + 3, 66); one(y + 15, 66); p.rect(x - 2, y + 1, 1, 17, 'G3'); p.rect(x - 6, y + 9, 9, 1, 'G3'); }
    } else if (id === 'noctis') {
      if (lv === 1) { const pts = [[0, 8], [5, 5], [9, 10], [14, 4], [18, 9], [22, 6], [26, 8]]; for (let i = 0; i + 1 < pts.length; i++) { p.line(x + pts[i][0], y + pts[i][1] - 1, x + pts[i + 1][0], y + pts[i + 1][1] - 1, 'A2'); p.line(x + pts[i][0], y + pts[i][1], x + pts[i + 1][0], y + pts[i + 1][1], 'A4'); } }
      else { p.ring(x + 12, y + 10, 7, 10, 'A2', (dx, dy) => dx > -3 || dy > 4); p.ring(x + 12, y + 10, 8, 9.2, 'A4', (dx, dy) => dx > -3 || dy > 4); p.ell(x + 12, y + 10, 2, 2, 'A1'); p.rect(x - 10, y + 10, 8, 1, { p: '50', c: 'A3' }); }
    } else {
      if (lv === 1) for (let i = 0; i < 3; i++) { const yy = y + 2 + i * 7; p.ell(x + 8 + i * 4, yy + 3, 3.5, 3.5, 'V2'); p.ell(x + 9 + i * 4, yy + 3, 2.2, 2.2, 'V3'); p.dot(x + 9 + i * 4, yy + 2, 'V4'); p.rect(x + 1 + i * 4, yy + 3, 4, 1, { p: '50', c: 'V2' }); }
      else for (let i = 0; i < 7; i++) { const a = (i - 3) * 22 * DEG, xx = x + 14 + Math.cos(a) * 18, yy = y + 10 + Math.sin(a) * 12; p.ell(xx, yy, 4.5, 4.5, 'V1'); p.ell(xx, yy, 3.4, 3.4, 'V3'); p.ell(xx - 0.5, yy - 0.5, 1.8, 1.8, 'V4'); }
    }
  }
  ER.sheets.bossPhases = () => {
    const p = new Px(520, 200);
    p.rect(0, 0, 520, 200, 'S1');
    p.rect(0, 180, 520, 20, 'T1'); p.rect(0, 180, 520, 1, 'T4');
    ['P1 SILENT TOLL', 'P2 LAMENT BELL', 'P3 FUNERAL COLLAPSE'].forEach((t, i) => { p.blit(boss(i + 1), 8 + i * 172, 4); p.t5(t, 88 + i * 172, 188, 'B4', { align: 'center' }); });
    return p;
  };
  ER.sheets.hud = () => {
    const p = new Px(320, 120);
    p.rect(0, 0, 320, 120, 'S1');
    p.rect(0, 88, 320, 32, 'T1'); p.rect(0, 88, 320, 1, 'T4');
    const bar = (y, st, label) => {
      const q = new Px(W, 12); bossBar(q, { hp: st === 'invuln' ? 0.65 : 0.52, trail: st === 'normal' ? 0.05 : 0, timer: st === 'wrath' ? '00' : '24', state: st });
      p.g.drawImage(q.c, 118, 0, 202, 12, 112, y, 202, 12);
      p.t5(label, 4, y + 3, 'N8');
    };
    bar(4, 'normal', 'BAR  DAMAGE TRAIL'); bar(20, 'invuln', 'BAR  TRANSITION'); bar(36, 'wrath', 'BAR  WRATH 90S');
    const states = [[0.3, 'charging', 'CHARGING'], [0.6, 'charging', 'L1 READY'], [1, 'charging', 'L2 FULL'], [0.45, 'cooldown', 'COOLDOWN']];
    states.forEach(([k, st, l], i) => { chargeGauge(p, 30 + i * 76, 64, k, 'seraphine', st); p.t5(l, 30 + i * 76, 72, 'N8', { align: 'center' }); });
    const q = new Px(W, H);
    hudBottom(q, 'morgana', { hp: 1, hpMax: 4, bombs: 3, lv: 3, score: 95142, chain: 'CHAIN 24  x1.48' });
    p.g.drawImage(q.c, 0, 330, 160, 30, 0, 90, 160, 30);
    p.g.drawImage(q.c, 480, 330, 160, 30, 160, 90, 160, 30);
    return p;
  };
})();
