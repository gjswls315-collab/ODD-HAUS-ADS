import { G } from '../core/app';
import { H, W } from '../core/constants';
import { clamp, DEG, fxRng as R, TAU } from '../core/math';
import { Ctx } from '../gfx/canvas';
import { sheet } from '../gfx/assets';
import { SHEET } from '../gfx/sprites';
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
  /** smoothed vertical input for the tilt frames (-1 up .. 1 down) */
  tilt = 0;
  castT = 0;
  hurtT = 0;
  muzzleT = 0;
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
    this.castT = Math.max(0, this.castT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.muzzleT = Math.max(0, this.muzzleT - dt);
    this.tilt += (this.moving - this.tilt) * Math.min(1, dt * 12);
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
        this.w.fx.ring(this.x, this.y);
      }
      if (this.chargeT >= CHARGE_L2 && this.chargeNotified < 2) {
        this.chargeNotified = 2;
        G.audio.sfx('charge2');
        this.w.fx.ring(this.x, this.y);
        this.w.fx.anim(SHEET.heroFx(this.ch.id), 'release', this.x, this.y);
      }
      if (R.next() < 0.35) {
        const a = R.range(0, TAU), d = R.range(12, 20);
        this.w.fx.spark(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, 1, [this.ch.color, '#ECEEF1'], 30, { dir: a + Math.PI, spread: 0.1, life: 0.3, drag: 0, size: 1 });
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
    this.muzzleT = 0.1;
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
    this.castT = 0.27;
    this.w.fx.anim(SHEET.heroFx(this.ch.id), 'release', this.x + 16, this.y);
    if (this.ch.id === 'seraphine' && level === 2) this.w.fx.anim(SHEET.heroFx('seraphine'), 'cross', this.x + 18, this.y);
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
    this.castT = 0.4;
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
    this.hurtT = 0.32;
    G.audio.sfx('playerHit');
    this.w.fx.shake(3, 0.25);
    this.w.fx.flash(0.25, '#C91C30');
    this.w.fx.anim(SHEET.fx, 'hit_core', this.x, this.y);
    this.w.fx.spark(this.x, this.y, 12, ['#ECEEF1', this.ch.color, '#C91C30'], 120, { life: 0.4 });
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
    this.w.fx.anim(SHEET.heroFx(this.ch.id), 'death', this.x, this.y);
    this.w.fx.spark(this.x, this.y, 18, ['#ECEEF1', this.ch.color, '#C91C30', '#4D5461'], 140, { life: 0.7, size: 2 });
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

  /** Body tag for the current state (sprites/hero_<id>: fly, up, down, charge, hit, cast). */
  private bodyTag() {
    if (this.hurtT > 0) return 'hit';
    if (this.castT > 0) return 'cast';
    if (this.charging && this.chargeT > 0.05) return 'charge';
    if (this.tilt < -0.35) return 'up';
    if (this.tilt > 0.35) return 'down';
    return 'fly';
  }

  draw(g: Ctx) {
    if (this.dead) return;
    // invulnerability: classic arcade flicker (skip alternate 1/20 s) instead of translucency
    if (this.invuln > 0 && this.hurtT <= 0 && Math.floor(this.anim * 20) % 2 === 0) return;
    const body = sheet(SHEET.hero(this.ch.id)), fx = sheet(SHEET.heroFx(this.ch.id));
    const x = Math.round(this.x), y = Math.round(this.y);
    const charged = this.charging && this.chargeT > 0.05;
    if (charged) {
      const tag = this.chargeT >= CHARGE_L2 ? 'aura_full' : 'aura';
      fx.draw(g, tag, fx.index(tag, this.anim), x, y);
    }
    const tag = this.bodyTag();
    const t = tag === 'hit' ? 0.32 - this.hurtT : tag === 'cast' ? 0.27 - this.castT : this.anim;
    body.draw(g, tag, body.index(tag, t, tag !== 'hit' && tag !== 'cast'), x, y, { flash: this.hitFlash > 0 });
    if (this.muzzleT > 0 && this.entering <= 0) fx.draw(g, 'muzzle', fx.index('muzzle', 0.1 - this.muzzleT, false), x + 15, y);
    if (charged) {
      // 16x2 charge gauge under the character (fills to L1, then L2)
      const k = Math.min(1, this.chargeT / CHARGE_L2), l1 = Math.round((CHARGE_L1 / CHARGE_L2) * 16);
      g.fillStyle = '#07080B';
      g.fillRect(x - 9, y + 17, 18, 4);
      g.fillStyle = '#2B3039';
      g.fillRect(x - 8, y + 18, 16, 2);
      g.fillStyle = this.chargeT >= CHARGE_L2 && Math.floor(this.anim * 10) % 2 ? '#ECEEF1' : this.ch.color;
      g.fillRect(x - 8, y + 18, Math.round(16 * k), 2);
      g.fillStyle = '#07080B';
      g.fillRect(x - 8 + l1, y + 18, 1, 2);
    }
  }

  drawHitbox(g: Ctx) {
    if (this.dead || !(this.focus || this.charging)) return;
    const fx = sheet(SHEET.fx);
    fx.draw(g, 'hitbox', fx.index('hitbox', this.anim), Math.round(this.x), Math.round(this.y));
  }

  /** Player shots from sprites/hero_<id>_fx. Directional shots use pre-rotated frames; nothing is rotated at runtime. */
  drawShots(g: Ctx) {
    const vis = G.save.settings.shotVis / 100;
    const fx = sheet(SHEET.heroFx(this.ch.id));
    const o = { alpha: vis < 1 ? vis : undefined };
    for (const s of this.shots) {
      const x = s.x, y = s.y;
      if (s.kind === 'basic') {
        if (this.ch.id === 'morgana') {
          const deg = Math.atan2(s.vy, s.vx) / DEG;
          const i = clamp(Math.round((deg + 24) / 12), 0, 4);
          fx.draw(g, 'shot', i, x, y, o);
        } else fx.draw(g, 'shot', fx.index('shot', s.age), x, y, o);
      } else if (s.kind === 'lance') {
        const tag = s.len > 50 ? 'charge2' : 'charge1';
        fx.draw(g, tag, fx.index(tag, s.age), x + 2, y, o);
      } else if (s.kind === 'bolt') {
        fx.draw(g, 'charge1', fx.index('charge1', s.age), x + 2, y, o);
      } else if (s.kind === 'scythe') {
        fx.draw(g, 'scythe', Math.floor(((s.ang % TAU) + TAU) % TAU / (TAU / 8)) % 8, x, y, o);
      } else if (s.kind === 'spirit') {
        const a = ((Math.atan2(s.vy, s.vx) % TAU) + TAU) % TAU;
        fx.draw(g, 'spirit', Math.round(a / (TAU / 16)) % 16, x, y, o);
      } else {
        fx.draw(g, 'orb', fx.index('orb', s.age), x, y, o);
      }
    }
  }
}
