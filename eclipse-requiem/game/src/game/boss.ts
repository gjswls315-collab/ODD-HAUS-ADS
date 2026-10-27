import { G } from '../core/app';
import { H, W } from '../core/constants';
import { clamp, DEG, ease, fxRng as R, TAU } from '../core/math';
import { Ctx } from '../gfx/canvas';
import { ART } from '../gfx/sprites';
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
const ANCHOR = [{ x: 500, y: 190 }, { x: 470, y: 185 }, { x: 510, y: 170 }];
const CYCLE = [8.0, 9.0, 9.0];
// core = (x,y); body sprite core pixel (97,119). The bell rotates around its crown (pivot); at angle 0 its mouth sits above-left of the head.
const PIVOT = { x: 79, y: -135 };
const MOUTH_FROM_PIVOT = { x: -117, y: 39 };
const BELL_CROWN_PX = { x: 169, y: 51 };

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
  get mouth() {
    const a = this.bellAng, c = Math.cos(a), s = Math.sin(a);
    const mx = MOUTH_FROM_PIVOT.x * c - MOUTH_FROM_PIVOT.y * s, my = MOUTH_FROM_PIVOT.x * s + MOUTH_FROM_PIVOT.y * c;
    return { x: this.x + PIVOT.x + mx, y: this.y + PIVOT.y + my };
  }
  get hook() {
    if (this.armPose === 'raise') return { x: this.x - 92, y: this.y - 67 };
    if (this.armPose === 'reach') return { x: this.x - 116, y: this.y - 13 };
    return { x: this.x - 80, y: this.y + 55 };
  }

  hitCircles(): HitCircle[] {
    if (this.state !== 'fight' && this.state !== 'transition') return [];
    return [
      { x: this.x - 1, y: this.y, r: 24, mul: 1 },
      { x: this.x + 20, y: this.y - 115, r: 44, mul: 0.5 },
      { x: this.x - 34, y: this.y - 58, r: 24, mul: 0.2 },
      { x: this.x + 30, y: this.y + 40, r: 58, mul: 0.2 },
    ];
  }

  takeDamage(d: number) {
    if (!this.vulnerable) {
      if (this.state === 'fight' || this.state === 'transition') this.flash = 0;
      return;
    }
    this.hp -= d;
    this.flash = 0.034; // 2 frames white flash
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
      w.fx.popup(this.x, this.y - 72, 'PHASE BONUS', '#D8B35E');
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
      w.fx.popup(this.x - 40, this.y - 90, 'NO MISS BONUS', '#D8B35E');
    }
    if (w.stats.bossBombs === 0) {
      w.addScore(SCORE.noBomb);
      w.fx.popup(this.x - 40, this.y - 104, 'NO BOMB BONUS', '#D8B35E');
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
      if (R.next() < 0.5) w.fx.spark(R.range(300, 640), 0, 1, ['#6E6A60', '#3A3742'], 30, { dir: Math.PI / 2, spread: 0.2, life: 1.2, grav: 80, drag: 0 });
    }
    if (t >= 7.5 && !this.landed) {
      this.landed = true;
      this.y = ANCHOR[0].y;
      this.shadowA = 0;
      w.fx.shake(2, 0.2);
      G.audio.sfx('toll');
      G.audio.sfx('scream');
      this.scream = 0.8;
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
      w.fx.ring(m.x, m.y, 6, 220, 0.6, '#59B7C9', 1, 'cyan');
      G.audio.sfx('toll', 0.5);
    }
    this.bellAng += (0 - this.bellAng) * Math.min(1, dt * 2);
  }

  private ring(offset: number) {
    const m = this.mouth;
    this.w.bullets.radial('B05', m.x, m.y, 20, this.ringBase + offset, 70);
    G.audio.sfx('toll', 0.55);
    this.w.fx.ring(m.x, m.y, 4, 120, 0.5, '#9A6BFF', 1, 'violet');
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
    this.w.fx.ring(m.x, m.y, 4, 150, 0.5, '#D94C3A', 1, 'red');
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
        if (w.bg) {
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
      }
    }
    if (t >= 1.0 && t < 2.0 && R.next() < 0.4) {
      const m = this.mouth;
      w.fx.spark(m.x + R.range(-20, 20), m.y, 1, ['#BFF4FF', '#59B7C9', '#FFFFFF'], 60, { dir: -Math.PI / 2, spread: 0.6, life: 1.4, drag: 0.5, size: 2, glow: 'cyan' });
    }
    if (prev < 1.0 && t >= 1.0) G.audio.sfx('sting');
    for (let i = 0; i < 6; i++) {
      const tt = 2.0 + i * 0.25;
      if (prev < tt && t >= tt) {
        w.fx.explosion(this.x + R.range(-70, 70), this.y + R.range(-120, 60), 'm');
        G.audio.sfx('explodeM');
        w.fx.shake(2, 0.1);
      }
    }
    if (prev < 3.5 && t >= 3.5) {
      w.fx.explosion(this.x, this.y - 40, 'l');
      w.fx.explosion(this.x, this.y + 20, 'l');
      w.fx.flash(1, '#FFFFFF');
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
    if (t >= 3) {
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
  draw(g: Ctx) {
    if (this.state === 'done') return;
    const B = ART.boss;
    const x = Math.round(this.x), y = Math.round(this.y);
    g.globalAlpha = this.fade;
    // descending bell shadow over the top of the screen
    if (this.shadowA > 0) {
      g.globalAlpha = this.shadowA * 0.6;
      g.fillStyle = '#050508';
      g.beginPath();
      g.ellipse(500, 30, 150, 70, 0, 0, TAU);
      g.fill();
      g.globalAlpha = this.fade;
    }
    g.drawImage(B.armBack, x + 43 - 111, y - 37 - 31);
    // bell (rotates slightly around the yoke)
    const bell = B.bell[Math.min(3, this.cracks + (this.phase >= 2 && this.state !== 'defeat' ? 1 : 0))];
    g.save();
    g.translate(x + PIVOT.x, y + PIVOT.y);
    g.rotate(this.bellAng);
    g.drawImage(bell, -BELL_CROWN_PX.x, -BELL_CROWN_PX.y);
    // ghost faces inside the bell mouth (mouth axis is rotated ~72 degrees in the sprite)
    g.translate(MOUTH_FROM_PIVOT.x, MOUTH_FROM_PIVOT.y);
    g.rotate(1.25);
    g.drawImage(B.faces[this.scream > 0 ? 1 : 0], -28, -16);
    g.restore();
    g.drawImage(this.flash > 0 ? B.bodyFlash : B.body, x - 97, y - 119);
    g.drawImage(B.arm[this.armPose], x - 22 - 111, y - 39 - 31);
    g.globalAlpha = 1;
  }

  drawFront(g: Ctx) {
    if (this.phase === 2 && (this.state === 'fight' || this.state === 'transition')) {
      // collapse dust partially obscuring the top 20% (decorative; enemy bullets are drawn above)
      g.globalAlpha = 0.3;
      g.fillStyle = '#3A3742';
      for (let i = 0; i < 40; i++) {
        const px = (i * 53 + this.t * 20 * (1 + (i % 3))) % W;
        const py = (i * 17) % 72;
        g.fillRect(Math.round(px), Math.round(py), 6 + (i % 4) * 3, 3);
      }
      g.globalAlpha = 1;
    }
  }

  drawTele(g: Ctx) {
    if (this.pathLine > 0 && this.state === 'fight') {
      const to = this.x > 440 ? 400 : 470;
      g.globalAlpha = 0.5 + 0.4 * Math.sin(this.t * 30);
      g.fillStyle = '#D94C3A';
      const x0 = Math.min(this.x, to) - 128, x1 = Math.max(this.x, to) - 100;
      g.fillRect(Math.round(x0), Math.round(this.y + 96), Math.round(x1 - x0), 2);
      g.fillRect(Math.round(to - 128), Math.round(this.y - 120), 1, 220);
      g.globalAlpha = 1;
    }
  }

  drawGlow(ctx: Ctx) {
    if (this.state === 'done') return;
    const f = this.fade;
    // soul lantern core
    const pulse = 0.7 + 0.3 * Math.sin(this.t * 6);
    ctx.globalAlpha = 0.65 * pulse * f;
    ctx.drawImage(ART.glow.cyan, this.x - 24, this.y - 24, 48, 48);
    // eyes
    ctx.globalAlpha = 0.6 * f;
    ctx.drawImage(ART.glow.red, this.x - 50, this.y - 76, 22, 22);
    ctx.drawImage(ART.glow.red, this.x - 38, this.y - 77, 22, 22);
    // bell mouth glow when telegraphing / screaming
    const m = this.mouth;
    if (this.teleBell > 0 || this.scream > 0) {
      ctx.globalAlpha = 0.85 * f;
      const s = 90;
      ctx.drawImage(this.phase === 1 ? ART.glow.cyan : this.phase === 2 ? ART.glow.red : ART.glow.violet, m.x - s / 2, m.y - s / 2, s, s);
    } else {
      ctx.globalAlpha = 0.3 * f;
      ctx.drawImage(ART.glow.cyan, m.x - 30, m.y - 30, 60, 60);
    }
    if (this.wrath && this.state === 'fight') {
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.t * 8);
      ctx.drawImage(ART.glow.red, this.x - 140, this.y - 200, 280, 320);
    }
    ctx.globalAlpha = 1;
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
