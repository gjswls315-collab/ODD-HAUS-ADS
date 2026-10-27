import { H, W } from '../core/constants';
import { fxRng as R, TAU } from '../core/math';
import { Ctx } from '../gfx/canvas';
import { ART, GlowColor } from '../gfx/sprites';

// Particles, rings, score popups, screen shake and flashes (docs/03 §4-8: shake cap 3px, flash ≤ 1/s).

interface Part {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number;
  color: string; grav: number; drag: number;
  glow?: GlowColor; gs?: number;
}
interface Ring { x: number; y: number; r: number; vr: number; life: number; max: number; color: string; w: number; glow?: GlowColor }
export interface Popup { x: number; y: number; text: string; life: number; color: string }
interface Light { x: number; y: number; r: number; life: number; max: number; glow: GlowColor; a: number }

const MAX_PARTS = 700;

export class Fx {
  parts: Part[] = [];
  rings: Ring[] = [];
  popups: Popup[] = [];
  lights: Light[] = [];
  ash: { x: number; y: number; vx: number; vy: number; c: string }[] = [];
  shakeAmp = 0;
  shakeT = 0;
  shakeDur = 0;
  shakeX = 0;
  shakeY = 0;
  flashA = 0;
  flashColor = '#FFFFFF';
  private lastFlash = -9;
  time = 0;
  shakeScale = 1;
  flashReduce = false;

  constructor(ashCount = 40) {
    for (let i = 0; i < ashCount; i++) this.ash.push(this.newAsh(true));
  }
  private newAsh(anywhere: boolean) {
    return {
      x: anywhere ? R.range(0, W) : W + R.range(0, 20),
      y: R.range(0, H),
      vx: -R.range(8, 22),
      vy: R.range(-3, 6),
      c: R.next() < 0.3 ? '#8A8278' : '#4E4A52',
    };
  }

  spark(x: number, y: number, n: number, colors: string[], speed = 80, o: { grav?: number; life?: number; size?: number; glow?: GlowColor; dir?: number; spread?: number; drag?: number } = {}) {
    for (let i = 0; i < n && this.parts.length < MAX_PARTS; i++) {
      const a = o.dir !== undefined ? o.dir + R.range(-(o.spread ?? 0.6), o.spread ?? 0.6) : R.range(0, TAU);
      const sp = speed * R.range(0.3, 1);
      const life = (o.life ?? 0.5) * R.range(0.6, 1.2);
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life,
        size: o.size ?? (R.next() < 0.3 ? 2 : 1), color: colors[R.int(0, colors.length - 1)],
        grav: o.grav ?? 0, drag: o.drag ?? 2.5, glow: o.glow, gs: 6,
      });
    }
  }

  ring(x: number, y: number, r: number, vr: number, life: number, color: string, w = 1, glow?: GlowColor) {
    this.rings.push({ x, y, r, vr, life, max: life, color, w, glow });
  }

  light(x: number, y: number, r: number, life: number, glow: GlowColor, a = 1) {
    this.lights.push({ x, y, r, life, max: life, glow, a });
  }

  explosion(x: number, y: number, size: 's' | 'm' | 'l', palette: string[] = ['#FFE3B0', '#FF9A4A', '#D94C3A', '#5A4A60']) {
    const k = size === 's' ? 1 : size === 'm' ? 2.2 : 4;
    this.spark(x, y, Math.round(8 * k), palette, 70 * k, { life: 0.45 + 0.1 * k, size: size === 's' ? 1 : 2, glow: 'orange' });
    this.spark(x, y, Math.round(4 * k), ['#2A2733', '#3A3540'], 30 * k, { life: 0.8, size: 2, grav: -10 });
    this.ring(x, y, 2, 60 * k, 0.25 + 0.05 * k, '#FFE3B0', size === 'l' ? 2 : 1, 'orange');
    this.light(x, y, 18 * k, 0.3 + 0.08 * k, 'orange', 0.9);
  }

  popup(x: number, y: number, text: string, color = '#E9E1D3') {
    if (this.popups.length >= 12) this.popups.shift();
    this.popups.push({ x, y, text, life: 0.6, color });
  }

  shake(px: number, dur: number) {
    if (this.shakeScale <= 0) return;
    this.shakeAmp = Math.min(3, Math.max(this.shakeAmp * (this.shakeT / Math.max(0.001, this.shakeDur)), px));
    this.shakeDur = Math.max(dur, 0.05);
    this.shakeT = this.shakeDur;
  }

  /** Full-screen flash, limited to once per second (docs/00 §7). */
  flash(a: number, color = '#FFFFFF') {
    if (this.time - this.lastFlash < 1 && a < 0.9) return;
    this.lastFlash = this.time;
    this.flashColor = this.flashReduce ? '#D8B35E' : color;
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
    for (const r of this.rings) {
      r.life -= dt;
      r.r += r.vr * dt;
      r.vr *= 1 - 2.5 * dt;
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const l of this.lights) l.life -= dt;
    this.lights = this.lights.filter((l) => l.life > 0);
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
    for (const a of this.ash) {
      g.fillStyle = a.c;
      g.fillRect(Math.round(a.x), Math.round(a.y), 1, 1);
    }
  }

  draw(g: Ctx) {
    for (const r of this.rings) {
      g.globalAlpha = Math.max(0, r.life / r.max);
      g.strokeStyle = r.color;
      g.lineWidth = r.w;
      g.beginPath();
      g.arc(Math.round(r.x), Math.round(r.y), Math.max(0.5, r.r), 0, TAU);
      g.stroke();
    }
    g.globalAlpha = 1;
    for (const p of this.parts) {
      g.globalAlpha = Math.min(1, (p.life / p.max) * 1.6);
      g.fillStyle = p.color;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    g.globalAlpha = 1;
  }

  /** Additive light for the high-res glow pass (world transform already applied). */
  drawGlow(ctx: Ctx) {
    for (const l of this.lights) {
      const k = l.life / l.max;
      ctx.globalAlpha = Math.min(1, k * 1.3) * l.a;
      const s = l.r * 2 * (0.7 + 0.3 * k);
      ctx.drawImage(ART.glow[l.glow], l.x - s / 2, l.y - s / 2, s, s);
    }
    ctx.globalAlpha = 0.5;
    for (const p of this.parts) {
      if (!p.glow) continue;
      const s = p.gs! * Math.min(1, p.life / p.max + 0.2);
      ctx.drawImage(ART.glow[p.glow], p.x - s / 2, p.y - s / 2, s, s);
    }
    for (const r of this.rings) {
      if (!r.glow) continue;
      ctx.globalAlpha = (r.life / r.max) * 0.45;
      const s = r.r * 2.4;
      ctx.drawImage(ART.glow[r.glow], r.x - s / 2, r.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }
}
