import { G, Scene } from '../core/app';
import { C, W } from '../core/constants';
import { clamp, fxRng as R, TAU } from '../core/math';
import { Ctx } from '../gfx/canvas';
import { makeBelfry, makeFar, makeMoon, makeSky } from '../gfx/art/backdrop';
import { ART } from '../gfx/sprites';
import { text } from '../gfx/ui';
import { SelectScene } from './select';
import { TitleScene } from './title';

// Story prologue: 4 illustrated cuts + text box (docs/01 SCR-03).

const CUTS = [
  { chapter: 'I. 피를 머금은 달', line: '그날, 달은 피를 머금었다.' },
  { chapter: 'II. 멈춘 종', line: '종은 멈췄고, 죽은 자는 잠들지 못했다.' },
  { chapter: 'III. 끌려간 영혼', line: '이름을 잃은 영혼들이 일식의 심장으로 끌려갔다.' },
  { chapter: 'IV. 세 명의 추방자', line: '세 명의 추방자가 밤하늘로 향했다.' },
];

export class PrologueScene implements Scene {
  private cut = 0;
  private t = 0;
  private skipHold = 0;
  private A = { sky: makeSky(9), moon: makeMoon(56, 4), far: makeFar(55), belfry: makeBelfry() };
  private souls: { x: number; y: number; v: number; ph: number }[] = [];
  private fadeT = 0;

  constructor(private next: 'select' | 'title') {
    for (let i = 0; i < 60; i++) this.souls.push({ x: R.range(0, W), y: R.range(200, 380), v: R.range(14, 30), ph: R.range(0, 6) });
  }

  enter() {
    G.audio.music('title');
  }

  private get typed() {
    return Math.floor(this.t / 0.03);
  }

  private advance() {
    const line = CUTS[this.cut].line;
    if (this.typed < line.length) {
      this.t = line.length * 0.03 + 0.01;
      return;
    }
    G.audio.sfx('uiMove');
    if (this.cut < CUTS.length - 1) {
      this.cut++;
      this.t = 0;
      this.fadeT = 0.6;
    } else this.finish();
  }

  private finish() {
    if (G.scenes.busy) return;
    G.save.flags.prologueSeen = true;
    G.save.saveFlags();
    G.scenes.go(this.next === 'select' ? new SelectScene() : new TitleScene(true), undefined, 'ink');
  }

  update(dt: number) {
    this.t += dt;
    this.fadeT = Math.max(0, this.fadeT - dt);
    const inp = G.input;
    if (inp.escHeld) {
      this.skipHold += dt;
      if (this.skipHold >= 1) this.finish();
    } else this.skipHold = 0;
    if (inp.confirm || inp.clicked) this.advance();
    const line = CUTS[this.cut].line;
    if (this.typed >= line.length && this.t > line.length * 0.03 + 4) this.advance();
    for (const s of this.souls) {
      s.y -= s.v * dt;
      s.x += Math.sin(this.t * 2 + s.ph) * 6 * dt + (320 - s.x) * 0.05 * dt;
      if (s.y < 40) {
        s.y = R.range(320, 380);
        s.x = R.range(0, W);
      }
    }
  }

  private drawCut(g: Ctx) {
    const A = this.A, t = this.t;
    g.drawImage(A.sky, 0, 0);
    if (this.cut === 0) {
      const rise = Math.round(200 - 50 * clamp(t / 6, 0, 1));
      g.drawImage(A.moon, W / 2 - A.moon.width / 2, rise - A.moon.height / 2);
      g.drawImage(A.far, -200, 170);
      g.drawImage(A.far, 1080 - 1280 - 200 + 1280, 170);
    } else if (this.cut === 1) {
      g.drawImage(A.moon, 480, 30);
      g.drawImage(A.belfry, 170, 40);
      // the bell inside the arch swings slower and slower, then stops
      const swing = Math.sin(t * 3) * 0.4 * Math.max(0, 1 - t / 3);
      g.save();
      g.translate(320, 128);
      g.rotate(swing);
      g.fillStyle = '#2A2318';
      g.beginPath();
      g.moveTo(-22, 46);
      g.quadraticCurveTo(-20, 6, 0, 4);
      g.quadraticCurveTo(20, 6, 22, 46);
      g.closePath();
      g.fill();
      g.fillStyle = '#4A3A22';
      g.fillRect(-22, 44, 44, 3);
      g.restore();
    } else if (this.cut === 2) {
      g.drawImage(A.moon, W / 2 - A.moon.width / 2, 40);
      g.drawImage(A.far, -400, 200);
      for (const s of this.souls) {
        g.fillStyle = Math.sin(t * 4 + s.ph) > 0 ? '#BFF4FF' : '#59B7C9';
        g.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
      }
    } else {
      g.drawImage(A.moon, W / 2 - A.moon.width / 2, 70);
      g.drawImage(A.far, -600, 220);
      const ids = ['seraphine', 'noctis', 'morgana'] as const;
      ids.forEach((id, i) => {
        const c = ART.heroCard[id];
        const x = Math.round(-130 + clamp(t / 5, 0, 1) * 300 + i * 120 - i * 40);
        const y = Math.round(150 + i * 40 - Math.sin(t + i) * 3);
        g.drawImage(c, x, y);
      });
    }
  }

  render() {
    const r = G.r;
    this.drawCut(r.wctx);
    r.presentWorld();
    const ctx = r.ctx;
    ctx.save();
    r.clipView();
    r.worldTransform();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    const mx = this.cut === 1 ? 480 + 62 : W / 2, my = this.cut === 0 ? 200 - 50 * clamp(this.t / 6, 0, 1) : this.cut === 1 ? 92 : this.cut === 2 ? 102 : 132;
    ctx.drawImage(ART.glow.red, mx - 120, my - 120, 240, 240);
    if (this.cut === 2) {
      ctx.globalAlpha = 0.4;
      for (const s of this.souls) ctx.drawImage(ART.glow.cyan, s.x - 6, s.y - 6, 12, 12);
    }
    ctx.restore();

    r.uiTransform();
    if (this.fadeT > 0) {
      ctx.fillStyle = `rgba(5,5,8,${this.fadeT / 0.6})`;
      ctx.fillRect(0, 0, 1920, 1080);
    }
    const c = CUTS[this.cut];
    text(r, c.chapter, 56, 48, { size: 21, font: 'serif', weight: 600, spacing: 4, color: C.gold });
    ctx.fillStyle = 'rgba(17,18,23,0.8)';
    ctx.fillRect(0, 828, 1920, 204);
    ctx.fillStyle = C.gold;
    ctx.fillRect(0, 828, 1920, 1);
    text(r, c.line.slice(0, this.typed), 960, 890, { size: 30, font: 'serif', weight: 600, align: 'center', color: C.ivory });
    if (this.typed >= c.line.length) text(r, '▼', 1830, 990 + Math.round(Math.sin(this.t * 8) * 4), { size: 18, color: C.gold });
    text(r, 'Next ▶  ENTER', 1700, 990, { size: 21, align: 'right', color: C.sub });
    text(r, 'Skip: ESC 1초 길게', 1700, 1020, { size: 18, align: 'right', color: C.sub });
    if (this.skipHold > 0) {
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(1750, 1026, 12, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(this.skipHold, 0, 1));
      ctx.stroke();
    }
    // progress dots
    for (let i = 0; i < CUTS.length; i++) {
      ctx.fillStyle = i === this.cut ? C.gold : C.empty;
      ctx.fillRect(900 + i * 36, 1000, 20, 4);
    }
  }
}
