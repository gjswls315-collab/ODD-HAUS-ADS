import { data, fontUrl, image } from './assets';
import { makeCanvas } from './canvas';

// Pixel text on the 640x360 grid.
//  'S'    : 5x7 bitmap font from assets/ui/font5x7.png (+ font5x7.font.json) — numbers, labels, latin captions
//  'G9', 'G11', 'G11B' : Galmuri (SIL OFL 1.1, assets/fonts) drawn at its native pixel size and thresholded — Korean text
// Pass `scale` to draw in a scaled coordinate space (e.g. 3 for the 1920x1080 design space: one glyph pixel = one game pixel).

export type PFont = 'S' | 'G9' | 'G11' | 'G11B';
export interface PTextOpts {
  font?: PFont;
  color?: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  outline?: string;
  alpha?: number;
  scale?: number;
}

const GALMURI: Record<Exclude<PFont, 'S'>, { css: string; h: number; base: number }> = {
  G11: { css: '12px Galmuri11', h: 14, base: 11 },
  G11B: { css: '12px Galmuri11B', h: 14, base: 11 },
  G9: { css: '10px Galmuri9', h: 12, base: 9 },
};

export async function loadFonts() {
  const faces: [string, string][] = [['Galmuri11', 'Galmuri11'], ['Galmuri11B', 'Galmuri11-Bold'], ['Galmuri9', 'Galmuri9']];
  await Promise.all(faces.map(async ([fam, file]) => {
    const url = fontUrl(file);
    if (!url) return;
    try {
      const ff = new FontFace(fam, `url(${url})`);
      await ff.load();
      document.fonts.add(ff);
    } catch {
      console.warn('[fonts] failed to load', file);
    }
  }));
}

// ---------------- 5x7 atlas font ----------------
interface FontMeta { chars: string; cols: number; cell: [number, number]; glyph: [number, number]; advance: number; space: number }
let meta: FontMeta | null = null;
let charIndex: Map<string, number> | null = null;
const tintedAtlas = new Map<string, HTMLCanvasElement>();
function small() {
  if (!meta) {
    meta = data<FontMeta>('ui/font5x7.font');
    charIndex = new Map([...(meta?.chars ?? '')].map((c, i) => [c, i]));
  }
  return meta;
}
function atlas(color: string) {
  let a = tintedAtlas.get(color);
  if (!a) {
    const img = image('ui/font5x7');
    const [c, g] = makeCanvas(img.width, img.height);
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    tintedAtlas.set(color, c);
    a = c;
  }
  return a;
}
function smallWidth(str: string) {
  const m = small();
  if (!m) return str.length * 6;
  let w = 0;
  for (const ch of str) w += ch === ' ' ? m.space : m.advance;
  return Math.max(0, w - 1);
}
function drawSmall(g: CanvasRenderingContext2D, str: string, x: number, y: number, color: string, s: number) {
  const m = small();
  if (!m || !charIndex) return;
  const img = atlas(color);
  let cx = x;
  for (const raw of str) {
    if (raw === ' ') { cx += m.space * s; continue; }
    const ch = charIndex.has(raw) ? raw : raw.toUpperCase();
    const i = charIndex.get(ch);
    if (i !== undefined) g.drawImage(img, (i % m.cols) * m.cell[0], Math.floor(i / m.cols) * m.cell[1], m.glyph[0], m.glyph[1], cx, y, m.glyph[0] * s, m.glyph[1] * s);
    cx += m.advance * s;
  }
}

// ---------------- Galmuri masks ----------------
interface Mask { c: HTMLCanvasElement; w: number; h: number }
const masks = new Map<string, Mask>();
const tints = new Map<string, HTMLCanvasElement>();
const scratch = makeCanvas(4, 4)[1];
function mask(str: string, f: Exclude<PFont, 'S'>): Mask {
  const key = f + '\u0000' + str;
  let m = masks.get(key);
  if (m) return m;
  const fm = GALMURI[f];
  scratch.font = fm.css;
  const w = Math.max(1, Math.ceil(scratch.measureText(str).width) + 1);
  const [c, g] = makeCanvas(w, fm.h);
  g.font = fm.css;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#FFFFFF';
  g.fillText(str, 0, fm.base);
  const img = g.getImageData(0, 0, w, fm.h), d = img.data;
  let maxX = 0;
  for (let i = 0; i < d.length; i += 4) {
    const on = d[i + 3] >= 110;
    d[i] = d[i + 1] = d[i + 2] = 255;
    d[i + 3] = on ? 255 : 0;
    if (on) maxX = Math.max(maxX, (i / 4) % w);
  }
  g.putImageData(img, 0, 0);
  m = { c, w: maxX + 1, h: fm.h };
  if (masks.size > 800) masks.clear();
  masks.set(key, m);
  return m;
}
function tint(m: Mask, key: string, color: string) {
  const k = key + '\u0001' + color;
  let t = tints.get(k);
  if (!t) {
    const [c, g] = makeCanvas(m.c.width, m.c.height);
    g.drawImage(m.c, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    if (tints.size > 1600) tints.clear();
    tints.set(k, c);
    t = c;
  }
  return t;
}

export function textHeight(font: PFont = 'S') {
  return font === 'S' ? 7 : font === 'G9' ? 10 : 12;
}
/** Width in glyph pixels (multiply by scale for scaled spaces). */
export function textWidth(str: string, font: PFont = 'S') {
  return font === 'S' ? smallWidth(str) : mask(str, font).w;
}

/** Draw pixel text. Returns the drawn width in the caller's units. */
export function ptext(g: CanvasRenderingContext2D, str: string, x: number, y: number, o: PTextOpts = {}) {
  const font = o.font ?? 'S', s = o.scale ?? 1, color = o.color ?? '#D9CDB6';
  const w = textWidth(str, font) * s, h = textHeight(font) * s;
  if (o.align === 'center') x -= Math.floor(w / s / 2) * s;
  else if (o.align === 'right') x -= w;
  if (o.valign === 'middle') y -= Math.floor(h / s / 2) * s;
  else if (o.valign === 'bottom') y -= h;
  x = Math.round(x / s) * s;
  y = Math.round(y / s) * s;
  const prevA = g.globalAlpha;
  if (o.alpha !== undefined) g.globalAlpha = prevA * o.alpha;
  const smooth = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  if (font === 'S') {
    if (o.outline) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawSmall(g, str, x + dx * s, y + dy * s, o.outline, s);
    drawSmall(g, str, x, y, color, s);
  } else {
    const m = mask(str, font), key = font + '\u0000' + str;
    if (o.outline) { const ot = tint(m, key, o.outline); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(ot, x + dx * s, y + dy * s - s, ot.width * s, ot.height * s); }
    const t = tint(m, key, color);
    g.drawImage(t, x, y - s, t.width * s, t.height * s);
  }
  g.imageSmoothingEnabled = smooth;
  g.globalAlpha = prevA;
  return w;
}
