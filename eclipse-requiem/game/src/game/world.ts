import { G } from '../core/app';
import { H, W } from '../core/constants';
import { fxRng as R, TAU } from '../core/math';
import { sheet } from '../gfx/assets';
import { Ctx } from '../gfx/canvas';
import { Renderer } from '../gfx/renderer';
import { ditherFill } from '../gfx/dither';
import { HeroId, SHEET } from '../gfx/sprites';
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
    if (x !== undefined && y !== undefined) this.fx.popup(x, y, String(v), v >= 2000 ? '#F2D58C' : '#D9CDB6');
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
    this.fx.popup(gr.lastX, gr.lastY - 28, 'WIPE', '#F2D58C');
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
            this.fx.anim(SHEET.fx, 'cancel', b.x, b.y);
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
          if (R.next() < 0.35) this.fx.hit(sx + R.range(-2, 2), s.y + R.range(-2, 2), c.mul < 0.5);
        } else {
          this.fx.anim(SHEET.fx, 'hit_core', sx, s.y);
          this.fx.spark(sx, s.y, 6, ['#ECEEF1', this.ch.color], 120, { life: 0.3 });
          if (this.ch.id === 'noctis' && s.kind === 'scythe') this.fx.anim(SHEET.heroFx('noctis'), 'strike', c.x, c.y);
          if (s.kind === 'orb' || s.kind === 'spirit') this.fx.anim(SHEET.heroFx('morgana'), 'release', s.x, s.y);
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
          this.fx.anim(SHEET.heroFx('noctis'), 'strike', t.x, t.y);
          this.fx.spark(t.x, t.y, 10, ['#E0F5FF', '#3698D6', '#12334F'], 120, { life: 0.6, size: 2 });
        }
      }
      if (R.next() < 0.9) this.fx.spark(bandX, R.range(20, H - 20), 3, ['#07080B', '#12334F', '#1D5F8C'], 160, { dir: 0, spread: 0.6, life: 0.6, size: 2 });
      if (a < 1.0) this.cancelBullets();
    } else {
      // choir: continuous bullet cleansing and damage over 3 s
      while (this.bombTicks < 12 && a >= 0.2 + this.bombTicks * 0.25) {
        this.bombTicks++;
        for (const t of [...this.targets()]) if (this.onScreen(t)) this.bombDamage(t, 320 / 12);
      }
      this.cancelBullets();
      if (R.next() < 0.6) this.fx.spark(R.range(0, W), H + 4, 1, ['#DAFAE7', '#79DCA4', '#349E6E'], 90, { dir: -Math.PI / 2, spread: 0.3, life: 1.6, drag: 0, size: 2 });
    }
  }

  /** Bomb visuals from the hero effect sheets; the field darkens with an ordered dither so the effect reads. */
  private drawBomb(g: Ctx) {
    if (this.bombT <= 0) return;
    const a = this.bombAge, p = this.player;
    const fx = sheet(SHEET.heroFx(this.bombKind));
    const fade = Math.min(1, this.bombT / 0.4, a / 0.15);
    ditherFill(g, 0, 0, W, H, Math.round(6 * fade), '#07080B');
    if (this.bombKind === 'seraphine') {
      // GOLDEN SANCTUM: light pillars sweeping the screen + expanding halo
      for (let i = 0; i < 6; i++) {
        const x = ((i * 113 + a * 60) % (W + 40)) - 20;
        if (fade > 0.3 || i % 2 === 0) fx.draw(g, 'pillar', fx.index('pillar', a + i * 0.07), x, 0);
      }
      fx.draw(g, 'halo', fx.index('halo', a), p.x + 60, p.y);
      if (a < 0.5) fx.draw(g, 'cross', fx.index('cross', a, false), p.x + 60, p.y);
    } else if (this.bombKind === 'noctis') {
      // BLACKWING TEMPEST: a band of black wings sweeping right
      const bandX = p.x + (W - p.x + 60) * Math.min(1, a / 0.9);
      for (let y = 0; y < H; y += 120) fx.draw(g, 'storm', fx.index('storm', a + y / 400), bandX - 10, y);
    } else {
      // CHOIR OF THE DEPARTED: ghosts circling the witch
      for (let i = 0; i < 8; i++) {
        const ang = a * 1.4 + (i / 8) * TAU, rr = 70 + Math.sin(a * 2 + i) * 20;
        fx.draw(g, 'ghost', fx.index('ghost', a + i * 0.1), p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr * 0.7, { flipX: Math.sin(ang) > 0, dither: Math.round(16 * fade) });
      }
    }
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
        if (R.next() < 0.5) this.fx.anim(SHEET.fx, 'graze', p.x + R.range(-6, 6), p.y + R.range(-6, 6));
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
  /** Draw the 640x360 world: stage back layers -> actors -> effects -> fog/foreground -> telegraphs -> enemy bullets (always on top). */
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
    this.bullets.draw(g, this.t);
    this.player.drawHitbox(g);
    this.fx.drawPopups(g);
  }

  /** Black fog (docs/05 §8): the 'vision' sprite (a hole with a dithered edge) follows the player; the rest is filled. */
  private drawFogMask(g: Ctx) {
    const fx = sheet(SHEET.fx), p = this.player, f = this.fog.radius >= 135 ? 0 : 1;
    const { w, h } = fx.size('vision', f);
    const x = Math.round(p.x - w / 2), y = Math.round(p.y - h / 2);
    fx.draw(g, 'vision', f, x + w / 2, y + h / 2);
    g.fillStyle = 'rgba(7,8,11,0.84)';
    if (y > 0) g.fillRect(0, 0, W, y);
    if (y + h < H) g.fillRect(0, y + h, W, H - y - h);
    if (x > 0) g.fillRect(0, Math.max(0, y), x, Math.min(H, y + h) - Math.max(0, y));
    if (x + w < W) g.fillRect(x + w, Math.max(0, y), W - x - w, Math.min(H, y + h) - Math.max(0, y));
  }

  render(r: Renderer) {
    const g = r.wctx;
    this.drawWorld(g);
    r.shakeX = this.fx.shakeX;
    r.shakeY = this.fx.shakeY;
    r.presentWorld();
  }
}
