import { G } from '../core/app';
import { H } from '../core/constants';
import { fxRng as R } from '../core/math';
import { sheet } from '../gfx/assets';
import { Ctx } from '../gfx/canvas';
import { SHEET } from '../gfx/sprites';
import type { HitCircle, Target, World } from './world';

// Stage gimmicks (docs/05 §8): lightning cross, collapse debris, and the boss's bell-shadow drop.

export interface Hazard {
  done: boolean;
  update(dt: number): void;
  drawBack?(g: Ctx): void;
  drawTele?(g: Ctx): void;
}

const fxs = () => sheet(SHEET.fx);

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
  /** The iron grave cross that conducts the strike: dark, flickers red while charging. */
  drawBack(g: Ctx) {
    if (!this.withCross) return;
    const f = this.t < this.tele ? 1 + (Math.floor(this.t * 12) % 2) : 0;
    fxs().draw(g, 'gravecross', f, this.x, H - 26);
  }
  drawTele(g: Ctx) {
    const fx = fxs(), x = Math.round(this.x);
    if (this.t < this.tele) {
      // guide: warning marker at the top edge + a blinking dotted column, edges every 24 px
      const f = Math.floor(this.t * 10) % 2;
      fx.draw(g, 'lightning_tele', f, x, 2);
      for (let y = 14 + (Math.floor(this.t * 40) % 8); y < H; y += 8) fx.draw(g, 'teledot', f, x, y);
      if (f) for (let y = 20; y < H; y += 24) {
        fx.draw(g, 'teledot', 0, x - this.width / 2, y);
        fx.draw(g, 'teledot', 0, x + this.width / 2, y);
      }
    } else if (this.t < this.tele + this.active) {
      const i = Math.floor((this.t - this.tele) / 0.04) % 2;
      for (let y = 0; y < H; y += 120) fx.draw(g, 'lightning', (i + y / 120) % 2, x, y);
    } else {
      for (let y = 0; y < H; y += 120) fx.draw(g, 'lightning', 2, x, y);
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
  private spin: number;
  constructor(private w: World, public x: number, private tele = 0.8, public harmless = false) {
    this.r = R.range(10, 12.5);
    this.spin = R.int(0, 3);
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
      this.w.fx.explosion(this.x, this.y, 's', ['#8A7D76', '#6C605C', '#403838']);
      for (let i = 0; i < 3; i++) this.w.fx.anim(SHEET.fx, 'debris', this.x, this.y, { vx: R.range(-60, 60), vy: R.range(-80, -20), grav: 300, delay: 0 });
      G.audio.sfx('explodeS');
      this.w.items.spawn('S', this.x, this.y);
    }
  }
  update(dt: number) {
    this.t += dt;
    if (this.t < this.tele) {
      if (R.next() < 0.5) this.w.fx.spark(this.x + R.range(-8, 8), 2, 1, ['#6C605C', '#403838'], 20, { dir: Math.PI / 2, spread: 0.3, life: 0.6, drag: 0, grav: 60 });
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
    const fx = fxs();
    if (this.t < this.tele) {
      fx.draw(g, 'warn', Math.floor(this.t * 10) % 2, this.x, 8);
      return;
    }
    fx.draw(g, 'rubble', this.spin + Math.floor((this.t - this.tele) * 10), this.x, this.y);
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
      this.w.fx.ring(this.x, this.y, true);
      this.w.fx.anim(SHEET.fx, 'burst_m', this.x, this.y);
      for (let i = 0; i < 5; i++) this.w.fx.anim(SHEET.fx, 'bellshard', this.x, this.y, { vx: R.range(-90, 90), vy: R.range(-140, -40), grav: 360 });
      this.w.bullets.radial('B02', this.x, this.y, 12, R.range(0, 30), 50);
    }
    if (this.t >= this.tele && this.t < this.tele + 0.2) {
      const p = this.w.player;
      if (p.active && Math.hypot(p.x - this.x, p.y - this.y) < 48) p.hit();
    }
    if (this.t > this.tele + 0.5) this.done = true;
  }
  drawTele(g: Ctx) {
    const fx = fxs(), x = this.x, y = this.y;
    if (this.t < this.tele) {
      const k = this.t / this.tele, f = Math.floor(this.t * 10) % 2;
      // shrinking ring of marker dots around the locked position + ground mark
      const r = 80 - 32 * k;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + this.t;
        fx.draw(g, 'teledot', f, x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      fx.draw(g, 'belldrop_mark', f, x, y);
      // the ghost bell falls from above and solidifies
      const by = -60 + (y + 10) * Math.pow(k, 3);
      fx.draw(g, 'belldrop', 0, x, by, { dither: 4 + Math.round(12 * k) });
    }
  }
}
