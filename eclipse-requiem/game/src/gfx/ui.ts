import { C, FONT } from '../core/constants';
import { TAU } from '../core/math';
import { makeCanvas, rgba } from './canvas';
import { Renderer } from './renderer';

// UI drawing helpers in 1920x1080 design space (docs/04). Call r.uiTransform() before using.

export interface TextOpts {
  size?: number;
  font?: keyof typeof FONT;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  weight?: number | string;
  alpha?: number;
  glow?: string;
  glowBlur?: number;
  spacing?: number;
  maxWidth?: number;
  stroke?: string;
}

export function text(r: Renderer, str: string, x: number, y: number, o: TextOpts = {}) {
  const ctx = r.ctx;
  ctx.save();
  ctx.font = `${o.weight ?? 400} ${o.size ?? 24}px ${FONT[o.font ?? 'sans']}`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = o.baseline ?? 'top';
  ctx.globalAlpha *= o.alpha ?? 1;
  const anyCtx = ctx as unknown as { letterSpacing?: string };
  if (o.spacing && 'letterSpacing' in ctx) anyCtx.letterSpacing = `${o.spacing}px`;
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = (o.glowBlur ?? 12) * r.s;
  }
  if (o.stroke) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = o.stroke;
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y, o.maxWidth);
  }
  ctx.fillStyle = o.color ?? C.ivory;
  ctx.fillText(str, x, y, o.maxWidth);
  ctx.restore();
}

export function measure(r: Renderer, str: string, size: number, font: keyof typeof FONT = 'sans', weight: number | string = 400, spacing = 0) {
  const ctx = r.ctx;
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT[font]}`;
  const anyCtx = ctx as unknown as { letterSpacing?: string };
  if (spacing && 'letterSpacing' in ctx) anyCtx.letterSpacing = `${spacing}px`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

// ---------- stained glass lattice pattern (8% panel texture) ----------
let lattice: CanvasPattern | null = null;
function latticePattern(r: Renderer) {
  if (lattice) return lattice;
  const [c, g] = makeCanvas(48, 48);
  g.strokeStyle = 'rgba(123,92,199,1)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(24, 0); g.lineTo(48, 24); g.lineTo(24, 48); g.lineTo(0, 24); g.closePath();
  g.stroke();
  g.fillStyle = 'rgba(89,183,201,0.6)';
  g.fillRect(22, 22, 4, 4);
  lattice = r.ctx.createPattern(c, 'repeat');
  return lattice;
}

export type PanelStyle = 'hud' | 'menu' | 'tome' | 'warn';

export function panel(r: Renderer, x: number, y: number, w: number, h: number, o: { alpha?: number; style?: PanelStyle; accent?: string; glow?: number } = {}) {
  const ctx = r.ctx;
  const style = o.style ?? 'hud';
  const a = o.alpha ?? 0.78;
  ctx.save();
  // body
  ctx.fillStyle = style === 'warn' ? rgba('#1A0A0E', 0.8) : style === 'tome' ? rgba('#16121C', Math.min(1, a + 0.1)) : rgba(C.charcoal, a);
  ctx.fillRect(x, y, w, h);
  if (style !== 'warn') {
    ctx.globalAlpha = 0.08 * (a / 0.78);
    ctx.fillStyle = latticePattern(r)!;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }
  // frame
  const accent = o.accent ?? C.gold;
  if (o.glow) {
    ctx.shadowColor = rgba(accent, 0.55 * o.glow);
    ctx.shadowBlur = 18 * r.s;
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = style === 'warn' ? C.blood : C.frame;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(accent, style === 'warn' ? 0.0 : 0.55);
  ctx.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
  // corner ornaments
  if (style === 'menu' || style === 'tome') {
    ctx.fillStyle = accent;
    for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) diamond(ctx, cx, cy, style === 'tome' ? 9 : 6);
  }
  if (style === 'tome') {
    // top arch ornament
    ctx.strokeStyle = rgba(accent, 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 60, y + 12);
    ctx.quadraticCurveTo(x + w / 2, y - 18, x + w / 2 + 60, y + 12);
    ctx.stroke();
    ctx.fillStyle = accent;
    cross(ctx, x + w / 2, y - 6, 10);
  }
  ctx.restore();
}

export function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s, y);
  ctx.closePath();
  ctx.fill();
}

export function cross(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const t = Math.max(2, s * 0.28);
  ctx.fillRect(x - t / 2, y - s, t, s * 2);
  ctx.fillRect(x - s * 0.6, y - s * 0.45 - t / 2, s * 1.2, t);
}

/** Small holy sigil used beside focused menu items and on character cards. */
export function sigil(ctx: CanvasRenderingContext2D, kind: 'cross' | 'moon' | 'rune', x: number, y: number, s: number, color: string, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, s * 0.08);
  if (kind === 'cross') {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.7, 0, TAU);
    ctx.stroke();
    cross(ctx, 0, 0, s);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.fillRect(Math.cos(a) * s * 0.95 - 1, Math.sin(a) * s * 0.95 - 1, 2.5, 2.5);
    }
  } else if (kind === 'moon') {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.8, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.55, 0.6, TAU - 0.6);
    ctx.arc(s * 0.22, 0, s * 0.42, TAU - 0.9, 0.9, true);
    ctx.closePath();
    ctx.fill();
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, sgn * s * 0.8);
      ctx.lineTo(-s * 0.9, sgn * s * 1.15);
      ctx.lineTo(-s * 0.3, sgn * s * 0.75);
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.85, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.6, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6);
      ctx.lineTo(Math.cos(a + 2.1) * s * 0.6, Math.sin(a + 2.1) * s * 0.6);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.16, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export type ButtonState = 'idle' | 'focus' | 'pressed' | 'disabled';

/** Menu button (docs/04 UI-01). `t` is time since focus for line/sigil animation. */
export function button(r: Renderer, x: number, y: number, w: number, h: number, label: string, state: ButtonState, t = 1, o: { size?: number; font?: keyof typeof FONT; sigilKind?: 'cross' | 'moon' | 'rune'; accent?: string } = {}) {
  const ctx = r.ctx;
  const accent = o.accent ?? C.gold;
  ctx.save();
  const pressed = state === 'pressed';
  const focus = state === 'focus' || pressed;
  ctx.fillStyle = focus ? rgba(C.violetdark, pressed ? 0.95 : 0.85) : rgba(C.charcoal, state === 'disabled' ? 0.5 : 0.7);
  ctx.fillRect(x, y, w, h);
  if (focus) {
    ctx.shadowColor = rgba(accent, 0.4);
    ctx.shadowBlur = 14 * r.s;
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = focus ? accent : state === 'disabled' ? '#3A3540' : C.frame;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.shadowBlur = 0;
  const ty = y + h / 2 + (pressed ? 3 : 0);
  text(r, label, x + w / 2, ty, {
    size: o.size ?? 24,
    font: o.font ?? 'display',
    weight: 600,
    align: 'center',
    baseline: 'middle',
    spacing: 2,
    color: state === 'disabled' ? rgba(C.sub, 0.5) : focus ? C.ivory : C.sub,
  });
  if (pressed) {
    ctx.fillStyle = C.blood;
    ctx.fillRect(x + w * 0.25, y + h - 9, w * 0.5, 2);
  }
  if (focus) {
    const k = Math.min(1, t / 0.18);
    const len = 48 * k;
    ctx.strokeStyle = rgba(accent, 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 12, y + h / 2);
    ctx.lineTo(x - 12 - len, y + h / 2);
    ctx.moveTo(x + w + 12, y + h / 2);
    ctx.lineTo(x + w + 12 + len, y + h / 2);
    ctx.stroke();
    ctx.globalAlpha = Math.min(1, t / 0.12);
    sigil(ctx, o.sigilKind ?? 'cross', x - 24 - len, y + h / 2, 12, accent, 0);
    sigil(ctx, o.sigilKind ?? 'cross', x + w + 24 + len, y + h / 2, 12, accent, 0);
  }
  if (state === 'disabled') {
    ctx.strokeStyle = rgba(C.sub, 0.5);
    ctx.lineWidth = 2;
    const lx = x + w - 30, ly = y + h / 2;
    ctx.strokeRect(lx - 7, ly - 2, 14, 11);
    ctx.beginPath();
    ctx.arc(lx, ly - 3, 5, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}

/** Keycap hint ("[ENTER] CONFIRM"). Returns the width used. */
export function keyHint(r: Renderer, x: number, y: number, key: string, action: string, size = 18) {
  const ctx = r.ctx;
  const kw = Math.max(30, measure(r, key, size - 2, 'sans', 700) + 16);
  ctx.save();
  ctx.fillStyle = rgba(C.charcoal, 0.85);
  ctx.fillRect(x, y, kw, size + 10);
  ctx.strokeStyle = C.frame;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, kw - 2, size + 8);
  ctx.restore();
  text(r, key, x + kw / 2, y + (size + 10) / 2 + 1, { size: size - 2, weight: 700, align: 'center', baseline: 'middle', color: C.ivory });
  text(r, action, x + kw + 8, y + (size + 10) / 2 + 1, { size, align: 'left', baseline: 'middle', color: C.sub });
  return kw + 8 + measure(r, action, size) + 30;
}

export function keyHints(r: Renderer, x: number, y: number, items: [string, string][]) {
  let cx = x;
  for (const [k, a] of items) cx += keyHint(r, cx, y, k, a);
}

/** Black ink-blot wipe used for major screen transitions (docs/01 §3). p: 0 = clear, 1 = covered. */
export function inkWipe(r: Renderer, p: number) {
  if (p <= 0) return;
  const ctx = r.ctx;
  ctx.save();
  ctx.fillStyle = '#050508';
  if (p >= 1) {
    ctx.fillRect(-10, -10, 1940, 1100);
  } else {
    const R = 2300 * p;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 0.5;
      const rr = R * (0.75 + 0.25 * Math.sin(i * 2.3 + 1));
      ctx.moveTo(-40, 1120);
      ctx.arc(-40, 1120, rr, -a - 0.4, -a + 0.4);
    }
    ctx.arc(-40, 1120, R * 0.82, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function fade(r: Renderer, a: number, color = '#050508') {
  if (a <= 0) return;
  const ctx = r.ctx;
  ctx.save();
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = color;
  ctx.fillRect(-10, -10, 1940, 1100);
  ctx.restore();
}
