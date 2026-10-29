import { makeCanvas } from './canvas';

// Ordered-dither (4x4 Bayer) masks. Used instead of alpha fades so transitions stay on the pixel palette.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const tiles = new Map<string, HTMLCanvasElement>();

/** 4x4 tile where `level` of 16 cells are filled with `color` (level 0 = empty, 16 = solid). */
export function ditherTile(level: number, color = '#000000') {
  level = Math.max(0, Math.min(16, Math.round(level)));
  const key = level + color;
  let t = tiles.get(key);
  if (!t) {
    const [c, g] = makeCanvas(4, 4);
    g.fillStyle = color;
    for (let i = 0; i < 16; i++) if (BAYER[i] < level) g.fillRect(i % 4, (i / 4) | 0, 1, 1);
    tiles.set(key, c);
    t = c;
  }
  return t;
}

export function ditherFill(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, level: number, color = '#000000') {
  if (level <= 0) return;
  const p = g.createPattern(ditherTile(level, color), 'repeat');
  if (!p) return;
  g.fillStyle = p;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Flat translucent darkening/tint (for dims under menus and stage escalation; dithers read as noise full-screen). */
export function shade(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: number, color = '#07080B') {
  if (a <= 0) return;
  const prev = g.globalAlpha;
  g.globalAlpha = prev * Math.min(1, a);
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  g.globalAlpha = prev;
}

/** Keep only a dithered fraction of what is already drawn in `g` (for dissolve-in of a whole layer). */
export function ditherMask(g: CanvasRenderingContext2D, w: number, h: number, level: number) {
  const prev = g.globalCompositeOperation;
  g.globalCompositeOperation = 'destination-in';
  ditherFill(g, 0, 0, w, h, level, '#000000');
  g.globalCompositeOperation = prev;
}
