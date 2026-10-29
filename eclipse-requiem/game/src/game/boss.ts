import { G } from '../core/app';
import { H, W } from '../core/constants';
import { clamp, DEG, ease, fxRng as R, TAU } from '../core/math';
import { image, sheet } from '../gfx/assets';
import { Ctx } from '../gfx/canvas';
import { SHEET } from '../gfx/sprites';
import { SCORE } from './defs';
import { BellDrop, Debris, Lightning } from './hazards';
import type { HitCircle, Target, World } from './world';

// Bellkeeper Abaddon (docs/05 §11-§12). Times follow the doc: intro B+, transitions TR+, defeat D+.

const HP = 9000;
const THRESH = [0.65 * HP, 0.3 * HP, 0];
const PHASE_TIMER = [40, 40, 50];
const PHASE_NAME = [
  { en: 'SILENT TOLL', kr: '침묵의 종' },
  { en: 'LAMENT BELL', kr: '비탄의 종' },
  { en: 'FUNERAL COLLAPSE', kr: '장송의 붕괴' },
];
const ANCHOR = [{ x: 500, y: 196 }, { x: 470, y: 192 }, { x: 510, y: 186 }];
const CYCLE = [8.0, 9.0, 9.0];
// (x, y) is the soul-lantern core = the body sprite's pivot. Parts (head, arms, bell) hang from the body's
// slice points in sprites/boss_abaddon, the bell mouth and the hand hook come from the bell/arm slices,
// so replacing the art moves the bullet origins with it.
const BELL_TILTS = [-8, -4, 0, 4, 8]; // pre-rendered bell frames (degrees)
const boss = () => sheet(SHEET.boss);

type State = 'intro' | 'fight' | 'transition' | 'defeat' | 'collapse' | 'done';

export class Abaddon implements Target {
  alive = true;
  isBoss = true;
  x = ANCHOR[0].x;
  y = -170;
  hp = HP;
  maxHp = HP;
  state: State = 'intro';
  phase = 0;
  t = 0;
  pt = 0;
  ct = 0;
  combatT = 0;
  invuln = true;
  flash = 0;
  private flashCd = 0;
  wrath = false;
  lastToll = false;
  phaseByDamage = [false, false, false];
  private ringBase = 0;
  private prevCt = -1;
  private teleBell = 0;
  private armPose: 'down' | 'raise' | 'reach' = 'down';
  private armT = 0;
  private scream = 0;
  private bellAng = 0;
  private swingFrom = 0;
  private swingTo = 0;
  private swingT = -1;
  private pathLine = 0;
  private transFrom = { x: 0, y: 0 };
  private cracks = 0;
  private fade = 1;
  private dustT = 0;
  private shadowA = 0;
  private landed = false;
  barShown = false;
  hud = { barFill: 0 };

  constructor(private w: World) {
    w.stats.bossStart = w.t;
  }

  get contact() {
    return this.state === 'fight';
  }
  get vulnerable() {
    return this.state === 'fight' && !this.invuln;
  }
  private get bodyTag() {
    if (this.state === 'defeat' && this.t >= 2.0) return 'body_crumble';
    return this.phase === 0 ? 'body' : this.phase === 1 ? 'body_p2' : 'body_p3';
  }
  private get bellTag() {
    return 'bell_c' + Math.min(3, this.cracks + (this.phase >= 2 && this.state !== 'defeat' ? 1 : 0));
  }
  private get bellFrame() {
    const deg = (this.bellAng * 180) / Math.PI;
    let best = 0;
    for (let i = 1; i < BELL_TILTS.length; i++) if (Math.abs(BELL_TILTS[i] - deg) < Math.abs(BELL_TILTS[best] - deg)) best = i;
    return best;
  }
  /** Bell crown hang point (from the body's `bell` slice). */
  private get crown() {
    const [dx, dy] = boss().point('body', 0, 'bell');
    return { x: this.x + dx, y: this.y + dy };
  }
  get mouth() {
    const c = this.crown, [dx, dy] = boss().point(this.bellTag, this.bellFrame, 'mouth');
    return { x: c.x + dx, y: c.y + dy };
  }
  get hook() {
    const sh = boss(), [sx, sy] = sh.point('body', 0, 'armF'), [hx, hy] = sh.point('armF_' + this.armPose, 0, 'hook');
    return { x: this.x + sx + hx, y: this.y + sy + hy };
  }

  /** Core (weak point) x1, bell (armour) x0.5, head and robe x0.2 — sized to the sprite parts. */
  hitCircles(): HitCircle[] {
    if (this.state !== 'fight' && this.state !== 'transition') return [];
    const c = this.crown;
    return [
      { x: this.x, y: this.y, r: 14, mul: 1 },
      { x: c.x, y: c.y + 32, r: 30, mul: 0.5 },
      { x: this.x - 26, y: this.y - 50, r: 12, mul: 0.2 },
      { x: this.x + 6, y: this.y + 34, r: 42, mul: 0.2 },
    ];
  }

  takeDamage(d: number, _charge?: boolean, part = 1) {
    if (!this.vulnerable) return;
    this.hp -= d;
    // docs/03 §6-3: the 2-frame white flash only covers the core; the bell (armour) throws metal sparks
    if (part >= 1 && this.flashCd <= 0) {
      this.flash = 0.034;
      this.flashCd = 0.1;
    } else if (part === 0.5 && R.next() < 0.3) {
      const c = this.crown;
      this.w.fx.hit(c.x + R.range(-16, 8), c.y + R.range(12, 50), true);
    }
    G.audio.sfx('hit');
    const th = THRESH[this.phase];
    if (this.hp <= th) {
      this.hp = th; // overflow is discarded: no phase skipping
      if (this.phase < 2) this.beginTransition(true);
      else this.beginDefeat();
    }
  }

  // ---------------- state changes ----------------
  private beginTransition(byDamage: boolean) {
    const w = this.w;
    this.state = 'transition';
    this.t = 0;
    this.invuln = true;
    this.phaseByDamage[this.phase] = byDamage;
    this.transFrom = { x: this.x, y: this.y };
    w.player.bombLocked = true;
    w.hitstop = 0.08;
    if (byDamage) {
      w.addScore(SCORE.phaseBonus, this.x, this.y - 60);
      w.fx.popup(this.x, this.y - 72, 'PHASE BONUS', '#F2D58C');
    } else w.ui.push({ type: 'timeover' });
    this.pendingCancel = true;
  }
  private pendingCancel = false;

  private beginDefeat() {
    const w = this.w;
    this.state = 'defeat';
    this.t = 0;
    this.invuln = true;
    this.phaseByDamage[2] = true;
    w.player.invuln = 99;
    w.player.bombLocked = true;
    w.hitstop = 0.12;
    w.cancelBullets();
    w.items.collectAll = true;
    w.hazards.length = 0;
    w.stats.bossKilled = true;
    w.stats.bossKillTime = this.combatT;
    w.addScore(SCORE.boss, this.x, this.y - 30);
    w.addScore(SCORE.phaseBonus, this.x, this.y - 50);
    if (w.stats.bossHits === 0) {
      w.addScore(SCORE.noMiss);
      w.fx.popup(this.x - 40, this.y - 90, 'NO MISS BONUS', '#F2D58C');
    }
    if (w.stats.bossBombs === 0) {
      w.addScore(SCORE.noBomb);
      w.fx.popup(this.x - 40, this.y - 104, 'NO BOMB BONUS', '#F2D58C');
    }
    G.audio.sfx('toll');
  }

  private beginCollapse() {
    const w = this.w;
    this.state = 'collapse';
    this.t = 0;
    this.invuln = true;
    w.player.invuln = 99;
    w.player.bombLocked = true;
    w.cancelBullets();
    w.hazards.length = 0;
    w.stats.bossKillTime = this.combatT;
    w.ui.push({ type: 'timeover' });
  }

  // ---------------- update ----------------
  update(dt: number) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.flashCd = Math.max(0, this.flashCd - dt);
    this.teleBell = Math.max(0, this.teleBell - dt);
    this.scream = Math.max(0, this.scream - dt);
    this.pathLine = Math.max(0, this.pathLine - dt);
    if (this.armT > 0) {
      this.armT -= dt;
      if (this.armT <= 0) this.armPose = 'down';
    }
    if (this.dustT > 0) this.dustT -= dt;
    switch (this.state) {
      case 'intro': this.updateIntro(dt); break;
      case 'fight': this.updateFight(dt); break;
      case 'transition': this.updateTransition(); break;
      case 'defeat': this.updateDefeat(); break;
      case 'collapse': this.updateCollapse(); break;
    }
  }

  private at(t: number, prev: number) {
    return prev < t && this.t >= t;
  }

  private updateIntro(dt: number) {
    const w = this.w, t = this.t, prev = t - dt;
    if (this.at(0.001, prev) || prev <= 0) {
      G.audio.stopMusic(1.5);
      w.cancelBullets();
    }
    if (this.at(1.0, prev)) {
      G.audio.sfx('toll');
      w.fx.shake(1, 0.3);
    }
    if (this.at(1.5, prev)) w.ui.push({ type: 'warning', boss: true, name: 'BELLKEEPER ABADDON', kr: '침묵의 종지기', epithet: 'Guardian of the Silenced Toll' });
    for (const tt of [2.0, 3.0, 4.0]) if (this.at(tt, prev)) G.audio.sfx('toll', 0.7);
    if (this.at(4.5, prev)) {
      G.audio.music('boss');
      G.audio.setLayers([true, false, false]);
      w.ui.push({ type: 'bossHud', on: true });
    }
    if (t >= 4.5 && t < 5.5) this.shadowA = (t - 4.5) / 1.0;
    if (t >= 5.5 && t < 7.5) {
      const k = (t - 5.5) / 2.0;
      this.y = -170 + (ANCHOR[0].y + 170) * ease.outCubic(k);
      this.shadowA = 1 - k;
      if (R.next() < 0.5) w.fx.spark(R.range(300, 640), 0, 1, ['#6C605C', '#403838'], 30, { dir: Math.PI / 2, spread: 0.2, life: 1.2, grav: 80, drag: 0 });
    }
    if (t >= 7.5 && !this.landed) {
      this.landed = true;
      this.y = ANCHOR[0].y;
      this.shadowA = 0;
      w.fx.shake(2, 0.2);
      G.audio.sfx('toll');
      G.audio.sfx('scream');
      this.scream = 0.8;
      for (const dx of [-50, -20, 20, 50]) w.fx.anim(SHEET.fx, 'dust', this.x + dx, this.y + 84, { flipX: dx < 0 });
      // push the player out of the boss if overlapping
      if (w.player.x > this.x - 140) w.player.x = Math.max(16, this.x - 140);
      w.ui.push({ type: 'bossBar' });
      this.barShown = true;
    }
    if (t >= 7.8) this.hud.barFill = Math.min(1, (t - 7.8) / 1.0);
    for (const tt of [7.85, 8.2, 8.55]) if (this.at(tt, prev)) G.audio.sfx('tollSmall');
    if (t >= 8.8) {
      this.state = 'fight';
      this.t = 0;
      this.invuln = false;
      this.phase = 0;
      this.pt = 0;
      this.ct = 0;
      this.prevCt = -1;
      this.hud.barFill = 1;
      w.stats.bossCombat = 0;
      w.ui.push({ type: 'phase', ...PHASE_NAME[0] });
    }
  }

  private updateFight(dt: number) {
    const w = this.w;
    this.pt += dt;
    this.combatT += dt;
    w.stats.bossCombat = this.combatT;
    this.prevCt = this.ct;
    this.ct += dt;
    if (this.ct >= CYCLE[this.phase]) {
      this.ct -= CYCLE[this.phase];
      this.prevCt = -0.0001;
      this.ringBase += 4.5;
    }
    if (!this.wrath && this.combatT >= 90) {
      this.wrath = true;
      w.bullets.speedMul = 1.1;
      w.ui.push({ type: 'wrath' });
      G.audio.sfx('toll');
    }
    if (this.phase === 2 && !this.lastToll && this.hp <= 0.08 * HP) {
      this.lastToll = true;
      w.ui.push({ type: 'line', kr: '마지막 종이 울린다' });
    }
    if (this.phase === 0) this.p1(dt);
    else if (this.phase === 1) this.p2(dt);
    else this.p3(dt);
    // swing tween
    if (this.swingT >= 0) {
      this.swingT += dt;
      const k = clamp(this.swingT / 1.2, 0, 1);
      this.x = this.swingFrom + (this.swingTo - this.swingFrom) * ease.inOutCubic(k);
      if (k >= 1) this.swingT = -1;
    }
    if (this.pt >= PHASE_TIMER[this.phase]) {
      if (this.phase < 2) this.beginTransition(false);
      else this.beginCollapse();
    }
  }

  private c(t: number) {
    return this.prevCt < t && this.ct >= t;
  }
  private aimFrom(x: number, y: number) {
    return Math.atan2(this.w.player.y - y, this.w.player.x - x);
  }

  // P1 — Silent Toll (cycle 8.0 s)
  private p1(dt: number) {
    const w = this.w;
    const ct = this.ct;
    const base = ANCHOR[0];
    if (ct < 5.0 || ct >= 6.5) this.y += (base.y + Math.sin(this.pt * (TAU / 4)) * 30 - this.y) * Math.min(1, dt * 2);
    else this.y += (clamp(w.player.y, 150, 210) - this.y) * Math.min(1, dt * 1.5);
    if (this.c(0.0001)) this.tele(0.8, true);
    if (this.c(0.8)) this.ring(0);
    if (this.c(1.3)) this.ring(9);
    if (this.c(2.2)) {
      this.armPose = 'raise';
      this.armT = 1.2;
    }
    for (const tt of [2.7, 2.95, 3.2]) {
      if (this.c(tt)) {
        const h = this.hook;
        w.bullets.fan('B01', h.x, h.y, this.aimFrom(h.x, h.y), 7, 48, 110);
      }
    }
    if (this.c(4.2)) {
      this.bellAng = -0.15;
      this.tele(0.8, false);
    }
    if (this.c(5.0)) {
      this.bellAng = 0.1;
      const m = this.mouth;
      for (let i = 0; i < 13; i++) w.bullets.fire('B06', m.x, m.y, Math.PI + (-60 + i * 10) * DEG, 60, { accel: 60, speedMax: 120 });
      w.fx.ring(m.x, m.y);
      G.audio.sfx('toll', 0.5);
    }
    this.bellAng += (0 - this.bellAng) * Math.min(1, dt * 2);
  }

  private ring(offset: number) {
    const m = this.mouth;
    this.w.bullets.radial('B05', m.x, m.y, 20, this.ringBase + offset, 70);
    G.audio.sfx('toll', 0.55);
    this.w.fx.ring(m.x, m.y);
  }

  private tele(dur: number, scream: boolean) {
    this.teleBell = dur;
    if (scream) {
      this.scream = dur;
      G.audio.sfx('scream');
    }
  }

  // P2 — Lament Bell (cycle 9.0 s)
  private p2(dt: number) {
    const w = this.w;
    if (this.swingT < 0) this.y += (ANCHOR[1].y + Math.sin(this.pt * 1.3) * 20 - this.y) * Math.min(1, dt * 2);
    if (this.c(0.0001)) this.tele(0.8, true);
    if (this.c(0.8)) {
      const alive = w.bullets.list.filter((b) => b.alive && b.type === 'B04').length;
      const m = this.mouth;
      if (alive < 8) for (const a of [60, -60, 120, -120]) w.bullets.fire('B04', m.x, m.y, Math.PI + a * DEG, 80, { accel: 20, speedMax: 100, homingTurn: 75, homingT: 2.0, hp: 10 });
    }
    if (this.c(1.6)) {
      this.pathLine = 0.6;
      this.armPose = 'reach';
      this.armT = 2.0;
    }
    if (this.c(2.2)) this.swing(400);
    if (this.c(3.4)) this.griefWave(0);
    if (this.c(5.0)) this.pathLine = 0.6;
    if (this.c(5.6)) this.swing(470);
    if (this.c(6.8)) this.griefWave(Math.PI);
    this.bellAng += (Math.sin(this.pt * 2) * 0.12 - this.bellAng) * Math.min(1, dt * 3);
  }

  private swing(to: number) {
    this.swingFrom = this.x;
    this.swingTo = to;
    this.swingT = 0;
    G.audio.sfx('whoosh');
  }

  private griefWave(phase: number) {
    const w = this.w;
    const m = this.mouth;
    for (let s = 0; s < 3; s++)
      for (let i = 0; i < 10; i++)
        w.bullets.fire('B06', m.x, m.y + (s - 1) * 30, Math.PI, 100, { waveAmp: 28, waveLen: 120, wavePhase: phase + s * 2, delay: i * 0.12 });
    const gap = this.aimFrom(m.x, m.y);
    w.bullets.radial('B02', m.x, m.y, 24, R.range(0, 15), 55, {}, (_i, a) => {
      let d = Math.abs(((a - gap) % TAU + TAU) % TAU);
      if (d > Math.PI) d = TAU - d;
      return d < 2.1 * (TAU / 24);
    });
    G.audio.sfx('toll', 0.5);
  }

  // P3 — Funeral Collapse (cycle 9.0 s)
  private p3(dt: number) {
    const w = this.w;
    this.y += (ANCHOR[2].y + Math.sin(this.pt * 8) * 1 - this.y) * Math.min(1, dt * 2);
    const layers = this.lastToll ? [0.8, 3.3, 5.8, 8.3] : [0.8, 3.8, 6.8];
    for (const L of layers) {
      if (this.c(Math.max(0.0001, L - 0.4))) this.tele(0.4, false);
      if (this.c(L)) this.layers();
    }
    if (this.c(2.0)) this.lightning(this.lastToll ? 3 : 2);
    if (this.c(4.6)) {
      w.hazards.push(new BellDrop(w, w.player.x, w.player.y, 1.2));
      this.scream = 0.6;
    }
    if (this.c(7.0)) this.lightning(3);
    // falling rubble and dust (decorative) + red lightning in the sky
    if (R.next() < dt * 1.2) w.hazards.push(new Debris(w, R.range(20, 360), 0.8, true));
    if (R.next() < dt * 10) w.fx.spark(R.range(0, W), 0, 1, ['#544A48', '#403838', '#312B2C'], 20, { dir: Math.PI / 2, spread: 0.3, life: 2.4, grav: 30, drag: 0, size: 2 });
    this.bellAng += (Math.sin(this.pt * 3) * 0.08 - this.bellAng) * Math.min(1, dt * 3);
  }

  private layers() {
    const w = this.w;
    const m = this.mouth;
    const base = this.aimFrom(m.x, m.y) + R.range(-20, 20) * DEG;
    const speeds = [60, 80, 100].map((s) => s * (this.lastToll ? 1.1 : 1));
    speeds.forEach((sp, li) => {
      const gap = base + li * 10 * DEG;
      w.bullets.radial('B02', m.x, m.y, 20, li * 6, sp, {}, (_i, a) => {
        let d = Math.abs(((a - gap) % TAU + TAU) % TAU);
        if (d > Math.PI) d = TAU - d;
        return d < 1.6 * (TAU / 20);
      });
    });
    G.audio.sfx('toll', 0.5);
    this.w.fx.ring(m.x, m.y, true);
  }

  private lightning(n: number) {
    const w = this.w;
    const px = w.player.x;
    const xs = [px];
    const side = R.sign();
    xs.push(clamp(px + side * R.range(96, 160), 20, W - 20));
    if (n >= 3) xs.push(clamp(px - side * R.range(96, 160), 20, W - 20));
    for (const x of xs) w.hazards.push(new Lightning(w, x, 1.0, 0.3, 28, false));
  }

  private updateTransition() {
    const w = this.w, t = this.t;
    if (this.pendingCancel) {
      this.pendingCancel = false;
      w.cancelBullets();
      w.hazards.length = 0;
      G.audio.sfx('toll');
      G.audio.sfx('scream');
      this.scream = 0.6;
      w.fx.shake(2, 0.25);
      w.bg?.bolt(this.phase === 1);
      const next = this.phase + 1;
      if (next === 1) w.bg?.setTint('#B3263B', 0.12);
      if (next === 2) {
        w.bg?.setTint('#B3263B', 0.22);
        for (let i = 0; i < 8; i++) w.fx.anim(SHEET.fx, 'debris', this.crown.x, this.crown.y, { vx: R.range(-120, 60), vy: R.range(-160, -40), grav: 380 });
        if (w.bg) {
          w.bg.belfryBroken = true;
          w.bg.lightningRate = 0.5;
          w.bg.belfryShake = 1;
          w.bg.dim = 0.1;
        }
      }
    }
    if (t >= 0.5 && t - (1 / 60) < 0.5) w.ui.push({ type: 'phase', ...PHASE_NAME[this.phase + 1] });
    const next = ANCHOR[this.phase + 1];
    if (t >= 0.68) {
      const k = clamp((t - 0.68) / 1.0, 0, 1);
      this.x = this.transFrom.x + (next.x - this.transFrom.x) * ease.inOutCubic(k);
      this.y = this.transFrom.y + (next.y - this.transFrom.y) * ease.inOutCubic(k);
    }
    if (t >= 1.7) {
      this.phase++;
      this.state = 'fight';
      this.invuln = false;
      this.pt = 0;
      this.ct = 0;
      this.prevCt = -1;
      this.swingT = -1;
      w.player.bombLocked = false;
      G.audio.setLayers([true, this.phase >= 1, this.phase >= 2]);
    }
  }

  private updateDefeat() {
    const w = this.w, t = this.t;
    const prev = t - 1 / 60;
    for (const [tt, n] of [[0.3, 1], [0.6, 2], [0.9, 3]] as [number, number][]) {
      if (prev < tt && t >= tt) {
        this.cracks = n;
        this.flash = 0.05;
        G.audio.sfx('crack');
        w.fx.shake(1, 0.1);
        const c = this.crown;
        for (let i = 0; i < 2 + n; i++) w.fx.anim(SHEET.fx, 'bellshard', c.x + R.range(-20, 20), c.y + R.range(20, 60), { vx: R.range(-80, 80), vy: R.range(-150, -50), grav: 360 });
      }
    }
    if (t >= 1.0 && t < 2.0 && R.next() < 0.4) {
      const m = this.mouth;
      w.fx.spark(m.x + R.range(-20, 20), m.y, 1, ['#E6EEF5', '#B7C6D5', '#7F93A8'], 60, { dir: -Math.PI / 2, spread: 0.6, life: 1.4, drag: 0.5, size: 2 });
    }
    if (prev < 1.0 && t >= 1.0) G.audio.sfx('sting');
    for (let i = 0; i < 6; i++) {
      const tt = 2.0 + i * 0.25;
      if (prev < tt && t >= tt) {
        w.fx.explosion(this.x + R.range(-50, 60), this.y + R.range(-90, 60), 'm');
        G.audio.sfx('explodeM');
        w.fx.shake(2, 0.1);
      }
    }
    if (prev < 3.5 && t >= 3.5) {
      w.fx.anim(SHEET.fx, 'burst_boss', this.x, this.y - 20);
      w.fx.anim(SHEET.fx, 'ring_red', this.x, this.y - 20);
      w.fx.explosion(this.x + 20, this.y - 60, 'l');
      w.fx.explosion(this.x, this.y + 30, 'l');
      const c = this.crown;
      for (let i = 0; i < 12; i++) w.fx.anim(SHEET.fx, 'bellshard', c.x + R.range(-24, 24), c.y + R.range(10, 70), { vx: R.range(-160, 160), vy: R.range(-220, -40), grav: 380 });
      w.fx.flash(1, '#ECEEF1');
      w.fx.shake(3, 0.25);
      G.audio.sfx('explodeL');
      G.audio.stopMusic(0.2);
      this.fade = 0;
    }
    if (t >= 3.5 && t < 4.5 && w.bg) {
      w.bg.setFog(0.08);
      w.bg.setTint('#000000', 0);
      w.bg.lightningRate = 0;
      w.bg.belfryShake = 0;
      w.bg.dim = 0;
    }
    if (prev < 4.5 && t >= 4.5) {
      G.audio.music('victory');
      w.player.autoPilot = { x: 220, y: 190 };
      w.ui.push({ type: 'bossHud', on: false });
    }
    if (t >= 5.5) {
      this.state = 'done';
      this.alive = false;
      w.cleared = true;
    }
  }

  private updateCollapse() {
    const w = this.w, t = this.t;
    this.y += 50 * (1 / 60);
    this.fade = Math.max(0, 1 - t / 2);
    if (t >= 2 && t - 1 / 60 < 2) {
      G.audio.stopMusic(1);
      w.bg?.setFog(0.1);
      w.bg?.setTint('#000000', 0);
      if (w.bg) w.bg.lightningRate = 0;
    }
    if (t >= 3 && t - 1 / 60 < 3) {
      G.audio.music('victory');
      w.player.autoPilot = { x: 220, y: 190 };
      w.ui.push({ type: 'bossHud', on: false });
    }
    if (t >= 4) {
      this.state = 'done';
      this.alive = false;
      w.cleared = true;
    }
  }

  // ---------------- drawing ----------------
  /** Parts back to front: shadow, back arm, bell (+ mouth glow), body, head, core, front arm. */
  draw(g: Ctx) {
    if (this.state === 'done') return;
    const sh = boss(), fx = sheet(SHEET.fx);
    const x = Math.round(this.x), y = Math.round(this.y);
    const dither = this.fade >= 1 ? undefined : Math.round(this.fade * 16);
    // descending bell shadow over the top of the screen (intro)
    if (this.shadowA > 0) sh.draw(g, 'shadow', 0, 500, 30, { dither: Math.round(this.shadowA * 12) });
    if (this.fade <= 0) return;
    const flash = this.flash > 0;
    const bodyTag = this.bodyTag, bt = this.state === 'defeat' && this.t >= 2.0 ? this.t - 2.0 : this.t;
    const bi = sh.index(bodyTag, bt, bodyTag !== 'body_crumble');
    const at = (name: string) => { const [dx, dy] = sh.point(bodyTag, bi, name); return [x + dx, y + dy]; };
    const o = { dither };
    const [abx, aby] = at('armB');
    sh.draw(g, 'armB', 0, abx, aby, o);
    const [cx, cy] = at('bell');
    if (this.state !== 'defeat' || this.t < 3.5) sh.draw(g, this.bellTag, this.bellFrame, cx, cy, o);
    const m = this.mouth;
    if ((this.teleBell > 0 || this.scream > 0 || (this.wrath && this.state === 'fight')) && this.state !== 'defeat') sh.draw(g, 'bellglow', sh.index('bellglow', this.t), m.x, m.y, o);
    sh.draw(g, bodyTag, bi, x, y, o);
    if (bodyTag !== 'body_crumble') {
      const [hx, hy] = at('head');
      const headTag = this.state === 'transition' || this.state === 'defeat' || this.state === 'collapse' ? 'head_hurt' : this.scream > 0 ? 'head_scream' : 'head';
      sh.draw(g, headTag, sh.index(headTag, this.t), hx, hy, o);
      sh.draw(g, flash ? 'core_hit' : 'core', sh.index('core', this.t), x, y, o);
      const [ax, ay] = at('armF');
      sh.draw(g, 'armF_' + this.armPose, 0, ax, ay, o);
    }
    // weak-point flash only covers the core (docs/03 §6-3); a white pulse on the whole body when a phase breaks
    if (flash && this.state !== 'fight') sh.draw(g, bodyTag, bi, x, y, { flash: true, dither: 8 });
    if (this.state === 'fight' && this.teleBell > 0) fx.draw(g, 'warn', Math.floor(this.t * 10) % 2, m.x, m.y + 18);
  }

  /** P3: collapse dust drifting across the top band (the stage's own fog layer art, scrolled). */
  drawFront(g: Ctx) {
    if (this.phase === 2 && (this.state === 'fight' || this.state === 'transition')) {
      const img = image('stage1/fog_b');
      const off = Math.floor((this.t * 24) % img.width);
      for (let x = -off; x < W; x += img.width) g.drawImage(img, x, -64);
    }
  }

  /** P2 swing telegraph: dotted path along the floor of the swing and the landing column. */
  drawTele(g: Ctx) {
    if (this.pathLine > 0 && this.state === 'fight') {
      const fx = sheet(SHEET.fx), f = Math.floor(this.t * 12) % 2;
      const to = this.x > 440 ? 400 : 470;
      const x0 = Math.min(this.x, to) - 60, x1 = Math.max(this.x, to) - 40;
      for (let px = x0; px <= x1; px += 6) fx.draw(g, 'teledot', f, px, this.y + 80);
      for (let py = this.y - 100; py <= this.y + 80; py += 6) fx.draw(g, 'teledot', f, to - 60, py);
    }
  }

  /** For HUD. */
  get hpFrac() {
    return Math.max(0, this.hp / this.maxHp);
  }
  get phaseIndex() {
    return this.phase;
  }
  get visible() {
    return this.state !== 'done';
  }
  get dustActive() {
    return this.dustT > 0;
  }
  get onScreenH() {
    return H;
  }
}
