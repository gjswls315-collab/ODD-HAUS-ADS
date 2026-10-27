import { Ctx, hex, makeCanvas } from './canvas';

// Procedural pixel-art toolkit: draw with vector shapes, then quantise to a palette and add a 1px outline,
// so every sprite ends up with crisp, hand-pixelled looking edges.

export const OUTLINE = '#0B0B0F';

export function quantize(c: HTMLCanvasElement, palette: string[], alphaCut = 110) {
  const g = c.getContext('2d')!;
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const pal = palette.map(hex);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < alphaCut) {
      d[i + 3] = 0;
      continue;
    }
    // un-premultiply edge pixels that were blended with transparency
    const a = d[i + 3] / 255;
    const r = d[i] / a, gg = d[i + 1] / a, b = d[i + 2] / a;
    let best = 0, bd = Infinity;
    for (let p = 0; p < pal.length; p++) {
      const [pr, pg, pb] = pal[p];
      const dd = (pr - r) * (pr - r) * 0.3 + (pg - gg) * (pg - gg) * 0.59 + (pb - b) * (pb - b) * 0.11;
      if (dd < bd) {
        bd = dd;
        best = p;
      }
    }
    d[i] = pal[best][0];
    d[i + 1] = pal[best][1];
    d[i + 2] = pal[best][2];
    d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

export function outline(c: HTMLCanvasElement, color = OUTLINE, diagonal = false) {
  const g = c.getContext('2d')!;
  const w = c.width, h = c.height;
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const [r, gg, b] = hex(color);
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  const nb = diagonal ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (solid[y * w + x]) continue;
      for (const [dx, dy] of nb) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && solid[ny * w + nx]) {
          const i = (y * w + x) * 4;
          d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
          break;
        }
      }
    }
  g.putImageData(img, 0, 0);
}

/** Build a sprite: draw vector shapes, quantise to palette, outline. */
export function sprite(w: number, h: number, draw: (g: Ctx) => void, palette: string[], outlineColor: string | null = OUTLINE): HTMLCanvasElement {
  const [c, g] = makeCanvas(w + 2, h + 2);
  g.imageSmoothingEnabled = true;
  g.translate(1, 1);
  draw(g);
  quantize(c, outlineColor ? [...palette] : palette);
  if (outlineColor) outline(c, outlineColor);
  return c;
}

/** Sprite from character rows + palette map ('.' = transparent). */
export function grid(rows: string[], pal: Record<string, string>, outlineColor: string | null = null) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const [c, g] = makeCanvas(w + (outlineColor ? 2 : 0), h + (outlineColor ? 2 : 0));
  const o = outlineColor ? 1 : 0;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x + o, y + o, 1, 1);
    }
  });
  if (outlineColor) outline(c, outlineColor);
  return c;
}

// ---------- shape helpers (vector, used before quantisation) ----------
export function poly(g: Ctx, pts: number[][], fill: string) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

/** Smooth closed shape through points (quadratic midpoints). */
export function blob(g: Ctx, pts: number[][], fill: string) {
  g.beginPath();
  const n = pts.length;
  const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]);
  g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], m = mid(p, pts[(i + 1) % n]);
    g.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

export function ell(g: Ctx, x: number, y: number, rx: number, ry: number, rot: number, fill: string) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
}

export function circ(g: Ctx, x: number, y: number, r: number, fill: string) {
  ell(g, x, y, r, r, 0, fill);
}

export function line(g: Ctx, x1: number, y1: number, x2: number, y2: number, w: number, color: string, cap: CanvasLineCap = 'round') {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineWidth = w;
  g.lineCap = cap;
  g.strokeStyle = color;
  g.stroke();
}

export function curve(g: Ctx, pts: number[][], w: number, color: string) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 3) g.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
  else if (pts.length === 4) g.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
  else for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.lineWidth = w;
  g.lineCap = 'round';
  g.strokeStyle = color;
  g.stroke();
}

/** Feather / leaf shape pointing along `ang` from (x,y). */
export function feather(g: Ctx, x: number, y: number, ang: number, len: number, wid: number, fill: string) {
  const cx = x + Math.cos(ang) * len * 0.5, cy = y + Math.sin(ang) * len * 0.5;
  ell(g, cx, cy, len * 0.5, wid, ang, fill);
}

/** Flip a canvas horizontally. */
export function flipX(src: HTMLCanvasElement) {
  const [c, g] = makeCanvas(src.width, src.height);
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

/** Tint copy (multiplies colour, keeps alpha). */
export function tinted(src: HTMLCanvasElement, color: string, alpha = 1) {
  const [c, g] = makeCanvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Solid silhouette of a sprite (for hit flashes and shadows). */
export function silhouette(src: HTMLCanvasElement, color: string) {
  return tinted(src, color, 1);
}
