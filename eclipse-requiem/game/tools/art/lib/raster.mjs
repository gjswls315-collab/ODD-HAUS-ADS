// RGBA bitmap with pixel-art primitives for authoring placeholder assets offline.
// Shapes are scan-converted at pixel centres (no anti-aliasing). Colours are palette tokens ('S3'),
// hex strings, or objects: { c: 'S3', d: 0..16 } ordered (Bayer 4x4) dither, { c: 'S3', a: 0..255 } alpha.
import { readFileSync } from 'node:fs';

const PAL_FILE = new URL('../../../assets/palette.json', import.meta.url);
export const PAL = {};
for (const r of JSON.parse(readFileSync(PAL_FILE, 'utf8')).ramps) r.colors.forEach((h, i) => (PAL[r.id + i] = h));

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hexCache = new Map();
export function rgba(c) {
  if (Array.isArray(c)) return c;
  const h = PAL[c] || c;
  if (hexCache.has(h)) return hexCache.get(h);
  const v = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), h.length > 7 ? parseInt(h.slice(7, 9), 16) : 255];
  hexCache.set(h, v);
  return v;
}

export function rng(seed) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + f() * (hi - lo);
  f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  return f;
}

export class Bitmap {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
    /** dither origin offset, so tiles can share a dither phase with the screen */
    this.ox = 0;
    this.oy = 0;
  }
  static from(w, h, data) {
    const b = new Bitmap(w, h);
    b.data.set(data);
    return b;
  }
  clone() {
    return Bitmap.from(this.w, this.h, this.data);
  }
  idx(x, y) {
    return (y * this.w + x) * 4;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return [0, 0, 0, 0];
    const i = this.idx(x, y);
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }
  alphaAt(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[this.idx(x, y) + 3];
  }
  plot(x, y, c) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    let col;
    if (typeof c === 'object' && !Array.isArray(c)) {
      if (c.d !== undefined && BAYER[(((y + this.oy) & 3) << 2) | ((x + this.ox) & 3)] >= c.d) return;
      col = rgba(c.c);
      if (c.a !== undefined) col = [col[0], col[1], col[2], c.a];
    } else col = rgba(c);
    const i = this.idx(x, y);
    this.data[i] = col[0];
    this.data[i + 1] = col[1];
    this.data[i + 2] = col[2];
    this.data[i + 3] = col[3];
  }
  clear(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[this.idx(x, y) + 3] = 0;
  }
  span(y, x0, x1, c) {
    for (let x = x0; x < x1; x++) this.plot(x, y, c);
  }
  rect(x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (let j = y; j < y + h; j++) this.span(j, x, x + w, c);
  }
  box(x, y, w, h, c) {
    this.rect(x, y, w, 1, c); this.rect(x, y + h - 1, w, 1, c); this.rect(x, y, 1, h, c); this.rect(x + w - 1, y, 1, h, c);
  }
  /** Scanline polygon fill (even-odd), sampling pixel centres. Pass c = null to erase. */
  poly(pts, c) {
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const sy = y + 0.5, xs = [];
      for (let i = 0, n = pts.length; i < n; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.round(xs[k]), b = Math.round(xs[k + 1]);
        if (c === null) for (let x = a; x < b; x++) this.clear(x, y);
        else this.span(y, a, b, c);
      }
    }
  }
  ell(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (Math.abs(dy) >= 1) continue;
      const hw = rx * Math.sqrt(1 - dy * dy);
      const a = Math.round(cx - hw), b = Math.round(cx + hw);
      if (c === null) for (let x = a; x < b; x++) this.clear(x, y);
      else this.span(y, a, b, c);
    }
  }
  ellRing(cx, cy, rx, ry, t, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (Math.abs(dy) >= 1) continue;
      const hw = rx * Math.sqrt(1 - dy * dy);
      const a = Math.round(cx - hw), b = Math.round(cx + hw);
      const idy = (y + 0.5 - cy) / (ry - t);
      if (ry - t > 0 && Math.abs(idy) < 1) {
        const ihw = (rx - t) * Math.sqrt(1 - idy * idy);
        const ia = Math.round(cx - ihw), ib = Math.round(cx + ihw);
        this.span(y, a, Math.max(a, ia), c);
        this.span(y, Math.min(b, ib), b, c);
      } else this.span(y, a, b, c);
    }
  }
  /** Annulus r0 <= d < r1, optionally filtered by f(dx, dy). */
  ring(cx, cy, r0, r1, c, f) {
    for (let y = Math.floor(cy - r1); y <= Math.ceil(cy + r1); y++)
      for (let x = Math.floor(cx - r1); x <= Math.ceil(cx + r1); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
        if (d >= r0 && d < r1 && (!f || f(dx, dy, d))) this.plot(x, y, c);
      }
  }
  line(x0, y0, x1, y1, c, step = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, i = 0;
    for (;;) {
      if (i++ % step === 0) this.plot(x0, y0, c);
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
  /** Tapered stroke through points: width goes w0 -> w1. */
  stroke(pts, w0, w1, c) {
    const n = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const wa = w0 + (w1 - w0) * (i / n), wb = w0 + (w1 - w0) * ((i + 1) / n);
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const ang = Math.atan2(by - ay, bx - ax), sx = -Math.sin(ang), sy = Math.cos(ang);
      this.poly([[ax + sx * wa / 2, ay + sy * wa / 2], [bx + sx * wb / 2, by + sy * wb / 2], [bx - sx * wb / 2, by - sy * wb / 2], [ax - sx * wa / 2, ay - sy * wa / 2]], c);
      if (wb >= 1.5) this.ell(bx, by, wb / 2, wb / 2, c);
    }
  }
  blit(src, x, y, o = {}) {
    x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < src.h; j++)
      for (let i = 0; i < src.w; i++) {
        const si = src.idx(o.flipX ? src.w - 1 - i : i, o.flipY ? src.h - 1 - j : j);
        const a = src.data[si + 3];
        if (!a) continue;
        const tx = x + i, ty = y + j;
        if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
        if (o.dither !== undefined && BAYER[(((ty + this.oy) & 3) << 2) | ((tx + this.ox) & 3)] >= o.dither) continue;
        const di = this.idx(tx, ty);
        if (a === 255 || this.data[di + 3] === 0) {
          this.data[di] = src.data[si]; this.data[di + 1] = src.data[si + 1]; this.data[di + 2] = src.data[si + 2]; this.data[di + 3] = a;
        } else {
          const k = a / 255;
          for (let q = 0; q < 3; q++) this.data[di + q] = this.data[di + q] * (1 - k) + src.data[si + q] * k;
          this.data[di + 3] = Math.max(this.data[di + 3], a);
        }
      }
  }
  crop(x, y, w, h) {
    const b = new Bitmap(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const p = this.get(x + i, y + j);
      const di = b.idx(i, j);
      b.data[di] = p[0]; b.data[di + 1] = p[1]; b.data[di + 2] = p[2]; b.data[di + 3] = p[3];
    }
    return b;
  }
  /** Highlight opaque pixels on the lit edge (light from the upper right by default). */
  rim(c, sides = 'rt', test) {
    const src = this.clone();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (!src.alphaAt(x, y)) continue;
        if (test && !test(x, y, src.get(x, y))) continue;
        const r = sides.includes('r') && !src.alphaAt(x + 1, y);
        const t = sides.includes('t') && !src.alphaAt(x, y - 1);
        const l = sides.includes('l') && !src.alphaAt(x - 1, y);
        const b = sides.includes('b') && !src.alphaAt(x, y + 1);
        if (r || t || l || b) this.plot(x, y, c);
      }
    return this;
  }
  /** Selective outline: N0 on the shadow side (left/bottom), a darkened neighbour colour on the lit side. */
  selout(dark = 'N0', k = 0.45) {
    const src = this.clone(), d = rgba(dark);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (src.alphaAt(x, y) > 0) continue;
        let lit = null, shade = false;
        if (src.alphaAt(x + 1, y) > 128 || src.alphaAt(x, y - 1) > 128) shade = true;
        if (src.alphaAt(x - 1, y) > 128) lit = src.get(x - 1, y);
        else if (src.alphaAt(x, y + 1) > 128) lit = src.get(x, y + 1);
        if (shade) this.plot(x, y, [d[0], d[1], d[2], 255]);
        else if (lit) this.plot(x, y, [Math.round(lit[0] * k), Math.round(lit[1] * k), Math.round(lit[2] * (k + 0.06)), 255]);
      }
    return this;
  }
  /** Plain outline on every side. */
  outline(c = 'N0') {
    const src = this.clone();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (src.alphaAt(x, y)) continue;
        if (src.alphaAt(x + 1, y) > 128 || src.alphaAt(x - 1, y) > 128 || src.alphaAt(x, y + 1) > 128 || src.alphaAt(x, y - 1) > 128) this.plot(x, y, c);
      }
    return this;
  }
  silhouette(c) {
    const out = new Bitmap(this.w, this.h), col = rgba(c);
    for (let i = 0; i < this.data.length; i += 4) if (this.data[i + 3]) { out.data[i] = col[0]; out.data[i + 1] = col[1]; out.data[i + 2] = col[2]; out.data[i + 3] = this.data[i + 3]; }
    return out;
  }
  /** Remove pixels by ordered dither (0 keeps all, 16 removes all). For dissolve frames. */
  dissolve(level, ox = 0, oy = 0) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (BAYER[(((y + oy) & 3) << 2) | ((x + ox) & 3)] < level) this.clear(x, y);
    return this;
  }
  /** Recolour: map exact palette tokens to other tokens. */
  recolor(map) {
    const m = new Map(Object.entries(map).map(([a, b]) => [rgba(a).slice(0, 3).join(','), rgba(b)]));
    for (let i = 0; i < this.data.length; i += 4) {
      if (!this.data[i + 3]) continue;
      const to = m.get(`${this.data[i]},${this.data[i + 1]},${this.data[i + 2]}`);
      if (to) { this.data[i] = to[0]; this.data[i + 1] = to[1]; this.data[i + 2] = to[2]; }
    }
    return this;
  }
  /** Scatter small clusters of colour over pixels that currently match `on` (texture pass). */
  speckle(r, on, colors, density, size = [1, 2]) {
    const want = new Set((Array.isArray(on) ? on : [on]).map((t) => rgba(t).slice(0, 3).join(',')));
    const n = Math.round(this.w * this.h * density);
    for (let i = 0; i < n; i++) {
      const x = r.int(0, this.w - 1), y = r.int(0, this.h - 1);
      const p = this.get(x, y);
      if (!p[3] || !want.has(p.slice(0, 3).join(','))) continue;
      const w = r.int(size[0], size[1]), h = r.int(1, Math.max(1, size[1] - 1));
      const c = r.pick(colors);
      for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) {
        const q = this.get(x + k, y + j);
        if (q[3] && want.has(q.slice(0, 3).join(','))) this.plot(x + k, y + j, c);
      }
    }
    return this;
  }
}
