import { G } from '../core/app';
import { W } from '../core/constants';
import { DEG, fxRng as R, TAU } from '../core/math';
import { Ctx } from '../gfx/canvas';
import { sheet } from '../gfx/assets';
import { SHEET } from '../gfx/sprites';
import { ENEMIES, EnemyDef, EnemyKind } from './defs';
import { ItemKind } from './items';
import type { HitCircle, Target, World } from './world';

// Stage 1 enemy behaviours (docs/05 §5-1). All attacks follow telegraph -> fire -> gap.

export interface Group {
  id: string;
  total: number;
  killed: number;
  escaped: number;
  drop?: ItemKind;
  dropS?: number;
  bonus: boolean;
  lastX: number;
  lastY: number;
}

export interface EnemyOpts {
  x: number;
  y: number;
  /** snake | dive | drift | stop | diag */
  move?: string;
  fires?: boolean;
  amp?: number;
  period?: number;
  phase?: number;
  speed?: number;
  stopX?: number;
  stopY?: number;
  variant?: string;
  group?: Group;
  drop?: ItemKind;
  dropS?: number;
  delay?: number;
  fromTop?: boolean;
  onKill?: (e: Enemy) => void;
}

export class Enemy implements Target {
  def: EnemyDef;
  x: number;
  y: number;
  y0: number;
  x0: number;
  hp: number;
  maxHp: number;
  age = 0;
  alive = true;
  state = 'enter';
  st = 0;
  fired = 0;
  flash = 0;
  guardBreak = 0;
  tele = 0;
  attackIdx = 0;
  wait: number;
  vx = 0;
  vy = 0;
  isBoss = false;

  constructor(public w: World, public kind: EnemyKind, public o: EnemyOpts) {
    this.def = ENEMIES[kind];
    this.x = this.x0 = o.x;
    this.y = this.y0 = o.y;
    this.hp = this.maxHp = this.def.hp;
    this.wait = o.delay ?? 0;
    if (o.group) o.group.total++;
  }

  get r() {
    return this.def.r;
  }

  hitCircles(): HitCircle[] {
    if (this.kind === 'sentinel') {
      return [{ x: this.x + 2, y: this.y + 4, r: 22, mul: 1 }];
    }
    return [{ x: this.x, y: this.y, r: this.def.r, mul: 1 }];
  }

  /** Damage modifier for the sentinel's front shield (normal shots x0.25, charge shots break the guard). */
  damageMod(charge: boolean) {
    if (this.kind !== 'sentinel') return 1;
    if (this.guardBreak > 0) return 1.5;
    if (charge) {
      this.guardBreak = 1.5;
      G.audio.sfx('crack');
      this.w.fx.anim(SHEET.fx, 'spark_metal', this.x - 20, this.y);
      this.w.fx.spark(this.x - 20, this.y, 14, ['#A6ACB5', '#ECEEF1', '#656D7A'], 120, { life: 0.5 });
      this.w.fx.popup(this.x - 10, this.y - 46, 'GUARD BREAK', '#F2D58C');
      return 1;
    }
    if (R.next() < 0.3) {
      G.audio.sfx('shield');
      this.w.fx.anim(SHEET.fx, 'spark_metal', this.x - 22, this.y + R.range(-10, 10));
    }
    return 0.25;
  }

  takeDamage(dmg: number) {
    if (!this.alive || this.wait > 0) return;
    this.hp -= dmg;
    this.flash = 0.06;
    if (this.hp <= 0) this.kill();
    else G.audio.sfx('hit');
  }

  private kill() {
    this.alive = false;
    const w = this.w;
    w.onEnemyKilled(this);
    const big = this.kind === 'sentinel';
    const mid = this.kind === 'skeleton' || this.kind === 'cleric';
    w.fx.explosion(this.x, this.y, big ? 'l' : mid ? 'm' : 's', this.kind === 'candle' ? ['#E6EEF5', '#B7C6D5', '#7F93A8', '#20242C'] : undefined);
    G.audio.sfx(big ? 'explodeM' : mid ? 'explodeM' : 'explodeS');
    if (big) w.fx.shake(2, 0.1);
    else if (mid) w.fx.shake(1, 0.08);
    if (this.o.drop) w.items.spawn(this.o.drop, this.x, this.y);
    this.o.onKill?.(this);
    if (this.o.dropS) w.items.scatter('S', this.o.dropS, this.x, this.y);
    const gr = this.o.group;
    if (gr) {
      gr.killed++;
      gr.lastX = this.x;
      gr.lastY = this.y;
      if (gr.killed === gr.total && gr.escaped === 0) w.onGroupWipe(gr);
    }
  }

  private escape() {
    this.alive = false;
    if (this.o.group) this.o.group.escaped++;
  }

  private get onScreen() {
    return this.x < W - 8 && this.x > 8 && this.y > 4 && this.y < 356;
  }

  update(dt: number) {
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    this.age += dt;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.guardBreak = Math.max(0, this.guardBreak - dt);
    if (this.tele > 0) this.tele -= dt;
    switch (this.kind) {
      case 'bat': this.bat(dt); break;
      case 'candle': this.candle(dt); break;
      case 'skeleton': this.skeleton(dt); break;
      case 'cleric': this.cleric(dt); break;
      case 'sentinel': this.sentinel(dt); break;
    }
    if (this.x < -60 || this.x > W + 120 || this.y < -80 || this.y > 440) this.escape();
  }

  private aim() {
    return Math.atan2(this.w.player.y - this.y, this.w.player.x - this.x);
  }

  // ---------------- behaviours ----------------
  private bat(dt: number) {
    const o = this.o;
    if (o.move === 'dive') {
      const a = 150 * DEG;
      this.x += Math.cos(a) * (o.speed ?? 180) * dt;
      this.y += Math.sin(30 * DEG) * (o.speed ?? 180) * dt;
    } else if (o.move === 'flee') {
      this.x -= (o.speed ?? 200) * dt;
      this.y = this.y0 + Math.sin(this.age * 6 + (o.phase ?? 0)) * 6;
    } else {
      this.x -= (o.speed ?? 150) * dt;
      this.y = this.y0 + Math.sin((this.age / (o.period ?? 1.2)) * TAU + (o.phase ?? 0)) * (o.amp ?? 20);
    }
    if (o.fires && !this.fired && this.age > 0.5 && this.x > 360 && this.x < 600) {
      this.fired = 1;
      this.w.bullets.fire('B01', this.x - 4, this.y, this.aim(), 110);
    }
  }

  private candle(dt: number) {
    this.x -= (this.o.speed ?? 40) * dt;
    this.y = this.y0 + Math.sin(this.age * Math.PI) * 10;
    if (this.x < 600) {
      if (this.state === 'enter') {
        this.state = 'attack';
        this.st = 0;
        this.wait = 0;
        this.fired = 0;
      }
      // first shot 0.8 s after entering, then every 2.4 s; flame flares 0.4 s before
      const next = 0.8 + this.fired * 2.4;
      if (this.st > next - 0.4 && this.tele <= 0 && this.st < next) this.tele = 0.4;
      if (this.st >= next) {
        this.fired++;
        this.w.bullets.fan('B02', this.x - 2, this.y - 8, this.aim(), 3, 30, 90);
      }
    }
  }

  private skeleton(dt: number) {
    const o = this.o;
    const stopX = o.stopX ?? 520;
    if (this.state === 'enter') {
      const dx = stopX - this.x;
      this.x += Math.sign(dx) * Math.min(Math.abs(dx), Math.min(120, Math.max(20, Math.abs(dx) * 2)) * dt);
      if (o.stopY !== undefined) this.y += (o.stopY - this.y) * Math.min(1, dt * 2);
      if (Math.abs(dx) < 1.5) {
        this.state = 'hold';
        this.st = 0;
      }
    } else if (this.state === 'hold') {
      this.y = (o.stopY ?? this.y0) + Math.sin(this.age * 2) * 3;
      // two volleys: telegraph 0.6 s each (bell raised + ding)
      const times = [0.4, 1.6];
      for (let i = 0; i < 2; i++) {
        if (this.fired === i && this.st >= times[i]) {
          this.tele = 0.6;
          this.fired = i + 0.5;
          if (this.onScreen) G.audio.sfx('tollSmall');
        }
        if (this.fired === i + 0.5 && this.st >= times[i] + 0.6) {
          this.fired = i + 1;
          const bx = this.x - 13, by = this.y - 4;
          if (o.variant === 'radial') this.w.bullets.radial('B02', bx, by, 8, i * 22.5, 70);
          else this.w.bullets.fan('B02', bx, by, this.aim(), 5, 60, 100);
        }
      }
      if (this.st > 4.0) {
        this.state = 'exit';
        this.st = 0;
      }
    } else {
      const dir = this.y0 < 180 ? -1 : 1;
      this.x += 90 * dt;
      this.y += dir * 50 * dt;
    }
  }

  private cleric(dt: number) {
    const o = this.o;
    const tx = o.stopX ?? 500, ty = o.stopY ?? 110;
    if (this.state === 'enter') {
      const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
      const sp = 140;
      if (d < sp * dt + 0.5) {
        this.x = tx;
        this.y = ty;
        this.state = 'hover';
        this.st = 0;
      } else {
        this.x += (dx / d) * sp * dt;
        this.y += (dy / d) * sp * dt;
      }
    } else if (this.state === 'hover') {
      this.y = ty + Math.sin(this.st * 3) * 3;
      if (this.st >= 0.3 && this.fired === 0) {
        this.fired = 1;
        this.tele = 0.5;
      }
      if (this.st >= 0.8 && this.fired === 1) {
        this.fired = 2;
        const a = this.aim();
        for (let i = 0; i < 6; i++) {
          const ang = a + (-25 + i * 10) * DEG;
          this.w.bullets.fire('B02', this.x - 10, this.y - 6, ang, 85, { angVel: i % 2 ? 40 : -40 });
        }
        for (const s of [-1, 1]) this.w.bullets.fire('B04', this.x - 6, this.y, a + s * 70 * DEG, 70, { homingTurn: 90, homingT: 1.5, hp: 10 });
      }
      if (this.st > 2.5) {
        this.state = 'exit';
        this.st = 0;
      }
    } else {
      const down = (o.fromTop ?? true) ? 1 : -1;
      this.x += 160 * 0.6 * dt;
      this.y += down * 160 * 0.8 * dt;
    }
  }

  private sentinel(dt: number) {
    if (this.state === 'enter') {
      this.x -= 40 * dt;
      if (this.x <= (this.o.stopX ?? 500)) {
        this.state = 'hold';
        this.st = 0;
      }
    } else if (this.state === 'hold') {
      this.x -= 10 * dt;
      this.y = this.y0 + Math.sin(this.age * 1.5) * 4;
      // attack every 3.5 s, alternating barrier / wave, 0.6 s telegraph
      const next = 0.8 + this.attackIdx * 3.5;
      if (this.st >= next - 0.6 && this.tele <= 0 && this.fired <= this.attackIdx) {
        this.tele = 0.6;
        this.fired = this.attackIdx + 1;
        this.w.fx.anim(SHEET.fx, 'dust', this.x - 6, this.y + 40);
      }
      if (this.st >= next) {
        const bx = this.x - 26;
        if (this.attackIdx % 2 === 0) {
          // barrier: vertical wall of 9 with a 2-slot gap near the player
          const py = this.w.player.y;
          const gapAt = Math.max(0, Math.min(7, Math.round((py + R.range(-80, 80) - (this.y - 112)) / 28)));
          for (let i = 0; i < 9; i++) {
            if (i === gapAt || i === gapAt + 1) continue;
            this.w.bullets.fire('B02', bx, this.y - 112 + i * 28, Math.PI, 70);
          }
        } else {
          for (let s = 0; s < 3; s++)
            for (let i = 0; i < 6; i++)
              this.w.bullets.fire('B06', bx, this.y + (s - 1) * 30, Math.PI, 90, { waveAmp: 20, waveLen: 110, wavePhase: s, delay: i * 0.16 });
        }
        this.attackIdx++;
      }
      if (this.st > 18) {
        this.state = 'exit';
        this.st = 0;
      }
    } else {
      this.x += 40 * dt;
    }
  }

  // ---------------- drawing ----------------
  /** Tag in sprites/enemies for the current state: <kind>, <kind>_tele while telegraphing, sentinel_break on guard break. */
  private tag() {
    const k = this.kind;
    if (k === 'sentinel' && this.guardBreak > 0) return 'sentinel_break';
    if (this.tele > 0 && k !== 'bat') return k + '_tele';
    return k;
  }

  draw(g: Ctx) {
    if (this.wait > 0) return;
    const sh = sheet(SHEET.enemies), tag = this.tag();
    const i = sh.index(tag, this.age);
    if (this.kind === 'cleric') sh.draw(g, tag, i, this.x + 6, this.y - 2, { alpha: 0.25 }); // black-wing afterimage
    sh.draw(g, tag, i, this.x, this.y, { flash: this.flash > 0 });
  }

  /** Over the black fog (docs/05 §8) enemies are re-drawn faintly so their silhouettes and eyes stay readable. */
  drawLights(g: Ctx) {
    if (this.wait > 0) return;
    const sh = sheet(SHEET.enemies), tag = this.tag();
    sh.draw(g, tag, sh.index(tag, this.age), this.x, this.y, { alpha: 0.4 });
  }
}
