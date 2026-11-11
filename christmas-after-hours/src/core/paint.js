// Canvas-2D "ink & paper" painting toolkit. Every texture in the film is painted with these
// helpers so the whole world shares one hand: wobbly ink lines, dry-brush fills, hatching, grain.
import * as THREE from 'three';
import { rng, lerp } from './util.js';

export const FONT = {
  heavy: 'Anton',
  hand: '"Patrick Hand SC"',
  sans: 'Inter',
};

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function toTexture(c, { repeat = false, aniso = 8, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

export function paint(w, h, fn, opts) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  fn(g, w, h, c);
  return toTexture(c, opts);
}

export function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(c, a = 1) {
  const [r, g, b] = typeof c === 'string' ? hex(c) : c;
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}
export function mix(c1, c2, t) {
  const a = hex(c1), b = hex(c2);
  const r = a.map((v, i) => Math.round(lerp(v, b[i], t)));
  return '#' + r.map((v) => v.toString(16).padStart(2, '0')).join('');
}

// Fill with flat colour, then break it up: blotches, fibres and speckle. `tile` wraps the marks.
export function wash(g, x, y, w, h, color, { seed = 1, blot = 0.1, speck = 0.12, fibre = 0, dark = '#000000', light = '#ffffff', tile = false } = {}) {
  const r = rng(seed);
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = color; g.fillRect(x, y, w, h);
  const wrap = (fn, px, py, rad) => {
    fn(px, py);
    if (!tile) return;
    if (px - rad < x) fn(px + w, py); if (px + rad > x + w) fn(px - w, py);
    if (py - rad < y) fn(px, py + h); if (py + rad > y + h) fn(px, py - h);
  };
  const area = (w * h) / (256 * 256);
  for (let i = 0; i < area * 26; i++) {
    const px = x + r() * w, py = y + r() * h, rad = r.range(18, 70) * Math.sqrt(Math.min(w, h) / 256);
    const col = r() < 0.5 ? dark : light, a = r() * blot;
    wrap((qx, qy) => {
      const gr = g.createRadialGradient(qx, qy, 0, qx, qy, rad);
      gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.fillRect(qx - rad, qy - rad, rad * 2, rad * 2);
    }, px, py, rad);
  }
  for (let i = 0; i < area * 900; i++) {
    g.fillStyle = rgba(r() < 0.55 ? dark : light, r() * speck);
    const s = r() < 0.9 ? 1 : 2;
    g.fillRect(x + r() * w, y + r() * h, s, s);
  }
  if (fibre > 0) {
    g.lineWidth = 1;
    for (let i = 0; i < area * 60; i++) {
      const px = x + r() * w, py = y + r() * h, a = r() * Math.PI, l = r.range(4, 16);
      g.strokeStyle = rgba(r() < 0.5 ? dark : light, r() * fibre);
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke();
    }
  }
  g.restore();
}

// A hand-inked line through `pts` ([[x,y],...]): wobble, pressure, and the odd dry gap.
export function ink(g, pts, { width = 2, color = '#171717', wobble = 1, seed = 1, alpha = 1, dry = 0.06, passes = 1 } = {}) {
  const r = rng(seed * 7919 + pts.length);
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.round(len / 9));
      let px = x0 + (r() - 0.5) * wobble, py = y0 + (r() - 0.5) * wobble;
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        const nx = lerp(x0, x1, t) + (r() - 0.5) * wobble * 1.6;
        const ny = lerp(y0, y1, t) + (r() - 0.5) * wobble * 1.6;
        if (r() > dry) {
          g.strokeStyle = rgba(color, alpha * r.range(0.72, 1));
          g.lineWidth = Math.max(0.4, width * r.range(0.6, 1.3));
          g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
        }
        px = nx; py = ny;
      }
    }
  }
  g.restore();
}

export function inkRect(g, x, y, w, h, o = {}) {
  const e = o.over ?? 3; // lines overshoot the corners a little, like a ruled pen
  ink(g, [[x - e, y], [x + w + e, y]], { ...o, seed: (o.seed || 1) + 1 });
  ink(g, [[x + w, y - e], [x + w, y + h + e]], { ...o, seed: (o.seed || 1) + 2 });
  ink(g, [[x + w + e, y + h], [x - e, y + h]], { ...o, seed: (o.seed || 1) + 3 });
  ink(g, [[x, y + h + e], [x, y - e]], { ...o, seed: (o.seed || 1) + 4 });
}

export function inkCircle(g, cx, cy, rad, o = {}) {
  const n = Math.max(14, Math.round(rad * 0.6));
  const pts = [];
  for (let i = 0; i <= n + 1; i++) { const a = (i / n) * Math.PI * 2; pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
  ink(g, pts, o);
}

// Parallel hatching clipped to a rect.
export function hatch(g, x, y, w, h, { angle = -0.9, gap = 7, width = 1.2, color = '#171717', alpha = 0.5, seed = 1, wobble = 1.2 } = {}) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const r = rng(seed);
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const diag = Math.hypot(w, h);
  const cx = x + w / 2, cy = y + h / 2;
  for (let d = -diag / 2; d < diag / 2; d += gap * r.range(0.7, 1.3)) {
    const ox = cx - dy * d, oy = cy + dx * d;
    const l0 = -diag / 2 * r.range(0.5, 1), l1 = diag / 2 * r.range(0.5, 1);
    ink(g, [[ox + dx * l0, oy + dy * l0], [ox + dx * l1, oy + dy * l1]], { width, color, alpha, wobble, seed: seed + d, dry: 0.12 });
  }
  g.restore();
}

// Lettering. `rough` bites specks out of the letters like worn sign paint / old print.
export function text(g, str, x, y, size, o = {}) {
  const { font = FONT.heavy, color = '#E8DFC8', align = 'center', base = 'alphabetic', track = 0, rough = 0, seed = 3, weight = '', stroke = null, strokeW = 0, squash = 1 } = o;
  if (rough > 0 && !o._inner) {
    // wear is punched out on a scratch layer so it never bites into what is underneath
    const c = canvas(g.canvas.width, g.canvas.height);
    const lg = c.getContext('2d');
    lg.setTransform(g.getTransform());
    const wpx = text(lg, str, x, y, size, { ...o, _inner: true });
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, 0, 0); g.restore();
    return wpx;
  }
  g.save();
  g.font = `${weight} ${size}px ${font}`;
  g.textAlign = align; g.textBaseline = base;
  if ('letterSpacing' in g) g.letterSpacing = `${track}px`;
  g.translate(x, y); g.scale(squash, 1);
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = strokeW; g.lineJoin = 'round'; g.strokeText(str, 0, 0); }
  g.fillStyle = color; g.fillText(str, 0, 0);
  const m = g.measureText(str);
  g.restore();
  const wpx = m.width * squash;
  if (rough > 0) {
    const r = rng(seed + str.length * 31);
    const left = align === 'center' ? x - wpx / 2 : align === 'right' ? x - wpx : x;
    g.save();
    g.globalCompositeOperation = 'destination-out';
    const n = (wpx * size) / 40 * rough;
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgba(0,0,0,${r.range(0.25, 0.9)})`;
      const s = r() < 0.8 ? r.range(0.6, 1.6) : r.range(1.5, 4);
      g.beginPath(); g.arc(left + r() * wpx, y - size * r.range(-0.15, 0.95), s, 0, 7); g.fill();
    }
    g.restore();
  }
  return wpx;
}

// Draw something on a scratch layer (so destination-out wear only bites that layer), then stamp it.
export function layer(g, fn, { alpha = 1, op = 'source-over' } = {}) {
  const c = canvas(g.canvas.width, g.canvas.height);
  const lg = c.getContext('2d');
  fn(lg);
  g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = op;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(c, 0, 0);
  g.restore();
}

export function vignette(g, w, h, strength = 0.35, color = '#000000') {
  const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.55);
  gr.addColorStop(0, rgba(color, 0)); gr.addColorStop(1, rgba(color, strength));
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}

// Aged paper: warm base, foxing, fibres, darker edges.
export function paper(g, x, y, w, h, { color = '#E8DFC8', seed = 1, age = 1 } = {}) {
  wash(g, x, y, w, h, color, { seed, blot: 0.07 * age, speck: 0.1 * age, fibre: 0.1 * age, dark: '#5b4630', light: '#fff8e6' });
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const gr = g.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.hypot(w, h) * 0.6);
  gr.addColorStop(0, 'rgba(90,65,35,0)'); gr.addColorStop(1, `rgba(90,65,35,${0.22 * age})`);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.restore();
}

// The ODD HAUS wordmark: heavy, slightly condensed, hand-cut feel. Returns drawn width.
export function wordmark(g, x, y, size, { color = '#E8DFC8', rough = 0.5, seed = 5, align = 'center', stacked = false, track = null } = {}) {
  const tr = track ?? size * 0.035;
  if (stacked) {
    text(g, 'ODD', x, y, size, { color, rough, seed, align, track: tr });
    return text(g, 'HAUS', x, y + size * 0.98, size, { color, rough, seed: seed + 1, align, track: tr });
  }
  return text(g, 'ODD HAUS', x, y, size, { color, rough, seed, align, track: tr });
}
