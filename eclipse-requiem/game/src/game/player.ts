import { G } from '../core/app';
import { H, W } from '../core/constants';
import { clamp, DEG, fxRng as R, TAU } from '../core/math';
import { Ctx } from '../gfx/canvas';
import { HERO_ANCHOR } from '../gfx/art/heroines';
import { ART } from '../gfx/sprites';
import { CharDef } from './defs';
import type { Target, World } from './world';

// Player movement, auto fire, charge shot and bomb per character (docs/00 §6, docs/06 §7).

export type ShotKind = 'basic' | 'lance' | 'bolt' | 'scythe' | 'spirit' | 'orb';

export interface PShot {
  kind: ShotKind;
  x: number; y: number; vx: number; vy: number;
  dmg: number; r: number; len: number;
  pierce: boolean;
  hit: Set<Target>;
  life: number; age: number;
  ang: number;
  phase: number;
  tx: number; ty: number;
  charge: boolean;
}

export const CHARGE_L1 = 0.6;
export const CHARGE_L2 = 1.2;
const CHARGE_COOLDOWN = 0.8;
const POWER_MUL = [1, 1.3, 1.6];

export class Player {
  x = 120;
  y = 180;
  hp: number;
  maxHp: number;
  lives = 3;
  bombs = 2;
  pp = 0;
  invuln = 0;
  dead = false;
  respawnT = 0;
  entering = 0;
  fireT = 0;
  charging = false;
  chargeT = 0;
  chargeCool = 0;
  private chargeNotified = 0;
  private toggleOn = false;
  focus = false;
  anim = 0;
  hitFlash = 0;
  locked = false;
  bombLocked = false;
  autoPilot: { x: number; y: number } | null = null;
  shots: PShot[] = [];
  hitsTaken = 0;
  bombsUsed = 0;
  livesLost = 0;
  moving = 0;
  /** Scripted input for the character-select shot preview. */
  demo: { charge: boolean; bomb: boolean } | null = null;

  constructor(public w: World, public ch: CharDef) {
    this.hp = this.maxHp = ch.hp;
  }

  get level() {
    return Math.min(3, 1 + Math.floor(this.pp / 4));
  }
  get powerMul() {
    return POWER_MUL[this.level - 1] * this.ch.dpsMul;
  }
  get active() {
    return !this.dead && this.entering <= 0;
  }

  update(dt: number) {
    const inp = G.input;
    const s = G.save.settings;
    this.anim += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.invuln > 0) this.invuln -= dt;
    if (this.chargeCool > 0) this.chargeCool -= dt;

    if (this.dead) {
      this.respawnT -= dt;
      if (this.respawnT <= 0 && this.lives > 0) this.respawn();
      this.updateShots(dt);
      return;
    }
    if (this.entering > 0) {
      this.entering -= dt;
      this.x += (120 - this.x) * Math.min(1, dt * 5);
      this.updateShots(dt);
      return;
    }

    // ---- movement ----
    if (this.autoPilot) {
      this.x += (this.autoPilot.x - this.x) * Math.min(1, dt * 2.5);
      this.y += (this.autoPilot.y - this.y) * Math.min(1, dt * 2.5);
    } else if (!this.locked && !this.demo) {
      let mx = inp.moveX, my = inp.moveY;
      if (mx && my) {
        mx *= Math.SQRT1_2;
        my *= Math.SQRT1_2;
      }
      this.focus = inp.actionHeld('focus');
      let sp = this.ch.speed;
      if (this.focus) sp *= 0.6;
      if (this.charging) sp *= 0.85;
      this.x = clamp(this.x + mx * sp * dt, 16, W - 16);
      this.y = clamp(this.y + my * sp * dt, 16, H - 16);
      this.moving = my;
    }

    if (this.locked) {
      this.charging = false;
      this.updateShots(dt);
      return;
    }

    // ---- charge (hold or toggle) ----
    const chargeBtn = this.demo
      ? this.demo.charge
      : s.chargeMode === 'toggle' ? (inp.actionPressed('charge') ? (this.toggleOn = !this.toggleOn) : this.toggleOn) : inp.actionHeld('charge');
    if (chargeBtn && this.chargeCool <= 0 && this.w.bombT <= 0) {
      if (!this.charging) {
        this.charging = true;
        this.chargeT = 0;
        this.chargeNotified = 0;
      }
      this.chargeT = Math.min(CHARGE_L2, this.chargeT + dt);
      if (this.chargeT >= CHARGE_L1 && this.chargeNotified < 1) {
        this.chargeNotified = 1;
        G.audio.sfx('charge1');
        this.w.fx.ring(this.x, this.y, 4, 70, 0.3, this.ch.color, 1, this.ch.glow);
      }
      if (this.chargeT >= CHARGE_L2 && this.chargeNotified < 2) {
        this.chargeNotified = 2;
        G.audio.sfx('charge2');
        this.w.fx.ring(this.x, this.y, 6, 110, 0.4, '#FFFFFF', 1, this.ch.glow);
      }
      if (R.next() < 0.5) {
        const a = R.range(0, TAU), d = R.range(10, 20);
        this.w.fx.spark(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, 1, [this.ch.color, '#FFFFFF'], 30, { dir: a + Math.PI, spread: 0.1, life: 0.3, drag: 0 });
      }
    } else if (this.charging) {
      this.charging = false;
      if (s.chargeMode === 'toggle') this.toggleOn = false;
      if (this.chargeT >= CHARGE_L1) this.releaseCharge(this.chargeT >= CHARGE_L2 ? 2 : 1);
      this.chargeT = 0;
    }

    // ---- auto fire ----
    const firing = this.demo || s.autoFire ? true : inp.actionHeld('fire');
    this.fireT -= dt;
    if (firing && this.fireT <= 0) {
      this.fireT += this.ch.fireInterval * (this.charging ? 1.25 : 1);
      if (this.fireT < -0.1) this.fireT = 0;
      this.fireBasic();
    }

    // ---- bomb ----
    if (this.demo ? this.demo.bomb : inp.actionPressed('bomb')) {
      if (this.demo) this.demo.bomb = false;
      this.tryBomb();
    }

    this.updateShots(dt);
  }

  private shot(kind: ShotKind, x: number, y: number, ang: number, speed: number, dmg: number, o: Partial<PShot> = {}): PShot {
    const p: PShot = {
      kind, x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg, r: 3, len: 0, pierce: false, hit: new Set(),
      life: 2, age: 0, ang, phase: 0, tx: 0, ty: 0, charge: false, ...o,
    };
    this.shots.push(p);
    return p;
  }

  private fireBasic() {
    const lv = this.level;
    const mul = POWER_MUL[lv - 1];
    const x = this.x + 14, y = this.y;
    G.audio.sfx('shot');
    if (this.ch.id === 'seraphine') {
      // DPS 100 at Lv1: 2 bolts / 0.15 s -> 7.5 each; extra streams split the same multiplied DPS
      const lanes = lv === 1 ? [-3, 3] : lv === 2 ? [-5, 0, 5] : [-7, -2.5, 2.5, 7];
      const per = (100 * mul * this.ch.fireInterval) / lanes.length;
      for (const dy of lanes) this.shot('basic', x, y + dy, 0, 560, per, { r: 3 });
    } else if (this.ch.id === 'noctis') {
      const lanes = lv === 1 ? [-1.5, 1.5] : lv === 2 ? [-3, 0, 3] : [-4.5, -1.5, 1.5, 4.5];
      const per = (100 * this.ch.dpsMul * mul * this.ch.fireInterval) / lanes.length;
      for (const dy of lanes) this.shot('basic', x + 2, y + dy, 0, 720, per, { r: 2.5 });
    } else {
      const angs = lv === 3 ? [-24, -12, 0, 12, 24] : lv === 2 ? [-14, -5, 5, 14] : [-12, 0, 12];
      const per = (100 * this.ch.dpsMul * mul * this.ch.fireInterval) / angs.length;
      for (const a of angs) this.shot('basic', x, y, a * DEG, 420, per, { r: 3.5, life: 1.0 });
    }
  }

  private releaseCharge(level: 1 | 2) {
    const m = this.powerMul / this.ch.dpsMul; // charge damage scales with power level only
    const base = level === 2 ? 120 : 50;
    const dmg = base * m;
    this.chargeCool = CHARGE_COOLDOWN;
    G.audio.sfx('release');
    this.w.fx.shake(level === 2 ? 2 : 1, 0.12);
    this.w.fx.light(this.x + 20, this.y, level === 2 ? 60 : 36, 0.25, this.ch.glow, 1);
    this.w.chargeFlash = 0.15;
    this.w.stats.charges++;
    const id = this.ch.id;
    if (id === 'seraphine') {
      if (level === 1) this.shot('lance', this.x + 10, this.y, 0, 900, dmg, { pierce: true, len: 44, r: 4, charge: true });
      else for (const dy of [-6, 6]) this.shot('lance', this.x + 10, this.y + dy, 0, 1000, dmg / 2, { pierce: true, len: 70, r: 6, charge: true });
    } else if (id === 'noctis') {
      if (level === 1) this.shot('bolt', this.x + 10, this.y, 0, 1150, dmg, { pierce: true, len: 26, r: 4, charge: true });
      else this.shot('scythe', this.x + 12, this.y, 0, 560, dmg / 2, { pierce: true, r: 14, life: 3, charge: true });
    } else {
      if (level === 1) for (let i = 0; i < 3; i++) this.shot('spirit', this.x + 8, this.y, (i - 1) * 50 * DEG, 200, dmg / 3, { r: 4, life: 2.5, charge: true });
      else for (let i = 0; i < 7; i++) this.shot('orb', this.x + 6, this.y, (i - 3) * 22 * DEG, 160, dmg / 7, { r: 5, life: 3, charge: true });
    }
  }

  tryBomb() {
    if (this.bombLocked || this.dead || this.entering > 0) return;
    if (this.bombs <= 0 || this.w.bombT > 0) {
      if (this.bombs <= 0) {
        G.audio.sfx('uiDeny');
        this.w.hudPing('bomb');
      }
      return;
    }
    this.bombs--;
    this.bombsUsed++;
    this.invuln = Math.max(this.invuln, this.ch.bombInvuln);
    this.charging = false;
    this.chargeT = 0;
    this.w.startBomb(this.ch.id);
  }

  updateShots(dt: number) {
    const w = this.w;
    for (const s of this.shots) {
      s.age += dt;
      s.life -= dt;
      if (s.kind === 'scythe') {
        // boomerang: decelerate forward, then return to the player
        if (s.phase === 0) {
          s.vx -= 640 * dt;
          if (s.vx <= 0) {
            s.phase = 1;
            s.hit.clear();
          }
        } else {
          const dx = this.x - s.x, dy = this.y - s.y, d = Math.hypot(dx, dy);
          const sp = Math.min(700, 200 + s.age * 300);
          s.vx = (dx / d) * sp;
          s.vy = (dy / d) * sp;
          if (d < 14) s.life = 0;
        }
        s.ang += dt * 18;
      } else if (s.kind === 'spirit' || (s.kind === 'orb' && s.age > 0.3)) {
        const t = w.nearestTarget(s.x, s.y);
        let tx = t ? t.x : s.x + 200, ty = t ? t.y : s.y;
        if (s.kind === 'orb' && !t) {
          tx = this.x + 220;
          ty = this.y;
        }
        const want = Math.atan2(ty - s.y, tx - s.x);
        let cur = Math.atan2(s.vy, s.vx);
        let d = want - cur;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        const turn = (s.kind === 'orb' ? 420 : 300) * DEG * dt;
        cur += Math.max(-turn, Math.min(turn, d));
        const sp = Math.min(s.kind === 'orb' ? 420 : 340, Math.hypot(s.vx, s.vy) + 500 * dt);
        s.vx = Math.cos(cur) * sp;
        s.vy = Math.sin(cur) * sp;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.kind !== 'scythe' && (s.x - s.len > W + 20 || s.x < -40 || s.y < -30 || s.y > H + 30)) s.life = 0;
      if (s.life > 0) w.hitTest(s);
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  hit() {
    if (this.invuln > 0 || this.dead || this.entering > 0 || this.w.bombT > 0) return false;
    this.hp--;
    this.hitsTaken++;
    this.hitFlash = 0.12;
    G.audio.sfx('playerHit');
    this.w.fx.shake(3, 0.25);
    this.w.fx.flash(0.25, '#D94C3A');
    this.w.fx.spark(this.x, this.y, 16, ['#FFFFFF', this.ch.color, '#D94C3A'], 120, { life: 0.4 });
    this.w.clearBulletsNear(this.x, this.y, 22);
    this.w.hudPing('hp');
    if (this.hp <= 0) this.die();
    else {
      this.invuln = 1.5;
      if (this.hp === 1) G.audio.sfx('heartbeat');
    }
    return true;
  }

  private die() {
    this.dead = true;
    this.livesLost++;
    this.lives--;
    this.charging = false;
    this.chargeT = 0;
    this.respawnT = 1.0;
    G.audio.sfx('death');
    this.w.fx.explosion(this.x, this.y, 'm', ['#FFFFFF', this.ch.color, '#D94C3A', '#5A4A60']);
    this.w.fx.shake(3, 0.3);
    // power -1 level, scatter 2 P (docs/05 §7)
    const lost = Math.min(this.pp, 4);
    this.pp -= lost;
    for (let i = 0; i < Math.min(2, lost); i++) this.w.items.spawn('P', this.x, this.y, R.range(-60, 60), R.range(-90, -40));
    this.w.onPlayerDeath();
  }

  respawn() {
    this.dead = false;
    this.hp = this.maxHp;
    this.bombs = Math.max(2, this.bombs);
    this.x = -24;
    this.y = 180;
    this.entering = 0.8;
    this.invuln = 2.8;
    this.chargeCool = 0;
  }

  /** Continue: full HP, bombs 2, power -1 (docs/01 SCR-10). */
  continueRun() {
    this.lives = 3;
    this.dead = false;
    this.respawnT = 0;
    this.hp = this.maxHp;
    this.bombs = 2;
    this.x = -24;
    this.y = 180;
    this.entering = 0.8;
    this.invuln = 2.8;
  }

  draw(g: Ctx) {
    if (this.dead) return;
    const blink = this.invuln > 0 && Math.floor(this.anim * 20) % 2 === 0;
    const frames = this.hitFlash > 0 ? ART.heroFlash[this.ch.id] : ART.hero[this.ch.id];
    const fi = Math.floor(this.anim * 9) % 4;
    const f = frames[[0, 1, 2, 1][fi]];
    const bob = Math.round(Math.sin(this.anim * 3) * 1);
    if (blink) g.globalAlpha = 0.35;
    g.drawImage(f, Math.round(this.x - HERO_ANCHOR.x), Math.round(this.y - HERO_ANCHOR.y + bob));
    g.globalAlpha = 1;
    // charge aura / magic circle
    if (this.charging && this.chargeT > 0.05) {
      const k = this.chargeT / CHARGE_L2;
      g.strokeStyle = this.ch.color;
      g.globalAlpha = 0.5 + 0.5 * k;
      g.lineWidth = 1;
      const r = 8 + k * 10;
      g.beginPath();
      g.arc(Math.round(this.x), Math.round(this.y), r, this.anim * 3, this.anim * 3 + TAU * k);
      g.stroke();
      if (this.chargeT >= CHARGE_L2 && Math.floor(this.anim * 8) % 2 === 0) {
        g.beginPath();
        g.arc(Math.round(this.x), Math.round(this.y), r + 3, 0, TAU);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
  }

  drawHitbox(g: Ctx) {
    if (this.dead || !(this.focus || this.charging)) return;
    const x = Math.round(this.x), y = Math.round(this.y);
    g.fillStyle = '#D94C3A';
    g.beginPath();
    g.arc(x + 0.5, y + 0.5, 4.5, 0, TAU);
    g.fill();
    g.fillStyle = '#FFFFFF';
    g.fillRect(x - 1, y - 1, 3, 3);
  }

  drawShots(g: Ctx) {
    const vis = G.save.settings.shotVis / 100;
    g.globalAlpha = vis;
    const prev = g.globalCompositeOperation;
    g.globalCompositeOperation = 'lighter';
    for (const s of this.shots) {
      const x = Math.round(s.x), y = Math.round(s.y);
      if (s.kind === 'basic') {
        const spr = ART.shot[this.ch.id];
        if (this.ch.id === 'morgana') {
          g.save();
          g.translate(x, y);
          g.rotate(Math.atan2(s.vy, s.vx));
          g.drawImage(spr, -5, -3);
          g.restore();
        } else g.drawImage(spr, x - spr.width + 2, y - Math.floor(spr.height / 2));
      } else if (s.kind === 'lance' || s.kind === 'bolt') {
        const col = this.ch.id === 'seraphine' ? '#D8B35E' : '#C8D2EA';
        const th = s.kind === 'lance' ? (s.len > 50 ? 4 : 3) : 2;
        g.fillStyle = col;
        g.fillRect(x - s.len, y - th / 2, s.len, th);
        g.fillStyle = '#FFFFFF';
        g.fillRect(x - s.len * 0.7, y - 0.5, s.len * 0.7, 1);
        g.beginPath();
        g.moveTo(x + 6, y);
        g.lineTo(x, y - th);
        g.lineTo(x, y + th);
        g.fillStyle = col;
        g.fill();
      } else if (s.kind === 'scythe') {
        g.save();
        g.translate(x, y);
        g.rotate(s.ang);
        g.strokeStyle = '#C8D2EA';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(0, 0, 11, 0, Math.PI * 1.2);
        g.stroke();
        g.strokeStyle = '#B3263B';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(0, 0, 13, 0.2, Math.PI * 1.1);
        g.stroke();
        g.restore();
      } else {
        g.fillStyle = s.kind === 'orb' ? '#B79CFF' : '#E89AC9';
        g.beginPath();
        g.arc(x, y, s.kind === 'orb' ? 3 : 2.5, 0, TAU);
        g.fill();
        g.fillStyle = '#FFFFFF';
        g.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    g.globalCompositeOperation = prev;
    g.globalAlpha = 1;
  }

  drawGlow(ctx: Ctx) {
    const glow = ART.glow[this.ch.glow];
    ctx.globalAlpha = 0.25 * (G.save.settings.shotVis / 100);
    for (const s of this.shots) {
      if (s.kind === 'basic') {
        ctx.drawImage(glow, s.x - 9, s.y - 9, 18, 18);
      } else if (s.kind === 'lance' || s.kind === 'bolt') {
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < s.len; i += 10) ctx.drawImage(glow, s.x - i - 12, s.y - 12, 24, 24);
        ctx.globalAlpha = 0.25;
      } else {
        ctx.globalAlpha = 0.6;
        const sz = s.kind === 'scythe' ? 46 : 22;
        ctx.drawImage(s.kind === 'scythe' ? ART.glow.silver : glow, s.x - sz / 2, s.y - sz / 2, sz, sz);
        ctx.globalAlpha = 0.25;
      }
    }
    if (!this.dead && this.charging) {
      const k = this.chargeT / CHARGE_L2;
      ctx.globalAlpha = 0.25 + 0.5 * k;
      const sz = 30 + 40 * k;
      ctx.drawImage(glow, this.x - sz / 2, this.y - sz / 2, sz, sz);
    }
    if (!this.dead && this.entering <= 0) {
      ctx.globalAlpha = 0.18;
      ctx.drawImage(glow, this.x - 22, this.y - 22, 44, 44);
    }
    ctx.globalAlpha = 1;
  }
}
