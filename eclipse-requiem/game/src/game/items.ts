import { G } from '../core/app';
import { fxRng as R } from '../core/math';
import { Ctx } from '../gfx/canvas';
import { ART, GlowColor } from '../gfx/sprites';
import { SCORE } from './defs';
import type { World } from './world';

// Items and soul motes (docs/05 §7): pop up, drift left with the scroll, magnet radius 32 (64 focused),
// collect line at x >= 480 pulls everything on screen.

export type ItemKind = 'P' | 'H' | 'B' | 'S' | 'mote';

interface Item {
  kind: ItemKind;
  x: number; y: number; vx: number; vy: number;
  age: number;
  pulled: boolean;
}

const GLOW: Record<ItemKind, GlowColor> = { P: 'gold', H: 'green', B: 'red', S: 'violet', mote: 'violet' };

export class Items {
  list: Item[] = [];
  collectAll = false;
  constructor(private w: World) {}

  spawn(kind: ItemKind, x: number, y: number, vx = 0, vy = -60) {
    this.list.push({ kind, x, y, vx, vy, age: 0, pulled: kind === 'mote' });
  }

  update(dt: number) {
    const p = this.w.player;
    const alive = p.active;
    const radius = p.focus ? 64 : 32;
    const line = alive && p.x >= 480;
    for (const it of this.list) {
      it.age += dt;
      const dx = p.x - it.x, dy = p.y - it.y, d = Math.hypot(dx, dy);
      if (alive && (it.pulled || line || this.collectAll || d < radius)) {
        it.pulled = it.pulled || it.kind !== 'mote' ? true : it.pulled;
        const sp = it.kind === 'mote' ? 180 + it.age * 500 : 300;
        it.vx = (dx / (d || 1)) * sp;
        it.vy = (dy / (d || 1)) * sp;
        if (d < 10) {
          this.collect(it);
          it.age = -1;
          continue;
        }
      } else {
        // pop, then drift with the scroll
        it.vy += (it.vy < 0 ? 140 : 0) * dt;
        if (it.age > 0.35) {
          it.vy *= 1 - 3 * dt;
          it.vx += (-(this.w.scrollSpeed + 20) - it.vx) * Math.min(1, dt * 2);
        }
      }
      it.x += it.vx * dt;
      it.y += it.vy * dt + (it.age > 0.35 && !it.pulled ? Math.sin(it.age * 4) * 4 * dt : 0);
    }
    this.list = this.list.filter((it) => it.age >= 0 && it.x > -20 && it.y < 400 && it.y > -40);
  }

  private collect(it: Item) {
    const w = this.w;
    const pl = w.player;
    switch (it.kind) {
      case 'P': {
        const before = pl.level;
        if (pl.pp >= 8) {
          w.addScore(SCORE.powerMax, it.x, it.y);
        } else {
          pl.pp++;
          if (pl.level > before) {
            G.audio.sfx('powerup');
            w.fx.popup(pl.x, pl.y - 20, 'POWER UP', '#D8B35E');
            w.fx.ring(pl.x, pl.y, 4, 120, 0.4, '#D8B35E', 1, 'gold');
          } else G.audio.sfx('item');
        }
        w.hudPing('power');
        break;
      }
      case 'H':
        if (pl.hp < pl.maxHp) {
          pl.hp++;
          G.audio.sfx('oneup');
          w.hudPing('heal');
        } else w.addScore(SCORE.overflow, it.x, it.y);
        break;
      case 'B':
        if (pl.bombs < 3) {
          pl.bombs++;
          G.audio.sfx('oneup');
          w.hudPing('bombup');
        } else w.addScore(SCORE.overflow, it.x, it.y);
        break;
      case 'S':
        G.audio.sfx('item');
        w.addScore(SCORE.soul, it.x, it.y, true);
        w.chainT = 2.0;
        break;
      case 'mote':
        G.audio.sfx('soul');
        w.score += SCORE.mote;
        break;
    }
  }

  draw(g: Ctx) {
    for (const it of this.list) {
      if (it.kind === 'mote') {
        g.drawImage(ART.bullet.mote, Math.round(it.x) - 2, Math.round(it.y) - 2);
        continue;
      }
      const frames = ART.item[it.kind];
      const f = frames[Math.floor(it.age * 8) % frames.length];
      if (Math.floor(it.age * 2) % 2 === 0 || it.kind === 'S') g.drawImage(f, Math.round(it.x - f.width / 2), Math.round(it.y - f.height / 2));
      else {
        g.globalAlpha = 0.85;
        g.drawImage(f, Math.round(it.x - f.width / 2), Math.round(it.y - f.height / 2));
        g.globalAlpha = 1;
      }
    }
  }

  drawGlow(ctx: Ctx) {
    for (const it of this.list) {
      const pulse = 0.5 + 0.5 * Math.sin(it.age * 6.28);
      ctx.globalAlpha = it.kind === 'mote' ? 0.4 : 0.35 + 0.25 * pulse;
      const s = it.kind === 'mote' ? 10 : 30;
      ctx.drawImage(ART.glow[GLOW[it.kind]], it.x - s / 2, it.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  /** Scatter helper for S drops. */
  scatter(kind: ItemKind, n: number, x: number, y: number) {
    for (let i = 0; i < n; i++) this.spawn(kind, x + R.range(-6, 6), y + R.range(-6, 6), R.range(-50, 50), R.range(-90, -30));
  }
}
