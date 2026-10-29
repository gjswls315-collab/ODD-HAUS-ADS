import { H, W } from '../core/constants';
import { angleDiff, DEG, TAU } from '../core/math';
import { Ctx } from '../gfx/canvas';
import { sheet } from '../gfx/assets';
import { SHEET } from '../gfx/sprites';
import { BULLETS, BulletType } from './defs';

// Enemy bullet pool + pattern helpers (docs/06 §5-2: aimed / fan / radial / wave / homing).

export interface Bullet {
  alive: boolean;
  type: BulletType;
  x: number; y: number;
  /** base (unwaved) position for sine-wave bullets */
  bx: number; by: number;
  ang: number; speed: number;
  accel: number; speedMax: number;
  angVel: number;
  homingTurn: number; homingT: number;
  hp: number;
  waveAmp: number; waveLen: number; wavePhase: number; dist: number;
  age: number;
  grazed: boolean;
  delay: number;
}

export interface FireOpts {
  accel?: number;
  speedMax?: number;
  angVel?: number;
  homingTurn?: number;
  homingT?: number;
  hp?: number;
  waveAmp?: number;
  waveLen?: number;
  wavePhase?: number;
  delay?: number;
}

const MAX = 480;

export class BulletPool {
  list: Bullet[] = [];
  /** global speed multiplier (boss wrath +10%) */
  speedMul = 1;
  constructor() {
    for (let i = 0; i < MAX; i++) this.list.push(this.blank());
  }
  private blank(): Bullet {
    return {
      alive: false, type: 'B02', x: 0, y: 0, bx: 0, by: 0, ang: 0, speed: 0, accel: 0, speedMax: 0, angVel: 0,
      homingTurn: 0, homingT: 0, hp: 0, waveAmp: 0, waveLen: 1, wavePhase: 0, dist: 0, age: 0, grazed: false, delay: 0,
    };
  }
  get count() {
    let n = 0;
    for (const b of this.list) if (b.alive) n++;
    return n;
  }

  fire(type: BulletType, x: number, y: number, ang: number, speed: number, o: FireOpts = {}) {
    let b = this.list.find((q) => !q.alive);
    if (!b) return null;
    b.alive = true;
    b.type = type;
    b.x = b.bx = x;
    b.y = b.by = y;
    b.ang = ang;
    b.speed = speed * this.speedMul;
    b.accel = (o.accel ?? 0) * this.speedMul;
    b.speedMax = (o.speedMax ?? speed) * this.speedMul;
    b.angVel = (o.angVel ?? 0) * DEG;
    b.homingTurn = (o.homingTurn ?? 0) * DEG;
    b.homingT = o.homingT ?? 0;
    b.hp = o.hp ?? 0;
    b.waveAmp = o.waveAmp ?? 0;
    b.waveLen = o.waveLen ?? 100;
    b.wavePhase = o.wavePhase ?? 0;
    b.dist = 0;
    b.age = 0;
    b.grazed = false;
    b.delay = o.delay ?? 0;
    return b;
  }

  fan(type: BulletType, x: number, y: number, center: number, count: number, spreadDeg: number, speed: number, o: FireOpts = {}) {
    const step = count > 1 ? (spreadDeg * DEG) / (count - 1) : 0;
    const start = center - (step * (count - 1)) / 2;
    for (let i = 0; i < count; i++) this.fire(type, x, y, start + step * i, speed, o);
  }

  radial(type: BulletType, x: number, y: number, count: number, offsetDeg: number, speed: number, o: FireOpts = {}, skip?: (i: number, ang: number) => boolean) {
    for (let i = 0; i < count; i++) {
      const a = offsetDeg * DEG + (i / count) * TAU;
      if (skip && skip(i, a)) continue;
      this.fire(type, x, y, a, speed, o);
    }
  }

  update(dt: number, px: number, py: number) {
    for (const b of this.list) {
      if (!b.alive) continue;
      if (b.delay > 0) {
        b.delay -= dt;
        continue;
      }
      b.age += dt;
      if (b.accel) b.speed = b.accel > 0 ? Math.min(b.speedMax, b.speed + b.accel * dt) : Math.max(b.speedMax, b.speed + b.accel * dt);
      if (b.angVel) b.ang += b.angVel * dt;
      if (b.homingT > 0) {
        b.homingT -= dt;
        const want = Math.atan2(py - b.y, px - b.x);
        const d = angleDiff(b.ang, want);
        const m = b.homingTurn * dt;
        b.ang += Math.max(-m, Math.min(m, d));
      }
      const step = b.speed * dt;
      b.bx += Math.cos(b.ang) * step;
      b.by += Math.sin(b.ang) * step;
      b.dist += step;
      if (b.waveAmp) {
        const off = Math.sin((b.dist / b.waveLen) * TAU + b.wavePhase) * b.waveAmp;
        b.x = b.bx - Math.sin(b.ang) * off;
        b.y = b.by + Math.cos(b.ang) * off;
      } else {
        b.x = b.bx;
        b.y = b.by;
      }
      if (b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) b.alive = false;
    }
  }

  /** Returns cleared bullet positions (to spawn soul motes). */
  clear(): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    for (const b of this.list) {
      if (!b.alive) continue;
      if (b.delay <= 0) out.push({ x: b.x, y: b.y });
      b.alive = false;
    }
    return out;
  }

  /** Bullet sprites from sprites/bullets: one tag per type; B03 is pre-rotated in 16 directions (no runtime rotation). */
  draw(g: Ctx, time = 0) {
    const sh = sheet(SHEET.bullets);
    for (const b of this.list) {
      if (!b.alive || b.delay > 0) continue;
      const tag = BULLETS[b.type].spr;
      const i = b.type === 'B03' ? Math.round((((b.ang % TAU) + TAU) % TAU) / (TAU / 16)) % 16 : sh.index(tag, time + b.age);
      sh.draw(g, tag, i, b.x, b.y);
    }
  }
}
