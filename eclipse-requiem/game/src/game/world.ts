import { G } from '../core/app';
import { H, W } from '../core/constants';
import { fxRng as R, TAU } from '../core/math';
import { Ctx } from '../gfx/canvas';
import { Renderer } from '../gfx/renderer';
import { ART } from '../gfx/sprites';
import { HeroId } from '../gfx/art/heroines';
import { BulletPool } from './bullets';
import { CHARS, CharDef, SCORE } from './defs';
import { Enemy, Group } from './enemies';
import { Fx } from './fx';
import { Hazard } from './hazards';
import { Items } from './items';
import { Player, PShot } from './player';
import { StageBg } from './stagebg';
import type { Director } from './director';
import type { Abaddon } from './boss';
import type { Graven } from './midboss';

export interface HitCircle { x: number; y: number; r: number; mul: number }
export interface Target {
  x: number;
  y: number;
  alive: boolean;
  isBoss: boolean;
  hitCircles(): HitCircle[];
  takeDamage(d: number, charge?: boolean, part?: number): void;
  damageMod?(charge: boolean): number;
}

export type UiEvent =
  | { type: 'caption'; en: string; kr: string }
  | { type: 'title' }
  | { type: 'tip'; id: string; text: string; key: string }
  | { type: 'warning'; boss: boolean; name: string; kr: string; epithet: string }
  | { type: 'phase'; en: string; kr: string }
  | { type: 'bombCut'; hero: HeroId }
  | { type: 'bossHud'; on: boolean }
  | { type: 'bossBar' }
  | { type: 'line'; kr: string }
  | { type: 'wrath' }
  | { type: 'timeover' };

export interface Stats {
  charges: number;
  bossStart: number;
  bossCombat: number;
  bossKillTime: number;
  bossHits: number;
  bossBombs: number;
  continues: number;
  wipes: number;
  bossKilled: boolean;
  stageTime: number;
}

const BOMB_DUR: Record<HeroId, number> = { seraphine: 1.6, noctis: 1.2, morgana: 3.0 };
const BOMB_BOSS_CAP = 300;

export class World {
  ch: CharDef;
  player: Player;
  bullets = new BulletPool();
  enemies: Enemy[] = [];
  items: Items;
  fx = new Fx();
  hazards: Hazard[] = [];
  extraTargets: Target[] = [];
  boss: Abaddon | null = null;
  midboss: Graven | null = null;
  director: Director | null = null;
  bg: StageBg | null = null;
  score = 0;
  chain = 0;
  chainT = 0;
  maxChain = 0;
  graze = 0;
  scrollSpeed = 48;
  bombT = 0;
  bombKind: HeroId = 'seraphine';
  private bombAge = 0;
  private bombTicks = 0;
  private bombHit = new Set<Target>();
  private bombBossDmg = 0;
  hitstop = 0;
  slowT = 0;
  slowScale = 1;
  t = 0;
  ui: UiEvent[] = [];
  pings: Record<string, number> = {};
  chargeFlash = 0;
  fog = { on: false, radius: 150 };
  gameOverPending = -1;
  gameOver = false;
  cleared = false;
  preview = false;
  stats: Stats = { charges: 0, bossStart: 0, bossCombat: 0, bossKillTime: 0, bossHits: 0, bossBombs: 0, continues: 0, wipes: 0, bossKilled: false, stageTime: 0 };

  constructor(hero: HeroId, preview = false) {
    this.ch = CHARS.find((c) => c.id === hero)!;
    this.preview = preview;
    this.player = new Player(this, this.ch);
    this.items = new Items(this);
    this.fx.shakeScale = G.save.settings.shake / 100;
    this.fx.flashReduce = G.save.settings.flashReduce;
    if (preview) this.fx.ash.length = 0;
  }

  // ---------------- scoring ----------------
  get chainMul() {
    return 1 + 0.02 * Math.min(this.chain, 50);
  }
  addScore(n: number, x?: number, y?: number, useChain = false) {
    const v = Math.round(useChain ? n * this.chainMul : n);
    this.score += v;
    if (x !== undefined && y !== undefined) this.fx.popup(x, y, String(v), v >= 2000 ? '#D8B35E' : '#E9E1D3');
  }
  hudPing(what: string) {
    this.pings[what] = this.t;
  }

  onEnemyKilled(e: Enemy) {
    this.chain++;
    this.chainT = 2.0;
    this.maxChain = Math.max(this.maxChain, this.chain);
    this.addScore(e.def.score, e.x, e.y - 8, true);
    if (this.chain % 10 === 0) this.hudPing('chain');
    if (!G.save.flags.seen[e.kind]) {
      G.save.flags.seen[e.kind] = true;
      G.save.saveFlags();
    }
  }
  onGroupWipe(gr: Group) {
    this.stats.wipes++;
    this.addScore(SCORE.wipe, gr.lastX, gr.lastY - 18);
    this.fx.popup(gr.lastX, gr.lastY - 28, 'WIPE', '#D8B35E');
    G.audio.sfx('ding');
    if (gr.drop) this.items.spawn(gr.drop, gr.lastX, gr.lastY);
    if (gr.dropS) this.items.scatter('S', gr.dropS, gr.lastX, gr.lastY);
  }

  // ---------------- targets / collision ----------------
  *targets(): Generator<Target> {
    for (const e of this.enemies) if (e.alive && e.wait <= 0) yield e;
    if (this.midboss && this.midboss.alive) yield this.midboss;
    if (this.boss && this.boss.alive) yield this.boss;
    for (const t of this.extraTargets) if (t.alive) yield t;
  }

  nearestTarget(x: number, y: number) {
    let best: Target | null = null, bd = Infinity;
    for (const t of this.targets()) {
      if (t.x < 0 || t.x > W + 10) continue;
      const c = t.hitCircles()[0];
      if (!c) continue;
      const d = (c.x - x) ** 2 + (c.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    if (!best) return null;
    const c = best.hitCircles()[0];
    return { x: c.x, y: c.y };
  }

  private segCircle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, r: number) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    let t = ((cx - ax) * dx + (cy - ay) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + dx * t, py = ay + dy * t;
    return (px - cx) ** 2 + (py - cy) ** 2 < r * r;
  }

  hitTest(s: PShot) {
    // shots can pop destructible spirit flames
    if (s.kind === 'basic' || s.kind === 'spirit' || s.kind === 'orb') {
      for (const b of this.bullets.list) {
        if (!b.alive || b.hp <= 0) continue;
        if ((b.x - s.x) ** 2 + (b.y - s.y) ** 2 < 49) {
          b.hp -= s.dmg;
          s.life = 0;
          if (b.hp <= 0) {
            b.alive = false;
            this.items.spawn('mote', b.x, b.y);
            this.fx.spark(b.x, b.y, 6, ['#BFF4FF', '#59B7C9'], 60, { life: 0.3 });
          }
          return;
        }
      }
    }
    for (const t of this.targets()) {
      if (s.pierce && s.hit.has(t)) continue;
      for (const c of t.hitCircles()) {
        const hit = s.len > 0 ? this.segCircle(s.x - s.len, s.y, s.x + 4, s.y, c.x, c.y, c.r + s.r) : (s.x - c.x) ** 2 + (s.y - c.y) ** 2 < (c.r + s.r) ** 2;
        if (!hit) continue;
        const mod = t.damageMod ? t.damageMod(s.charge) : 1;
        t.takeDamage(s.dmg * c.mul * mod, s.charge, c.mul);
        s.hit.add(t);
        const sx = s.len > 0 ? Math.min(s.x, c.x - c.r * 0.5) : s.x;
        if (s.kind === 'basic') {
          if (R.next() < 0.5) this.fx.spark(sx, s.y, 2, c.mul < 0.5 ? ['#8A8F99', '#C8D2EA'] : ['#FFFFFF', this.ch.color], 60, { life: 0.18, dir: Math.PI, spread: 1.2 });
        } else {
          this.fx.spark(sx, s.y, 8, ['#FFFFFF', this.ch.color], 120, { life: 0.3, glow: this.ch.glow });
          if (this.ch.id === 'noctis' && s.kind === 'scythe') this.fx.spark(c.x, c.y, 10, ['#B3263B', '#E05060', '#5A1A26'], 90, { life: 0.8, grav: 40, size: 2 });
          if (s.kind === 'orb' || s.kind === 'spirit') this.fx.ring(s.x, s.y, 2, 80, 0.25, '#E8DDFF', 1, 'violet');
        }
        if (!s.pierce) {
          s.life = 0;
          return;
        }
        break;
      }
    }
  }

  clearBulletsNear(x: number, y: number, r: number) {
    for (const b of this.bullets.list) if (b.alive && (b.x - x) ** 2 + (b.y - y) ** 2 < r * r) b.alive = false;
  }

  /** Bomb / phase change / defeat: every enemy bullet becomes a soul mote (+10). */
  cancelBullets() {
    const pts = this.bullets.clear();
    let n = 0;
    for (const p of pts) {
      if (n++ < 140) this.items.spawn('mote', p.x, p.y, R.range(-20, 20), R.range(-20, 20));
      else this.score += SCORE.mote;
    }
    if (pts.length) G.audio.sfx('cancel');
  }

  // ---------------- bomb ----------------
  startBomb(hero: HeroId) {
    this.bombKind = hero;
    this.bombT = BOMB_DUR[hero];
    this.bombAge = 0;
    this.bombTicks = 0;
    this.bombHit.clear();
    this.bombBossDmg = 0;
    if (this.boss && this.boss.alive) this.stats.bossBombs++;
    this.cancelBullets();
    G.audio.sfx('bomb');
    this.fx.flash(0.35, this.ch.color);
    this.fx.shake(2, 0.3);
    if (G.save.settings.cutIn && !this.preview) {
      this.ui.push({ type: 'bombCut', hero });
      this.slowT = 0.65;
      this.slowScale = 0.4;
    }
    this.hudPing('bomb');
  }

  private bombDamage(t: Target, d: number) {
    if (t.isBoss) {
      const allow = Math.max(0, Math.min(d, BOMB_BOSS_CAP - this.bombBossDmg));
      if (allow <= 0) return;
      this.bombBossDmg += allow;
      t.takeDamage(allow, true);
    } else t.takeDamage(d, true);
  }

  private onScreen(t: Target) {
    return t.x > -10 && t.x < W + 10 && t.y > -20 && t.y < H + 20;
  }

  private updateBomb(dt: number) {
    if (this.bombT <= 0) return;
    this.bombT -= dt;
    this.bombAge += dt;
    const a = this.bombAge;
    if (this.bombKind === 'seraphine') {
      // 6 ticks of 50 to everything on screen
      while (this.bombTicks < 6 && a >= 0.25 + this.bombTicks * 0.2) {
        this.bombTicks++;
        for (const t of [...this.targets()]) if (this.onScreen(t)) this.bombDamage(t, 50);
        this.fx.shake(1, 0.08);
      }
      if (a < 1.2) this.cancelBullets();
    } else if (this.bombKind === 'noctis') {
      // sweeping band of black wings: each target is struck once when the band passes it
      const bandX = this.player.x + (W - this.player.x + 60) * Math.min(1, a / 0.9);
      for (const t of [...this.targets()]) {
        if (this.bombHit.has(t) || !this.onScreen(t)) continue;
        if (t.x < bandX) {
          this.bombHit.add(t);
          this.bombDamage(t, 280);
          this.fx.spark(t.x, t.y, 14, ['#B3263B', '#2C2340', '#E05060'], 120, { life: 0.6, size: 2 });
        }
      }
      if (R.next() < 0.9) this.fx.spark(bandX, R.range(20, H - 20), 3, ['#120E18', '#2C2340', '#5A4A80'], 160, { dir: 0, spread: 0.6, life: 0.6, size: 2 });
      if (a < 1.0) this.cancelBullets();
    } else {
      // choir: continuous bullet cleansing and damage over 3 s
      while (this.bombTicks < 12 && a >= 0.2 + this.bombTicks * 0.25) {
        this.bombTicks++;
        for (const t of [...this.targets()]) if (this.onScreen(t)) this.bombDamage(t, 320 / 12);
      }
      this.cancelBullets();
      if (R.next() < 0.6) this.fx.spark(R.range(0, W), H + 4, 1, ['#E8DDFF', '#9D86E0', '#A8326E'], 90, { dir: -Math.PI / 2, spread: 0.3, life: 1.6, drag: 0, size: 2, glow: 'violet' });
    }
  }

  private drawBomb(g: Ctx) {
    if (this.bombT <= 0) return;
    const a = this.bombAge, p = this.player;
    if (this.bombKind === 'seraphine') {
      const k = Math.min(1, a / 0.4), fade = Math.min(1, this.bombT / 0.4);
      g.globalAlpha = 0.85 * fade;
      g.fillStyle = '#F3E6C4';
      const cx = Math.round(p.x + 60), cy = Math.round(p.y);
      const L = 400 * k;
      g.fillRect(cx - 3, cy - L, 6, L * 2);
      g.fillRect(cx - L * 0.8, cy - 3, L * 1.6, 6);
      g.strokeStyle = '#D8B35E';
      g.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(cx, cy, (40 + i * 70) * k + a * 40, 0, TAU);
        g.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const x = ((i * 113 + a * 60) % W);
        g.globalAlpha = 0.25 * fade;
        g.fillRect(Math.round(x), 0, 10, H);
      }
      g.globalAlpha = 1;
    } else if (this.bombKind === 'noctis') {
      const bandX = p.x + (W - p.x + 60) * Math.min(1, a / 0.9);
      g.globalAlpha = Math.min(1, this.bombT / 0.3);
      g.fillStyle = '#120E18';
      for (let i = 0; i < 14; i++) {
        const y = (i / 13) * H;
        const x = bandX - 20 - ((i * 37) % 50);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 40, y - 10);
        g.lineTo(x - 26, y + 6);
        g.fill();
      }
      g.fillStyle = '#B3263B';
      g.fillRect(Math.round(bandX) - 2, 0, 2, H);
      g.globalAlpha = 1;
    } else {
      const fade = Math.min(1, this.bombT / 0.5, a / 0.3);
      g.globalAlpha = 0.5 * fade;
      g.strokeStyle = '#B79CFF';
      g.lineWidth = 1;
      const cx = p.x, cy = p.y;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(cx, cy, 40 + i * 26 + Math.sin(a * 3 + i) * 4, a * (i % 2 ? 1 : -1), a * (i % 2 ? 1 : -1) + TAU * 0.85);
        g.stroke();
      }
      // ghosts circling
      for (let i = 0; i < 8; i++) {
        const ang = a * 1.4 + (i / 8) * TAU, rr = 70 + Math.sin(a * 2 + i) * 20;
        const gx = Math.round(cx + Math.cos(ang) * rr), gy = Math.round(cy + Math.sin(ang) * rr * 0.7);
        g.globalAlpha = 0.7 * fade;
        g.fillStyle = '#E8DDFF';
        g.fillRect(gx - 3, gy - 4, 6, 7);
        g.fillStyle = '#7A5FC0';
        g.fillRect(gx - 2, gy - 2, 1, 2);
        g.fillRect(gx + 1, gy - 2, 1, 2);
      }
      g.globalAlpha = 1;
    }
  }

  private drawBombGlow(ctx: Ctx) {
    if (this.bombT <= 0) return;
    const p = this.player;
    const glow = this.bombKind === 'seraphine' ? ART.glow.gold : this.bombKind === 'noctis' ? ART.glow.red : ART.glow.violet;
    const k = Math.min(1, this.bombT / 0.5);
    ctx.globalAlpha = 0.7 * k;
    const s = 260 + this.bombAge * 200;
    const cx = this.bombKind === 'seraphine' ? p.x + 60 : this.bombKind === 'noctis' ? p.x + (W - p.x + 60) * Math.min(1, this.bombAge / 0.9) : p.x;
    ctx.drawImage(glow, cx - s / 2, p.y - s / 2, s, s);
    ctx.globalAlpha = 1;
  }

  // ---------------- lifecycle ----------------
  onPlayerDeath() {
    this.chain = 0;
    if (this.boss && this.boss.alive) this.stats.bossHits++;
    if (this.player.lives <= 0) this.gameOverPending = 1.2;
  }

  update(dt: number) {
    for (const k of Object.keys(this.pings)) if (this.t - this.pings[k] > 2) delete this.pings[k];
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }
    let d = dt;
    if (this.slowT > 0) {
      this.slowT -= dt;
      d = dt * this.slowScale;
    }
    this.t += d;
    this.chargeFlash = Math.max(0, this.chargeFlash - dt);
    if (!this.cleared) this.stats.stageTime += d;
    this.director?.update(d);
    this.bg?.update(d, this.scrollSpeed);
    this.player.update(d);
    for (const e of this.enemies) e.update(d);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.midboss?.update(d);
    this.boss?.update(d);
    this.bullets.update(d, this.player.x, this.player.y);
    this.collidePlayer();
    this.items.update(d);
    for (const h of this.hazards) h.update(d);
    this.hazards = this.hazards.filter((h) => !h.done);
    this.extraTargets = this.extraTargets.filter((t) => t.alive);
    this.updateBomb(d);
    this.fx.update(d);
    if (this.chainT > 0) {
      this.chainT -= d;
      if (this.chainT <= 0 && this.chain > 0) {
        this.chain = 0;
        this.hudPing('chainBreak');
      }
    }
    if (this.gameOverPending > 0) {
      this.gameOverPending -= d;
      if (this.gameOverPending <= 0) this.gameOver = true;
    }
  }

  private collidePlayer() {
    const p = this.player;
    if (!p.active) return;
    const vulnerable = p.invuln <= 0 && this.bombT <= 0;
    for (const b of this.bullets.list) {
      if (!b.alive || b.delay > 0) continue;
      const r = (b.type === 'B01' ? 3 : b.type === 'B03' ? 2 : b.type === 'B05' ? 7 : b.type === 'B06' ? 5 : 4);
      const d2 = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
      if (vulnerable && d2 < (r + 3) ** 2) {
        b.alive = false;
        p.hit();
        if (this.boss && this.boss.alive) this.stats.bossHits++;
        return;
      }
      if (!b.grazed && d2 < (r + 17) ** 2) {
        b.grazed = true;
        this.graze++;
        this.score += SCORE.graze;
        if (this.chainT > 0) this.chainT = Math.min(2.0, this.chainT + 0.2);
        G.audio.sfx('graze');
        if (R.next() < 0.5) this.fx.spark(p.x, p.y, 2, ['#FFFFFF', '#C8D2EA'], 50, { life: 0.2 });
      }
    }
    if (!vulnerable) return;
    for (const t of this.targets()) {
      if ((t as Enemy).wait > 0) continue;
      const contact = (t as { contact?: boolean }).contact;
      if (contact === false) continue;
      for (const c of t.hitCircles()) {
        if ((c.x - p.x) ** 2 + (c.y - p.y) ** 2 < (c.r * 0.8 + 3) ** 2) {
          if (p.hit() && this.boss && this.boss.alive) this.stats.bossHits++;
          return;
        }
      }
    }
  }

  // ---------------- rendering ----------------
  /** Draw world pixels into a 640x360 context. */
  drawWorld(g: Ctx) {
    if (this.bg) this.bg.drawBack(g);
    for (const h of this.hazards) h.drawBack?.(g);
    this.boss?.draw(g);
    this.midboss?.draw(g);
    for (const e of this.enemies) e.draw(g);
    for (const t of this.extraTargets) (t as unknown as { draw?: (g: Ctx) => void }).draw?.(g);
    this.player.drawShots(g);
    this.player.draw(g);
    this.drawBomb(g);
    this.fx.draw(g);
    this.items.draw(g);
    this.fx.drawAsh(g);
    if (this.bg) this.bg.drawFront(g);
    this.boss?.drawFront(g);
    if (this.fog.on) {
      this.drawFogMask(g);
      for (const e of this.enemies) e.drawLights(g);
      this.items.draw(g);
    }
    for (const h of this.hazards) h.drawTele?.(g);
    this.boss?.drawTele(g);
    this.midboss?.drawTele(g);
    this.bullets.draw(g);
    this.player.drawHitbox(g);
  }

  private fogCanvas: HTMLCanvasElement | null = null;
  private drawFogMask(g: Ctx) {
    if (!this.fogCanvas) {
      this.fogCanvas = document.createElement('canvas');
      this.fogCanvas.width = W;
      this.fogCanvas.height = H;
    }
    const f = this.fogCanvas.getContext('2d')!;
    f.globalCompositeOperation = 'source-over';
    f.clearRect(0, 0, W, H);
    f.fillStyle = 'rgba(4,4,8,0.78)';
    f.fillRect(0, 0, W, H);
    f.globalCompositeOperation = 'destination-out';
    const p = this.player;
    const r = this.fog.radius;
    const grd = f.createRadialGradient(p.x, p.y, r - 24, p.x, p.y, r);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = grd;
    f.beginPath();
    f.arc(p.x, p.y, r, 0, TAU);
    f.fill();
    g.drawImage(this.fogCanvas, 0, 0);
  }

  drawGlow(ctx: Ctx) {
    ctx.globalCompositeOperation = 'lighter';
    this.bg?.drawGlow(ctx);
    for (const e of this.enemies) e.drawGlow(ctx);
    this.midboss?.drawGlow(ctx);
    this.boss?.drawGlow(ctx);
    for (const h of this.hazards) h.drawGlow?.(ctx);
    this.player.drawGlow(ctx);
    this.items.drawGlow(ctx);
    this.bullets.drawGlow(ctx);
    this.fx.drawGlow(ctx);
    this.drawBombGlow(ctx);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  render(r: Renderer) {
    const g = r.wctx;
    this.drawWorld(g);
    r.shakeX = this.fx.shakeX;
    r.shakeY = this.fx.shakeY;
    r.presentWorld();
    const ctx = r.ctx;
    ctx.save();
    r.clipView();
    r.worldTransform();
    this.drawGlow(ctx);
    ctx.restore();
  }
}
