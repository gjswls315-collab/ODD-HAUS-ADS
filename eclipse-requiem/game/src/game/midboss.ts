import { G } from '../core/app';
import { DEG, ease } from '../core/math';
import { Ctx } from '../gfx/canvas';
import { ART } from '../gfx/sprites';
import { SCORE } from './defs';
import { Enemy } from './enemies';
import type { HitCircle, Target, World } from './world';

// Gravekeeper Graven, Stage 1 C-section midboss (docs/05 §10). 30 s time limit, then sinks into the ground.

export class Graven implements Target {
  alive = true;
  isBoss = false;
  x = 720;
  y = 180;
  hp = 2000;
  maxHp = 2000;
  t = 0;
  state: 'enter' | 'fight' | 'sink' | 'dead' = 'enter';
  private lashN = 0;
  private burstN = 0;
  pose: 'idle' | 'lash' | 'open' = 'idle';
  private poseT = 0;
  flash = 0;
  sinkY = 0;
  alpha = 1;
  readonly timeLimit = 30;
  fightT = 0;

  constructor(private w: World) {}

  get contact() {
    return this.state === 'fight';
  }

  hitCircles(): HitCircle[] {
    if (this.state !== 'fight') return [];
    return [
      { x: this.x - 6, y: this.y - 16, r: 22, mul: 1 },
      { x: this.x + 28, y: this.y - 14, r: 28, mul: 0.5 },
    ];
  }

  takeDamage(d: number) {
    if (this.state !== 'fight') return;
    this.hp -= d;
    this.flash = 0.05;
    G.audio.sfx('hit');
    if (this.hp <= 0) this.die();
  }

  private die() {
    this.state = 'dead';
    this.alive = false;
    const w = this.w;
    w.cancelBullets();
    w.addScore(SCORE.midboss, this.x, this.y - 40);
    w.fx.explosion(this.x, this.y, 'l');
    w.fx.explosion(this.x + 20, this.y - 30, 'm');
    w.fx.shake(3, 0.25);
    G.audio.sfx('explodeL');
    w.items.spawn('P', this.x, this.y);
    w.items.scatter('S', 10, this.x, this.y);
    w.chain++;
    w.chainT = 2;
    w.midboss = null;
  }

  update(dt: number) {
    const w = this.w;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.poseT > 0) {
      this.poseT -= dt;
      if (this.poseT <= 0) this.pose = 'idle';
    }
    if (this.state === 'enter') {
      const k = Math.min(1, this.t / 1.5);
      this.x = 720 - 220 * ease.outCubic(k);
      if (k >= 1) {
        this.state = 'fight';
        this.t = 0;
      }
      return;
    }
    if (this.state === 'sink') {
      this.sinkY += 60 * dt;
      this.alpha = Math.max(0, 1 - this.t / 2);
      if (this.t > 2) {
        this.alive = false;
        w.midboss = null;
      }
      return;
    }
    if (this.state !== 'fight') return;
    this.fightT += dt;
    this.y = 180 + Math.sin((this.fightT / 6) * Math.PI * 2) * 70;
    // Chain Lash every 3.0 s (0.6 s telegraph)
    const lashAt = 1.0 + this.lashN * 3.0;
    if (this.fightT >= lashAt - 0.6 && this.pose === 'idle' && this.fightT < lashAt) {
      this.pose = 'lash';
      this.poseT = 1.0;
      G.audio.sfx('shield');
    }
    if (this.fightT >= lashAt) {
      this.lashN++;
      const hx = this.x - 42, hy = this.y - 12;
      const a = Math.atan2(w.player.y - hy, w.player.x - hx);
      for (const off of [-12, 0, 12]) for (let i = 0; i < 6; i++) w.bullets.fire('B03', hx, hy, a + off * DEG, 150, { delay: i * 0.05 });
    }
    // Coffin Burst every 8 s (0.8 s telegraph)
    const burstAt = 3.0 + this.burstN * 8.0;
    if (this.fightT >= burstAt - 0.8 && this.fightT < burstAt && this.pose !== 'open') {
      this.pose = 'open';
      this.poseT = 1.6;
      G.audio.sfx('crack');
    }
    if (this.fightT >= burstAt) {
      this.burstN++;
      w.bullets.radial('B02', this.x + 28, this.y - 14, 12, this.burstN * 15, 80);
      for (const dy of [-60, 50]) w.enemies.push(new Enemy(w, 'candle', { x: this.x + 30, y: this.y + dy, speed: 60 }));
      G.audio.sfx('scream');
    }
    if (this.fightT >= this.timeLimit) {
      this.state = 'sink';
      this.t = 0;
      w.cancelBullets();
      w.fx.popup(this.x, this.y - 50, 'ESCAPED', '#B9B3AA');
    }
  }

  draw(g: Ctx) {
    if (this.state === 'dead') return;
    const idx = this.pose === 'lash' ? 1 : this.pose === 'open' ? 2 : 0;
    const f = (this.flash > 0 ? ART.enemyFlash.graven : ART.enemy.graven)[idx];
    g.globalAlpha = this.alpha;
    g.drawImage(f, Math.round(this.x - 57), Math.round(this.y - 61 + this.sinkY));
    g.globalAlpha = 1;
  }

  drawTele(g: Ctx) {
    if (this.state !== 'fight') return;
    if (this.pose === 'lash' && this.poseT > 0.4) {
      const hx = this.x - 42, hy = this.y - 12;
      const a = Math.atan2(this.w.player.y - hy, this.w.player.x - hx);
      g.globalAlpha = 0.35;
      g.strokeStyle = '#D94C3A';
      g.lineWidth = 1;
      for (const off of [-12, 0, 12]) {
        g.beginPath();
        g.moveTo(hx, hy);
        g.lineTo(hx + Math.cos(a + off * DEG) * 120, hy + Math.sin(a + off * DEG) * 120);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
  }

  drawGlow(ctx: Ctx) {
    if (this.state === 'dead') return;
    ctx.globalAlpha = 0.35 * this.alpha;
    ctx.drawImage(ART.glow.cyan, this.x - 18, this.y - 50, 30, 20);
    if (this.pose === 'open') {
      ctx.globalAlpha = 0.6;
      ctx.drawImage(ART.glow.cyan, this.x + 28 - 40, this.y - 14 - 50, 80, 100);
    }
    ctx.globalAlpha = 1;
  }
}
