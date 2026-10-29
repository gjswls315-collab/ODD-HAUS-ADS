import { FONT } from '../core/constants';
import { sheet } from './assets';
import { ditherFill, shade } from './dither';
import { PAL, snap } from './palette';
import { PFont, ptext, textWidth } from './pixeltext';
import { Renderer } from './renderer';
import { SHEET } from './sprites';

// Pixel UI helpers. Layout code may use 1920x1080 design units (r.uiTransform(), 3 design px = 1 game pixel)
// or the 640x360 logical grid (r.logical()); everything is drawn as pixel text, 1-px rules and sprites from
// ui/hud — no vector fonts, gradients, shadows or ornamental frames.

const DESIGN = 3; // design px per logical px

export interface TextOpts {
  size?: number;
  font?: keyof typeof FONT;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  weight?: number | string;
  alpha?: number;
  /** accepted for older call sites; pixel text has no glow */
  glow?: string;
  glowBlur?: number;
  spacing?: number;
  maxWidth?: number;
  stroke?: string;
}

const SMALL = new Set('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.,:/-+x%!?()*<>=\'[]_·× ');

/** Pick a pixel font and integer scale (in design px) for a requested CSS-like size. */
export function fontFor(str: string, size = 24, font: keyof typeof FONT = 'sans', weight: number | string = 400): { f: PFont; sc: number } {
  const small = [...str].every((c) => SMALL.has(c) || SMALL.has(c.toUpperCase()));
  if (font === 'display' && small) return { f: 'S', sc: size >= 120 ? 12 : size >= 72 ? 9 : size >= 40 ? 6 : DESIGN };
  const bold = weight === 'bold' || Number(weight) >= 600;
  if (size >= 54) return { f: 'G11B', sc: 6 };
  if (size >= 30) return { f: bold ? 'G11B' : 'G11', sc: DESIGN };
  return { f: 'G9', sc: DESIGN };
}

const valignOf = (b?: CanvasTextBaseline) => (b === 'middle' ? 'middle' : b === 'alphabetic' || b === 'bottom' || b === 'ideographic' ? 'bottom' : 'top');
const alignOf = (a?: CanvasTextAlign) => (a === 'center' ? 'center' : a === 'right' || a === 'end' ? 'right' : 'left');

/** Pixel text in design units. */
export function text(r: Renderer, str: string, x: number, y: number, o: TextOpts = {}) {
  const { f, sc } = fontFor(str, o.size, o.font, o.weight);
  ptext(r.ctx, str, x, y, {
    font: f, scale: sc, color: snap(o.color ?? PAL.B4), align: alignOf(o.align), valign: valignOf(o.baseline),
    outline: o.stroke ? snap(o.stroke) : undefined, alpha: o.alpha,
  });
}

export function measure(_r: Renderer, str: string, size: number, font: keyof typeof FONT = 'sans', weight: number | string = 400, _spacing = 0) {
  const { f, sc } = fontFor(str, size, font, weight);
  return textWidth(str, f) * sc;
}

/** Dithered fill in design units (snapped to the game-pixel grid). */
export function uiDither(r: Renderer, x: number, y: number, w: number, h: number, level: number, color: string) {
  const ctx = r.ctx;
  ctx.save();
  r.logical();
  ditherFill(ctx, x / DESIGN, y / DESIGN, w / DESIGN, h / DESIGN, level, snap(color));
  ctx.restore();
}

/** 1-game-pixel rectangle outline in design units. */
export function rule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  const s = DESIGN;
  x = Math.round(x / s) * s; y = Math.round(y / s) * s; w = Math.round(w / s) * s; h = Math.round(h / s) * s;
  ctx.fillStyle = snap(color);
  ctx.fillRect(x, y, w, s);
  ctx.fillRect(x, y + h - s, w, s);
  ctx.fillRect(x, y, s, h);
  ctx.fillRect(x + w - s, y, s, h);
}

export type PanelStyle = 'hud' | 'menu' | 'tome' | 'warn';

/** Dark panel: near-black fill (dithered when translucent) and a 1-px ash rule. No ornaments. */
export function panel(r: Renderer, x: number, y: number, w: number, h: number, o: { alpha?: number; style?: PanelStyle; accent?: string; glow?: number } = {}) {
  const ctx = r.ctx;
  const a = o.alpha ?? 0.78;
  const fill = o.style === 'warn' ? PAL.R0 : PAL.N1;
  shade(ctx, Math.round(x / 3) * 3, Math.round(y / 3) * 3, Math.round(w / 3) * 3, Math.round(h / 3) * 3, Math.min(1, a + 0.1), fill);
  rule(ctx, x, y, w, h, o.style === 'warn' ? PAL.R2 : o.style === 'tome' || o.style === 'menu' ? PAL.N5 : PAL.N4);
}

/** Small pixel diamond (design units). */
export function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const n = Math.max(1, Math.round(s / 3));
  for (let i = -n; i <= n; i++) {
    const half = n - Math.abs(i);
    ctx.fillRect(Math.round(x / 3 - half) * 3, Math.round(y / 3 + i) * 3, (half * 2 + 1) * 3, 3);
  }
}

/** Pixel cross (design units). */
export function cross(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const n = Math.max(2, Math.round(s / 3));
  ctx.fillRect(Math.round(x / 3) * 3 - 3, Math.round((y - s) / 3) * 3, 3, n * 6);
  ctx.fillRect(Math.round((x - s * 0.6) / 3) * 3, Math.round((y - s * 0.45) / 3) * 3, Math.round((s * 1.2) / 3) * 3, 3);
}

/** Character emblem: the 16x16 icon from ui/hud, drawn at an integer multiple (design units). */
export function sigil(ctx: CanvasRenderingContext2D, kind: 'cross' | 'moon' | 'rune', x: number, y: number, s: number, _color?: string, _rot = 0) {
  const id = kind === 'cross' ? 'seraphine' : kind === 'moon' ? 'noctis' : 'morgana';
  const sh = sheet(SHEET.hud), k = Math.max(1, Math.round(s / 16)) * 3;
  ctx.save();
  ctx.translate(Math.round(x / 3) * 3, Math.round(y / 3) * 3);
  ctx.scale(k, k);
  sh.draw(ctx, 'icon_' + id, 0, 0, 0);
  ctx.restore();
}

/** Draw a ui/hud sprite in design units at a game-pixel scale (k game px per sprite px). */
export function hudSprite(ctx: CanvasRenderingContext2D, tag: string, i: number, x: number, y: number, k = 1, o: { flash?: boolean; dither?: number } = {}) {
  const sh = sheet(SHEET.hud);
  ctx.save();
  ctx.translate(Math.round(x / 3) * 3, Math.round(y / 3) * 3);
  ctx.scale(3 * k, 3 * k);
  sh.draw(ctx, tag, i, 0, 0, o);
  ctx.restore();
}

export type ButtonState = 'idle' | 'focus' | 'pressed' | 'disabled';

/** Menu button (docs/04 UI-01): text on a dark plate, cursor sprites on focus. */
export function button(r: Renderer, x: number, y: number, w: number, h: number, label: string, state: ButtonState, t = 1, o: { size?: number; font?: keyof typeof FONT; sigilKind?: 'cross' | 'moon' | 'rune'; accent?: string } = {}) {
  const ctx = r.ctx;
  const pressed = state === 'pressed';
  const focus = state === 'focus' || pressed;
  ctx.fillStyle = focus ? PAL.N2 : PAL.N1;
  ctx.fillRect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, Math.round(w / 3) * 3, Math.round(h / 3) * 3);
  rule(ctx, x, y, w, h, focus ? PAL.B3 : state === 'disabled' ? PAL.N3 : PAL.N4);
  const ty = y + h / 2 + (pressed ? 3 : 0);
  text(r, label, x + w / 2, ty, {
    size: o.size ?? 24, font: o.font ?? 'display', weight: 600, align: 'center', baseline: 'middle',
    color: state === 'disabled' ? PAL.N5 : focus ? PAL.B5 : PAL.N8,
  });
  if (pressed) {
    ctx.fillStyle = PAL.R3;
    ctx.fillRect(Math.round((x + w * 0.25) / 3) * 3, Math.round((y + h - 9) / 3) * 3, Math.round((w * 0.5) / 3) * 3, 3);
  }
  if (focus) {
    const f = Math.floor(t * 4) % 2;
    hudSprite(ctx, 'cursor', f, x - 18, y + h / 2);
    ctx.save();
    ctx.translate(Math.round((x + w + 18) / 3) * 3, Math.round((y + h / 2) / 3) * 3);
    ctx.scale(-3, 3);
    sheet(SHEET.hud).draw(ctx, 'cursor', f, 0, 0);
    ctx.restore();
  }
}

/** Keycap hint ("[ENTER] CONFIRM"). Returns the width used (design units). */
export function keyHint(r: Renderer, x: number, y: number, key: string, action: string, size = 18) {
  const ctx = r.ctx;
  const kf = fontFor(key, 18, 'display'), af = fontFor(action, size);
  const kw = Math.max(27, textWidth(key, kf.f) * kf.sc + 12), h = 27;
  ctx.fillStyle = PAL.N2;
  ctx.fillRect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, kw, h);
  rule(ctx, x, y, kw, h, PAL.N6);
  ctx.fillStyle = PAL.N5;
  ctx.fillRect(Math.round(x / 3) * 3 + 3, Math.round(y / 3) * 3 + h - 6, kw - 6, 3);
  ptext(ctx, key, x + kw / 2, y + 6, { font: kf.f, scale: kf.sc, color: PAL.B5, align: 'center' });
  const aw = ptext(ctx, action, x + kw + 9, y + h / 2, { font: af.f, scale: af.sc, color: PAL.N8, valign: 'middle' });
  return kw + 9 + aw + 30;
}

export function keyHints(r: Renderer, x: number, y: number, items: [string, string][]) {
  let cx = x;
  for (const [k, a] of items) cx += keyHint(r, cx, y, k, a);
}

/** Scene wipe: ordered-dither cover (p: 0 = clear, 1 = covered). Drawn in whatever UI transform is active. */
export function inkWipe(r: Renderer, p: number) {
  if (p <= 0) return;
  // diagonal sweep from the lower-left: solid behind the front, a dithered band at the edge
  const ctx = r.ctx;
  ctx.save();
  r.logical();
  const front = p * 1.25 * (640 + 360);
  for (let b = 0; b < 16; b++) {
    const d0 = front - (b + 1) * 12, d1 = front - b * 12;
    if (d1 <= 0) continue;
    const lv = b === 15 ? 16 : 16 - b;
    ctx.beginPath();
    ctx.moveTo(0, 360 - Math.max(0, d0));
    ctx.lineTo(Math.max(0, d0), 360);
    ctx.lineTo(d1, 360);
    ctx.lineTo(0, 360 - d1);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ditherFill(ctx, 0, 0, 640, 360, lv, PAL.N0);
    ctx.restore();
  }
  ctx.fillStyle = PAL.N0;
  ctx.beginPath();
  const solid = Math.max(0, front - 16 * 12);
  ctx.moveTo(0, 360);
  ctx.lineTo(solid, 360);
  ctx.lineTo(0, 360 - solid);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Fade/overlay to a palette colour (a: 0..1). */
export function fade(r: Renderer, a: number, color: string = PAL.N0) {
  if (a <= 0) return;
  const ctx = r.ctx;
  ctx.save();
  r.logical();
  shade(ctx, 0, 0, 640, 360, a, snap(color));
  ctx.restore();
}
