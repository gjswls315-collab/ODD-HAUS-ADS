import { G, Scene } from '../core/app';
import { C } from '../core/constants';
import { clamp, ease, fxRng as R } from '../core/math';
import { HeroId } from '../gfx/art/heroines';
import { rgba } from '../gfx/canvas';
import { ART } from '../gfx/sprites';
import { button, cross, keyHints, panel, text } from '../gfx/ui';
import type { World } from '../game/world';
import { uiMouse } from '../ui/menu';
import { MenuBackdrop } from './backdrops';
import { GameScene } from './game';
import { TitleScene } from './title';

// Stage clear / final record (docs/01 SCR-11, SCR-12). Rank formula from SCR-11.

export interface Result {
  score: number;
  hits: number;
  bombs: number;
  lives: number;
  time: number;
  chain: number;
  graze: number;
  bossTime: number;
  bossKilled: boolean;
  continues: number;
  rank: string;
  points: number;
}

export function computeResult(w: World): Result {
  const p = w.player;
  const s = w.stats;
  let pts = 100 - p.hitsTaken * 12 - p.bombsUsed * 8 - p.livesLost * 20;
  if (s.bossKilled) pts += s.bossKillTime <= 60 ? 10 : s.bossKillTime <= 90 ? 5 : 0;
  if (w.maxChain >= 30) pts += 5;
  if (w.graze >= 100) pts += 5;
  let rank = pts >= 100 ? 'S' : pts >= 80 ? 'A' : pts >= 60 ? 'B' : 'C';
  if (pts >= 115 && p.hitsTaken === 0 && p.bombsUsed === 0) rank = 'EX';
  if (!s.bossKilled && rank !== 'C') rank = rank === 'EX' || rank === 'S' ? 'A' : rank;
  return {
    score: w.score, hits: p.hitsTaken, bombs: p.bombsUsed, lives: p.livesLost, time: s.stageTime, chain: w.maxChain,
    graze: w.graze, bossTime: s.bossKillTime, bossKilled: s.bossKilled, continues: s.continues, rank, points: pts,
  };
}

const fmtTime = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export class ClearScene implements Scene {
  private t = 0;
  private res: Result;
  private bg = new MenuBackdrop(true);
  private done = false;
  private stampT = -1;
  private sel = 0;
  private stage: 'tally' | 'menu' | 'tbc' = 'tally';
  private particles: { x: number; y: number; v: number; ph: number }[] = [];
  private newHi = false;

  constructor(private hero: HeroId, w: World, private failed = false) {
    this.res = computeResult(w);
    for (let i = 0; i < 100; i++) this.particles.push({ x: R.range(0, 1920), y: R.range(0, 1080), v: R.range(20, 60), ph: R.range(0, 6) });
    // records
    const sc = G.save.scores;
    if (this.res.continues === 0 && this.res.score > sc.hi) {
      sc.hi = this.res.score;
      this.newHi = true;
    }
    if (!failed) {
      const prev = sc.best[hero];
      if (!prev || prev.score < this.res.score) sc.best[hero] = { score: this.res.score, rank: this.res.rank };
    }
    G.save.saveScores();
  }

  enter() {
    if (this.failed) G.audio.music(null);
  }

  private rows(): [string, string, boolean][] {
    const r = this.res;
    return [
      ['SCORE', String(r.score).replace(/\B(?=(\d{3})+(?!\d))/g, ','), false],
      ['DAMAGE TAKEN', String(r.hits), false],
      ['BOMB USED', String(r.bombs), false],
      ['TIME', fmtTime(r.time), false],
      ['MAX CHAIN / GRAZE', `${r.chain} / ${r.graze}`, false],
      ['BOSS', r.bossKilled ? `DEFEATED  ${fmtTime(r.bossTime)}` : this.failed ? '—' : 'ESCAPED', r.bossKilled],
    ];
  }

  update(dt: number) {
    this.t += dt;
    this.bg.update(dt);
    for (const p of this.particles) {
      p.y -= p.v * dt;
      if (p.y < -10) p.y = 1090;
    }
    const inp = G.input;
    const nRows = this.rows().length;
    const tallyEnd = 0.6 + nRows * 0.25 + 0.6;
    if (this.stage === 'tally') {
      const prev = this.t - dt;
      for (let i = 0; i < nRows; i++) {
        const at = 0.6 + i * 0.25;
        if (prev < at && this.t >= at) G.audio.sfx(i === nRows - 1 && this.res.bossKilled ? 'ding' : 'uiMove');
      }
      if (!this.failed && this.stampT < 0 && this.t >= tallyEnd + 0.4) {
        this.stampT = 0;
        G.audio.sfx('stamp');
      }
      if (inp.confirm || inp.clicked) {
        if (this.t < tallyEnd + 0.4) {
          this.t = tallyEnd + 0.4;
        } else {
          this.stage = 'menu';
        }
      }
      if (this.t > tallyEnd + 1.2) this.stage = 'menu';
    } else if (this.stage === 'menu') {
      if (inp.left || inp.right || inp.up || inp.down) {
        this.sel = 1 - this.sel;
        G.audio.sfx('uiMove');
      }
      if (inp.mouseActive) {
        const m = uiMouse();
        for (const i of [0, 1]) if (m.x > 980 + i * 300 && m.x < 1240 + i * 300 && m.y > 900 && m.y < 954) this.sel = i;
      }
      if ((inp.confirm || inp.clicked) && !this.done) {
        G.audio.sfx('uiConfirm');
        if (this.failed) {
          this.done = true;
          if (this.sel === 0) G.scenes.go(new GameScene(this.hero), undefined, 'ink');
          else G.scenes.go(new TitleScene(true), undefined, 'ink');
        } else if (this.sel === 0) {
          this.stage = 'tbc';
          this.t = 0;
        } else {
          this.done = true;
          G.scenes.go(new TitleScene(true), undefined, 'ink');
        }
      }
    } else {
      if ((inp.confirm || inp.clicked || inp.back) && this.t > 1 && !this.done) {
        this.done = true;
        G.scenes.go(new TitleScene(true), undefined, 'ink');
      }
    }
    if (this.stampT >= 0) this.stampT += dt;
  }

  render() {
    const r = G.r, ctx = r.ctx;
    this.bg.draw(r.wctx, { tint: '#000000', tintA: 0.55 });
    if (!this.failed && this.stage !== 'tbc') {
      const key = ART.heroKey[this.hero];
      const k = ease.outCubic(clamp(this.t / 0.4, 0, 1));
      r.wctx.drawImage(key, Math.round(-40 + 60 * k), Math.round(180 - key.height / 2 + Math.sin(this.t * 1.5) * 2));
    }
    r.presentWorld();
    r.uiTransform();
    // purification particles (gold, rising)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      ctx.fillStyle = this.failed ? 'rgba(179,38,59,0.35)' : 'rgba(216,179,94,0.5)';
      ctx.fillRect(p.x + Math.sin(this.t + p.ph) * 10, p.y, 3, 3);
    }
    ctx.restore();
    if (this.stage === 'tbc') {
      this.renderTbc();
      return;
    }
    panel(r, 900, 120, 960, 860, { style: 'tome', alpha: 0.9, accent: this.failed ? C.blood : C.gold });
    text(r, this.failed ? 'REQUIEM INTERRUPTED' : 'REQUIEM CLEARED', 1380, 160, { size: 48, font: 'display', weight: 700, align: 'center', spacing: 6, color: this.failed ? C.blood : C.gold, glow: 'rgba(0,0,0,0.8)', glowBlur: 10 });
    text(r, this.failed ? 'CHRONICLE OF THE REQUIEM · STAGE 1' : 'STAGE 1 · ASHEN OUTSKIRTS', 1380, 222, { size: 21, font: 'display', align: 'center', spacing: 4, color: C.sub });
    const rows = this.rows();
    rows.forEach(([label, val, hi], i) => {
      const at = 0.6 + i * 0.25;
      const a = clamp((this.t - at) / 0.2, 0, 1);
      if (a <= 0) return;
      const y = 286 + i * 62;
      ctx.globalAlpha = a;
      ctx.fillStyle = rgba(C.charcoal, 0.6);
      ctx.fillRect(960, y - 6, 840, 52);
      text(r, label, 990, y + 20, { size: 21, font: 'display', weight: 700, baseline: 'middle', spacing: 3, color: C.sub });
      text(r, val, 1770, y + 20, { size: 30, font: 'display', weight: 700, baseline: 'middle', align: 'right', color: hi ? C.gold : C.ivory });
      ctx.globalAlpha = 1;
    });
    if (this.res.continues > 0) text(r, `CONTINUE x${this.res.continues} — 최고 점수 미등록`, 990, 676, { size: 18, color: C.warn });
    if (this.newHi && this.t > 2) text(r, 'NEW HI-SCORE', 990, 676, { size: 21, font: 'display', weight: 700, color: C.gold });
    // rank stamp
    if (this.stampT >= 0 && !this.failed) {
      const k = clamp(this.stampT / 0.18, 0, 1);
      const sc = 1.6 - 0.6 * ease.outBack(k);
      const rank = this.res.rank;
      ctx.save();
      ctx.translate(1660, 790);
      ctx.scale(0.85, 0.85);
      ctx.scale(sc, sc);
      if (rank === 'S' || rank === 'EX') {
        ctx.save();
        ctx.rotate(this.t * 0.17);
        ctx.strokeStyle = rank === 'EX' ? C.cyan : C.gold;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 110, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = C.gold;
        cross(ctx, 0, -120, 18);
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * 70, -40);
          ctx.quadraticCurveTo(s * 150, -90, s * 160, 10);
          ctx.quadraticCurveTo(s * 120, -20, s * 80, 0);
          ctx.fill();
        }
      }
      const col = rank === 'C' ? '#B9B3AA' : rank === 'B' ? C.cyan : C.gold;
      text(r, rank, 0, 6, { size: 160, font: 'display', weight: 900, align: 'center', baseline: 'middle', color: col, glow: rank === 'EX' ? C.cyan : 'rgba(0,0,0,0.9)', glowBlur: 20 });
      text(r, 'RANK', 0, 96, { size: 21, font: 'display', weight: 700, align: 'center', spacing: 6, color: C.sub });
      ctx.restore();
    }
    if (this.stage === 'menu') {
      const labels = this.failed ? ['RETRY', 'TITLE'] : ['CONTINUE', 'TITLE'];
      labels.forEach((l, i) => button(r, 980 + i * 300, 900, 260, 54, l, i === this.sel ? 'focus' : 'idle', this.t, { size: 24 }));
    } else text(r, 'ENTER — 결과 건너뛰기', 1380, 920, { size: 18, align: 'center', color: C.sub });
    if (!this.failed) text(r, 'NEXT : STAGE 2 — BLACK BELFRY', 450, 1000, { size: 24, font: 'display', weight: 700, align: 'center', spacing: 3, color: C.sub, alpha: clamp((this.t - 2) / 0.6, 0, 0.9) });
    keyHints(r, 56, 1040, []);
  }

  private renderTbc() {
    const r = G.r, ctx = r.ctx;
    ctx.fillStyle = 'rgba(5,5,8,0.7)';
    ctx.fillRect(0, 0, 1920, 1080);
    const a = clamp(this.t / 0.8, 0, 1);
    text(r, 'STAGE 2', 960, 360, { size: 30, font: 'display', weight: 700, align: 'center', spacing: 12, color: C.gold, alpha: a });
    text(r, 'BLACK BELFRY', 960, 410, { size: 72, font: 'display', weight: 700, align: 'center', spacing: 8, color: C.ivory, alpha: a });
    text(r, '검은 종탑 — 시계태엽 천사가 기다린다', 960, 510, { size: 30, font: 'serif', align: 'center', color: C.sub, alpha: a });
    text(r, 'TO BE CONTINUED', 960, 640, { size: 36, font: 'display', weight: 700, align: 'center', spacing: 10, color: C.blood, alpha: clamp((this.t - 0.8) / 0.8, 0, 1) });
    text(r, '이번 빌드는 Stage 1 수직 슬라이스입니다. 플레이해 주셔서 감사합니다.', 960, 720, { size: 24, align: 'center', color: C.ivory, alpha: clamp((this.t - 1.2) / 0.8, 0, 1) });
    text(r, 'ENTER — 타이틀로', 960, 900, { size: 21, align: 'center', color: C.sub, alpha: clamp((this.t - 1.6) / 0.6, 0, 1) });
  }
}
