import { G } from '../core/app';
import { H } from '../core/constants';
import { fxRng as R, TAU } from '../core/math';
import { Ctx } from '../gfx/canvas';
import { ART } from '../gfx/sprites';
import type { HitCircle, Target, World } from './world';

// Stage gimmicks (docs/05 §8): lightning cross, collapse debris, and the boss's bell-shadow drop.

export interface Hazard {
  done: boolean;
  update(dt: number): void;
  drawBack?(g: Ctx): void;
  drawTele?(g: Ctx): void;
  drawGlow?(ctx: Ctx): void;
}

/** Lightning cross: 1.0 s red guide line, then a vertical strike. */
export class Lightning implements Hazard {
  done = false;
  t = 0;
  constructor(private w: World, public x: number, private tele = 1.0, private active = 0.25, private width = 24, private withCross = true) {
    G.audio.sfx('tele');
  }
  update(dt: number) {
    const before = this.t;
    this.t += dt;
    if (before < this.tele && this.t >= this.tele) {
      G.audio.sfx('lightning');
      this.w.fx.shake(2, 0.12);
      this.w.fx.flash(0.15, '#FFE3E3');
      this.w.fx.spark(this.x, H - 40, 18, ['#FFFFFF', '#FF8A6A', '#D94C3A'], 140, { life: 0.4, glow: 'red' });
    }
    if (this.t >= this.tele && this.t < this.tele + this.active) {
      const p = this.w.player;
      if (p.active && Math.abs(p.x - this.x) < this.width / 2 + 2) p.hit();
    }
    if (this.t > this.tele + this.active + 0.3) this.done = true;
  }
  drawBack(g: Ctx) {
    if (!this.withCross) return;
    // the cross structure rising from the ground glows while charging
    const x = Math.round(this.x), base = H - 30;
    g.fillStyle = '#09090C';
    g.fillRect(x - 2, base - 46, 4, 50);
    g.fillRect(x - 9, base - 36, 18, 4);
    if (this.t < this.tele) {
      g.fillStyle = Math.floor(this.t * 12) % 2 ? '#D94C3A' : '#8A2A36';
      g.fillRect(x - 1, base - 45, 2, 48);
      g.fillRect(x - 8, base - 35, 16, 2);
    }
  }
  drawTele(g: Ctx) {
    const x = Math.round(this.x);
    if (this.t < this.tele) {
      const a = 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(this.t * TAU * 4));
      g.globalAlpha = a;
      g.fillStyle = '#D94C3A';
      g.fillRect(x - 1, 0, 2, H);
      g.globalAlpha = a * 0.35;
      g.fillRect(x - this.width / 2, 0, 1, H);
      g.fillRect(x + this.width / 2 - 1, 0, 1, H);
      g.globalAlpha = 1;
    } else if (this.t < this.tele + this.active) {
      const k = 1 - (this.t - this.tele) / this.active;
      g.fillStyle = '#FFE3E3';
      g.fillRect(x - Math.round((this.width / 2) * (0.6 + 0.4 * k)), 0, Math.round(this.width * (0.6 + 0.4 * k)), H);
      g.fillStyle = '#FFFFFF';
      // jagged core
      let jx = x;
      for (let y = 0; y < H; y += 6) {
        jx = x + R.int(-3, 3);
        g.fillRect(jx - 1, y, 3, 6);
      }
    } else {
      g.globalAlpha = 1 - (this.t - this.tele - this.active) / 0.3;
      g.fillStyle = '#D94C3A';
      g.fillRect(x - 2, 0, 4, H);
      g.globalAlpha = 1;
    }
  }
  drawGlow(ctx: Ctx) {
    if (this.t >= this.tele && this.t < this.tele + this.active + 0.2) {
      ctx.globalAlpha = 0.8;
      for (let y = 0; y < H; y += 40) ctx.drawImage(ART.glow.red, this.x - 40, y - 40, 80, 80);
      ctx.globalAlpha = 1;
    } else if (this.t < this.tele) {
      ctx.globalAlpha = 0.25;
      ctx.drawImage(ART.glow.red, this.x - 14, H - 80, 28, 60);
      ctx.globalAlpha = 1;
    }
  }
}

/** Falling rubble: dust telegraph at the top edge, then falls; destructible. */
export class Debris implements Hazard, Target {
  done = false;
  alive = true;
  t = 0;
  y = -16;
  r: number;
  hp = 40;
  isBoss = false;
  constructor(private w: World, public x: number, private tele = 0.8, public harmless = false) {
    this.r = R.range(10, 16);
  }
  get yPos() {
    return this.y;
  }
  hitCircles(): HitCircle[] {
    return this.t >= this.tele ? [{ x: this.x, y: this.y, r: this.r, mul: 1 }] : [];
  }
  damageMod() {
    return 1;
  }
  takeDamage(d: number) {
    this.hp -= d;
    if (this.hp <= 0 && this.alive) {
      this.alive = false;
      this.done = true;
      this.w.fx.explosion(this.x, this.y, 's', ['#B9B3AA', '#6E6A60', '#3A3742']);
      G.audio.sfx('explodeS');
      this.w.items.spawn('S', this.x, this.y);
    }
  }
  update(dt: number) {
    this.t += dt;
    if (this.t < this.tele) {
      if (R.next() < 0.5) this.w.fx.spark(this.x + R.range(-8, 8), 2, 1, ['#6E6A60', '#3A3742'], 20, { dir: Math.PI / 2, spread: 0.3, life: 0.6, drag: 0, grav: 60 });
      return;
    }
    this.y += 220 * dt;
    const p = this.w.player;
    if (!this.harmless && p.active && Math.hypot(p.x - this.x, p.y - this.y) < this.r + 3) p.hit();
    if (this.y > H + 20) {
      this.done = true;
      this.alive = false;
    }
  }
  drawTele(g: Ctx) {
    if (this.t < this.tele) {
      g.globalAlpha = 0.5 + 0.5 * Math.sin(this.t * 30);
      g.fillStyle = '#D94C3A';
      g.fillRect(Math.round(this.x - this.r), 0, Math.round(this.r * 2), 2);
      g.globalAlpha = 1;
      return;
    }
    const x = Math.round(this.x), y = Math.round(this.y), r = Math.round(this.r);
    g.fillStyle = '#0B0B0F';
    g.beginPath();
    g.moveTo(x - r - 1, y + r * 0.4);
    g.lineTo(x - r * 0.4, y - r - 1);
    g.lineTo(x + r + 1, y - r * 0.3);
    g.lineTo(x + r * 0.6, y + r + 1);
    g.fill();
    g.fillStyle = '#3A3742';
    g.beginPath();
    g.moveTo(x - r, y + r * 0.4);
    g.lineTo(x - r * 0.4, y - r);
    g.lineTo(x + r, y - r * 0.3);
    g.lineTo(x + r * 0.6, y + r);
    g.fill();
    g.fillStyle = '#6E6A60';
    g.fillRect(x - r * 0.4, y - r + 1, r, 1);
  }
}

/** Abaddon P3: ghost bell falls on the locked player position, then releases a ring. */
export class BellDrop implements Hazard {
  done = false;
  t = 0;
  constructor(private w: World, public x: number, public y: number, private tele = 1.2) {}
  update(dt: number) {
    const before = this.t;
    this.t += dt;
    if (Math.floor(before * 5) !== Math.floor(this.t * 5) && this.t < this.tele) G.audio.sfx('tollSmall');
    if (before < this.tele && this.t >= this.tele) {
      G.audio.sfx('toll', 0.6);
      G.audio.sfx('explodeM');
      this.w.fx.shake(3, 0.2);
      this.w.fx.ring(this.x, this.y, 10, 260, 0.4, '#BFF4FF', 2, 'cyan');
      this.w.bullets.radial('B02', this.x, this.y, 12, R.range(0, 30), 50);
    }
    if (this.t >= this.tele && this.t < this.tele + 0.2) {
      const p = this.w.player;
      if (p.active && Math.hypot(p.x - this.x, p.y - this.y) < 48) p.hit();
    }
    if (this.t > this.tele + 0.5) this.done = true;
  }
  drawTele(g: Ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);
    if (this.t < this.tele) {
      const k = this.t / this.tele;
      const r = 80 - 32 * k;
      g.strokeStyle = '#D94C3A';
      g.globalAlpha = 0.5 + 0.4 * Math.sin(this.t * 20);
      g.lineWidth = 1;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.stroke();
      g.globalAlpha = 0.25 + 0.2 * k;
      g.fillStyle = '#0B0B0F';
      g.beginPath();
      g.arc(x, y, 48 * k, 0, TAU);
      g.fill();
      // falling ghost bell from above
      const by = -60 + (y + 10) * Math.pow(k, 3);
      g.globalAlpha = 0.6;
      g.fillStyle = '#59B7C9';
      g.beginPath();
      g.moveTo(x - 30, by + 30);
      g.quadraticCurveTo(x - 24, by - 26, x, by - 28);
      g.quadraticCurveTo(x + 24, by - 26, x + 30, by + 30);
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
    } else if (this.t < this.tele + 0.25) {
      g.fillStyle = '#BFF4FF';
      g.globalAlpha = 1 - (this.t - this.tele) / 0.25;
      g.beginPath();
      g.arc(x, y, 48, 0, TAU);
      g.fill();
      g.globalAlpha = 1;
    }
  }
  drawGlow(ctx: Ctx) {
    if (this.t < this.tele) {
      ctx.globalAlpha = 0.3 * (this.t / this.tele);
      ctx.drawImage(ART.glow.cyan, this.x - 50, this.y - 90, 100, 100);
    } else if (this.t < this.tele + 0.3) {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(ART.glow.cyan, this.x - 70, this.y - 70, 140, 140);
    }
    ctx.globalAlpha = 1;
  }
}
