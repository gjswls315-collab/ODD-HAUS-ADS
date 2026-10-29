import { G, Scene } from '../core/app';
import { H, W } from '../core/constants';
import { clamp, fxRng as R } from '../core/math';
import { image, sheet } from '../gfx/assets';
import { Ctx } from '../gfx/canvas';
import { ditherFill } from '../gfx/dither';
import { PAL } from '../gfx/palette';
import { ptext } from '../gfx/pixeltext';
import { HEROES, SHEET } from '../gfx/sprites';
import { SelectScene } from './select';
import { TitleScene } from './title';

// Story prologue: 4 cuts composed from the stage and character assets + a text box (docs/01 SCR-03).

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
  private souls: { x: number; y: number; v: number; ph: number }[] = [];
  private fadeT = 0;

  constructor(private next: 'select' | 'title') {
    for (let i = 0; i < 40; i++) this.souls.push({ x: R.range(0, W), y: R.range(120, 340), v: R.range(14, 30), ph: R.range(0, 6) });
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
        s.y = R.range(280, 340);
        s.x = R.range(0, W);
      }
    }
  }

  private drawCut(g: Ctx) {
    const t = this.t;
    const sky = image('stage1/sky'), moon = image('stage1/moon'), far = image('stage1/far');
    g.drawImage(sky, 0, 0);
    if (this.cut === 0) {
      // the eclipse rises over the city
      const rise = Math.round(150 - 60 * clamp(t / 6, 0, 1));
      g.drawImage(moon, W / 2 - moon.width / 2, rise);
      g.drawImage(far, -200, 170);
    } else if (this.cut === 1) {
      // the belfry: its bell (boss bell sprite, pre-tilted frames) swings slower and stops
      g.drawImage(moon, 470, 24);
      g.drawImage(image('stage1/belfry'), 204, 46);
      const swing = Math.sin(t * 3) * Math.max(0, 1 - t / 3);
      const boss = sheet(SHEET.boss);
      boss.draw(g, 'bell_c0', Math.round(2 + swing * 2), 320, 110);
      g.drawImage(far, -500, 230);
    } else if (this.cut === 2) {
      g.drawImage(moon, W / 2 - moon.width / 2, 30);
      g.drawImage(far, -400, 200);
      const items = sheet(SHEET.items);
      for (const s of this.souls) items.draw(g, 'mote', Math.floor(t * 4 + s.ph) % 2, s.x, s.y);
    } else {
      g.drawImage(moon, W / 2 - moon.width / 2, 40);
      g.drawImage(far, -600, 220);
      HEROES.forEach((id, i) => {
        const hs = sheet(SHEET.hero(id));
        const x = Math.round(-60 + clamp(t / 5, 0, 1) * 300 + i * 70);
        const y = Math.round(150 + i * 36 - Math.sin(t + i) * 2);
        hs.draw(g, 'fly', hs.index('fly', t + i * 0.13), x, y);
      });
    }
  }

  render() {
    const r = G.r, g = r.wctx;
    this.drawCut(g);
    if (this.fadeT > 0) ditherFill(g, 0, 0, W, H, Math.round((this.fadeT / 0.6) * 16), PAL.N0);
    const c = CUTS[this.cut];
    ptext(g, c.chapter, 18, 14, { font: 'G11', color: PAL.G3, outline: PAL.N0 });
    g.fillStyle = PAL.N1;
    g.fillRect(0, 276, W, 68);
    g.fillStyle = PAL.N4;
    g.fillRect(0, 276, W, 1);
    ptext(g, c.line.slice(0, this.typed), W / 2, 294, { font: 'G11', color: PAL.B5, align: 'center' });
    if (this.typed >= c.line.length && Math.floor(this.t * 3) % 2 === 0) sheet(SHEET.hud).draw(g, 'cursor', 0, 610, 330);
    ptext(g, 'ENTER 다음 · ESC 1초 길게 건너뛰기', W - 34, 326, { font: 'G9', color: PAL.N7, align: 'right' });
    if (this.skipHold > 0) {
      g.fillStyle = PAL.G2;
      g.fillRect(W - 140, 340, Math.round(106 * clamp(this.skipHold, 0, 1)), 1);
    }
    for (let i = 0; i < CUTS.length; i++) {
      g.fillStyle = i === this.cut ? PAL.G2 : PAL.N3;
      g.fillRect(W / 2 - 30 + i * 16, 330, 8, 2);
    }
    r.presentWorld();
  }
}
