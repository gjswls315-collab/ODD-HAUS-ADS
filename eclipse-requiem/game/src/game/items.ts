import { G } from '../core/app';
import { fxRng as R } from '../core/math';
import { Ctx } from '../gfx/canvas';
import { sheet } from '../gfx/assets';
import { SHEET } from '../gfx/sprites';
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
          if (it.kind !== 'mote') this.w.fx.anim(SHEET.fx, 'pickup', it.x, it.y);
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
            w.fx.anim(SHEET.fx, 'ring', pl.x, pl.y);
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

  /** Item sprites (sprites/items): P/H/B/S spin loops, mote twinkle; a bright sparkle on pickup comes from fx. */
  draw(g: Ctx) {
    const sh = sheet(SHEET.items);
    for (const it of this.list) sh.draw(g, it.kind, sh.index(it.kind, it.age), it.x, it.y);
  }

  /** Scatter helper for S drops. */
  scatter(kind: ItemKind, n: number, x: number, y: number) {
    for (let i = 0; i < n; i++) this.spawn(kind, x + R.range(-6, 6), y + R.range(-6, 6), R.range(-50, 50), R.range(-90, -30));
  }
}
