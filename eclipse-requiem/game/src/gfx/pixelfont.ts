import { Renderer } from './renderer';

// 5x7 bitmap font for HUD numbers and labels (docs/00 §5: fixed-width pixel digits, self-made).
// Each glyph: 7 rows of 5 pixels, rows separated by spaces.
const G: Record<string, string> = {
  A: '.###. #...# #...# ##### #...# #...# #...#',
  B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.###. #...# #.... #.... #.... #...# .###.',
  D: '####. #...# #...# #...# #...# #...# ####.',
  E: '##### #.... #.... ####. #.... #.... #####',
  F: '##### #.... #.... ####. #.... #.... #....',
  G: '.###. #...# #.... #.### #...# #...# .###.',
  H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '.###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.',
  J: '..### ...#. ...#. ...#. ...#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
  L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#',
  N: '#...# #...# ##..# #.#.# #..## #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.',
  P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#',
  R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.#### #.... #.... .###. ....# ....# ####.',
  T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.',
  V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# #.#.# .#.#.',
  X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
  Z: '##### ....# ...#. ..#.. .#... #.... #####',
  '0': '.###. #...# #..## #.#.# ##..# #...# .###.',
  '1': '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
  '2': '.###. #...# ....# ...#. ..#.. .#... #####',
  '3': '####. ....# ....# .###. ....# ....# ####.',
  '4': '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
  '5': '##### #.... ####. ....# ....# #...# .###.',
  '6': '..##. .#... #.... ####. #...# #...# .###.',
  '7': '##### ....# ...#. ..#.. .#... .#... .#...',
  '8': '.###. #...# #...# .###. #...# #...# .###.',
  '9': '.###. #...# #...# .#### ....# ...#. .##..',
  '.': '..... ..... ..... ..... ..... .##.. .##..',
  ',': '..... ..... ..... ..... .##.. ..#.. .#...',
  ':': '..... .##.. .##.. ..... .##.. .##.. .....',
  '/': '....# ...#. ...#. ..#.. .#... .#... #....',
  '-': '..... ..... ..... ##### ..... ..... .....',
  '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....',
  x: '..... ..... #...# .#.#. ..#.. .#.#. #...#',
  '%': '##..# ##..# ...#. ..#.. .#... #..## #..##',
  '!': '..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..',
  '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
  '(': '...#. ..#.. .#... .#... .#... ..#.. ...#.',
  ')': '.#... ..#.. ...#. ...#. ...#. ..#.. .#...',
  '*': '..... ..#.. #.#.# .###. #.#.# ..#.. .....',
  '<': '...#. ..#.. .#... #.... .#... ..#.. ...#.',
  '>': '.#... ..#.. ...#. ....# ...#. ..#.. .#...',
  '=': '..... ..... ##### ..... ##### ..... .....',
  "'": '..#.. ..#.. .#... ..... ..... ..... .....',
  '[': '.###. .#... .#... .#... .#... .#... .###.',
  ']': '.###. ...#. ...#. ...#. ...#. ...#. .###.',
  '_': '..... ..... ..... ..... ..... ..... #####',
  '·': '..... ..... ..... ..#.. ..... ..... .....',
};

const GLYPH_W = 5, GLYPH_H = 7, SPACE_W = 3, GAP = 1;
const glyphs = new Map<string, Uint8Array>();
for (const [ch, s] of Object.entries(G)) {
  const bits = new Uint8Array(GLYPH_W * GLYPH_H);
  const rows = s.split(' ');
  for (let y = 0; y < GLYPH_H; y++) for (let x = 0; x < GLYPH_W; x++) bits[y * GLYPH_W + x] = rows[y]?.[x] === '#' ? 1 : 0;
  glyphs.set(ch, bits);
}

function norm(ch: string) {
  if (ch === 'x') return 'x';
  return ch.toUpperCase();
}

/** Width of text in font pixels. */
export function pixelTextWidth(text: string) {
  let w = 0;
  for (const ch of text) w += (ch === ' ' ? SPACE_W : GLYPH_W) + GAP;
  return Math.max(0, w - GAP);
}

export interface PixelTextOpts {
  color?: string;
  align?: 'left' | 'center' | 'right';
  shadow?: string | null;
  alpha?: number;
}

/**
 * Draw pixel text at UI design coordinates. `unit` is the size of one font pixel in UI px (3 = one logical pixel).
 * Rendering happens in backing pixels with an integer unit so glyphs stay crisp at any window size.
 */
export function pixelText(r: Renderer, text: string, x: number, y: number, unit: number, opts: PixelTextOpts = {}) {
  const ctx = r.ctx;
  const u = Math.max(1, Math.round(unit * r.s));
  const tw = pixelTextWidth(text) * u;
  let bx = Math.round(r.uiToScreenX(x));
  const by = Math.round(r.uiToScreenY(y));
  if (opts.align === 'center') bx -= Math.round(tw / 2);
  else if (opts.align === 'right') bx -= tw;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = opts.alpha ?? 1;
  const path = new Path2D();
  let cx = bx;
  for (const raw of text) {
    if (raw === ' ') {
      cx += (SPACE_W + GAP) * u;
      continue;
    }
    const bits = glyphs.get(norm(raw));
    if (bits) {
      for (let gy = 0; gy < GLYPH_H; gy++)
        for (let gx = 0; gx < GLYPH_W; gx++) if (bits[gy * GLYPH_W + gx]) path.rect(cx + gx * u, by + gy * u, u, u);
    }
    cx += (GLYPH_W + GAP) * u;
  }
  if (opts.shadow !== null) {
    ctx.translate(u, u);
    ctx.fillStyle = opts.shadow ?? 'rgba(5,5,8,0.85)';
    ctx.fill(path);
    ctx.translate(-u, -u);
  }
  ctx.fillStyle = opts.color ?? '#E9E1D3';
  ctx.fill(path);
  ctx.restore();
  return tw / r.s;
}

/** Draw pixel text directly into a world (logical px) context, 1 font pixel = 1 logical pixel. */
export function worldPixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, align: 'left' | 'center' = 'left') {
  let cx = Math.round(align === 'center' ? x - pixelTextWidth(text) / 2 : x);
  const cy = Math.round(y);
  ctx.fillStyle = color;
  for (const raw of text) {
    if (raw === ' ') {
      cx += SPACE_W + GAP;
      continue;
    }
    const bits = glyphs.get(norm(raw));
    if (bits) for (let gy = 0; gy < GLYPH_H; gy++) for (let gx = 0; gx < GLYPH_W; gx++) if (bits[gy * GLYPH_W + gx]) ctx.fillRect(cx + gx, cy + gy, 1, 1);
    cx += GLYPH_W + GAP;
  }
}

export const PIXEL_GLYPH_H = GLYPH_H;
