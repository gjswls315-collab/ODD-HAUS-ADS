import { H, W } from '../core/constants';
import { fxRng as R, TAU } from '../core/math';
import { sheet } from '../gfx/assets';
import { Ctx } from '../gfx/canvas';
import { snap } from '../gfx/palette';
import { ptext } from '../gfx/pixeltext';
import { GlowColor, SHEET } from '../gfx/sprites';

// Effects (docs/03 §4-8: shake cap 3px, flash ≤ 1/s).
//  - Sprite animations from the effect sheets (sprites/fx, sprites/hero_*_fx): hits, bursts, rings, charge release …
//  - Pixel debris: 1–2 px particles whose colours are snapped to the palette.
//  - Score popups in the 5x7 bitmap font.
// There is no additive glow pass; brightness comes from the sprites' own highlight colours.

interface Part {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number;
  color: string; grav: number; drag: number;
}
interface Anim {
  key: string; tag: string;
  x: number; y: number; vx: number; vy: number; grav: number;
  t: number; dur: number; delay: number;
  flipX: boolean; alpha: number; loops: number;
}
export interface AnimOpts { vx?: number; vy?: number; grav?: number; flipX?: boolean; delay?: number; alpha?: number; loops?: number }
export interface Popup { x: number; y: number; text: string; life: number; color: string }

const MAX_PARTS = 700;
const MAX_ANIMS = 220;
/** Default smoke/ember colours for explosions (palette: crimson highlight, bone, ash). */
const EMBERS = ['#FFF3F1', '#FF8C93', '#C91C30', '#4D5461'];

export class Fx {
  parts: Part[] = [];
  anims: Anim[] = [];
  popups: Popup[] = [];
  ash: { x: number; y: number; vx: number; vy: number; f: number }[] = [];
  shakeAmp = 0;
  shakeT = 0;
  shakeDur = 0;
  shakeX = 0;
  shakeY = 0;
  flashA = 0;
  flashColor = '#ECEEF1';
  private lastFlash = -9;
  time = 0;
  shakeScale = 1;
  flashReduce = false;

  constructor(ashCount = 40) {
    for (let i = 0; i < ashCount; i++) this.ash.push(this.newAsh(true));
  }
  private newAsh(anywhere: boolean) {
    return { x: anywhere ? R.range(0, W) : W + R.range(0, 20), y: R.range(0, H), vx: -R.range(8, 22), vy: R.range(-3, 6), f: R.int(0, 2) };
  }

  /** Pixel debris. `glow` is accepted for older call sites and ignored. */
  spark(x: number, y: number, n: number, colors: string[], speed = 80, o: { grav?: number; life?: number; size?: number; glow?: GlowColor; dir?: number; spread?: number; drag?: number } = {}) {
    for (let i = 0; i < n && this.parts.length < MAX_PARTS; i++) {
      const a = o.dir !== undefined ? o.dir + R.range(-(o.spread ?? 0.6), o.spread ?? 0.6) : R.range(0, TAU);
      const sp = speed * R.range(0.3, 1);
      const life = (o.life ?? 0.5) * R.range(0.6, 1.2);
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life,
        size: o.size ?? (R.next() < 0.3 ? 2 : 1), color: snap(colors[R.int(0, colors.length - 1)]),
        grav: o.grav ?? 0, drag: o.drag ?? 2.5,
      });
    }
  }

  /** Play a sprite animation once (or `loops` times) at (x, y). */
  anim(key: string, tag: string, x: number, y: number, o: AnimOpts = {}) {
    if (this.anims.length >= MAX_ANIMS) this.anims.shift();
    const sh = sheet(key);
    this.anims.push({
      key, tag, x, y, vx: o.vx ?? 0, vy: o.vy ?? 0, grav: o.grav ?? 0,
      t: 0, dur: sh.tag(tag).total * (o.loops ?? 1), delay: o.delay ?? 0, flipX: !!o.flipX, alpha: o.alpha ?? 1, loops: o.loops ?? 1,
    });
  }

  /** Expanding shock ring sprite (white/pearl, or crimson for enemy-side events). */
  ring(x: number, y: number, red = false) {
    this.anim(SHEET.fx, red ? 'ring_red' : 'ring', x, y);
  }

  hit(x: number, y: number, metal = false) {
    this.anim(SHEET.fx, metal ? 'spark_metal' : 'spark', x, y);
  }

  explosion(x: number, y: number, size: 's' | 'm' | 'l', palette: string[] = EMBERS) {
    const k = size === 's' ? 1 : size === 'm' ? 2.2 : 4;
    this.anim(SHEET.fx, size === 's' ? 'burst_s' : size === 'm' ? 'burst_m' : 'burst_l', x, y);
    if (size === 'l') this.anim(SHEET.fx, 'burst_m', x + R.range(-14, 14), y + R.range(-12, 12), { delay: 0.12 });
    this.spark(x, y, Math.round(6 * k), palette, 70 * k, { life: 0.45 + 0.1 * k, size: size === 's' ? 1 : 2 });
    this.spark(x, y, Math.round(3 * k), ['#20242C', '#3A404B'], 30 * k, { life: 0.8, size: 2, grav: -10 });
  }

  popup(x: number, y: number, text: string, color = '#D9CDB6') {
    if (this.popups.length >= 12) this.popups.shift();
    this.popups.push({ x, y, text, life: 0.6, color: snap(color) });
  }

  shake(px: number, dur: number) {
    if (this.shakeScale <= 0) return;
    this.shakeAmp = Math.min(3, Math.max(this.shakeAmp * (this.shakeT / Math.max(0.001, this.shakeDur)), px));
    this.shakeDur = Math.max(dur, 0.05);
    this.shakeT = this.shakeDur;
  }

  /** Full-screen flash, limited to once per second (docs/00 §7). Drawn by the HUD as a dithered overlay. */
  flash(a: number, color = '#ECEEF1') {
    if (this.time - this.lastFlash < 1 && a < 0.9) return;
    this.lastFlash = this.time;
    this.flashColor = snap(this.flashReduce ? '#D9AD52' : color);
    this.flashA = Math.max(this.flashA, this.flashReduce ? a * 0.35 : a);
  }

  update(dt: number) {
    this.time += dt;
    for (const p of this.parts) {
      p.life -= dt;
      p.vx -= p.vx * p.drag * dt;
      p.vy -= p.vy * p.drag * dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const a of this.anims) {
      if (a.delay > 0) { a.delay -= dt; continue; }
      a.t += dt;
      a.vy += a.grav * dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
    }
    this.anims = this.anims.filter((a) => a.t < a.dur);
    for (const p of this.popups) {
      p.life -= dt;
      p.y -= 20 * dt;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
    for (let i = 0; i < this.ash.length; i++) {
      const a = this.ash[i];
      a.x += a.vx * dt;
      a.y += a.vy * dt + Math.sin(this.time * 1.3 + i) * 4 * dt;
      if (a.x < -4 || a.y > H + 4 || a.y < -4) this.ash[i] = this.newAsh(false);
    }
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = Math.max(0, this.shakeT / this.shakeDur);
      const amp = this.shakeAmp * k * this.shakeScale;
      this.shakeX = Math.round(R.range(-amp, amp));
      this.shakeY = Math.round(R.range(-amp, amp));
    } else {
      this.shakeX = this.shakeY = 0;
      this.shakeAmp = 0;
    }
    this.flashA = Math.max(0, this.flashA - dt * 6);
  }

  drawAsh(g: Ctx) {
    const sh = sheet(SHEET.fx);
    for (const a of this.ash) sh.draw(g, 'ash', a.f, a.x, a.y);
  }

  draw(g: Ctx) {
    for (const a of this.anims) {
      if (a.delay > 0) continue;
      const sh = sheet(a.key);
      sh.draw(g, a.tag, sh.index(a.tag, a.t, a.loops > 1), a.x, a.y, { flipX: a.flipX, alpha: a.alpha });
    }
    for (const p of this.parts) {
      // fade by thinning instead of alpha: late particles shrink to 1 px and blink out
      const k = p.life / p.max;
      if (k < 0.25 && Math.floor(p.life * 30) % 2) continue;
      g.fillStyle = p.color;
      const s = k < 0.4 ? 1 : p.size;
      g.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
  }

  drawPopups(g: Ctx) {
    for (const p of this.popups) ptext(g, p.text, p.x, p.y, { color: p.color, align: 'center', valign: 'middle', outline: '#07080B' });
  }
}
