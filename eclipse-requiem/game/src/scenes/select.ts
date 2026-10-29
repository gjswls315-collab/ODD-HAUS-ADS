import { G, Scene } from '../core/app';
import { H, W } from '../core/constants';
import { clamp, ease } from '../core/math';
import { sheet } from '../gfx/assets';
import { Ctx, makeCanvas } from '../gfx/canvas';
import { shade } from '../gfx/dither';
import { PAL } from '../gfx/palette';
import { PFont, ptext } from '../gfx/pixeltext';
import { SHEET } from '../gfx/sprites';
import { keyHints } from '../gfx/ui';
import { CHARS } from '../game/defs';
import type { HitCircle, Target } from '../game/world';
import { World } from '../game/world';
import { uiMouse } from '../ui/menu';
import { MenuBackdrop } from './backdrops';
import { PreviewScene } from './preview';
import { TitleScene } from './title';

// Character select (docs/01 SCR-04, wireframe WF-2). The shot preview runs the real weapon code.

/** Training target for the shot preview (a grave cross from the stage set): infinite HP, shows hit sparks. */
class Dummy implements Target {
  alive = true;
  isBoss = false;
  x = 160;
  y = 180;
  constructor(private w: World) {}
  hitCircles(): HitCircle[] {
    return [{ x: this.x, y: this.y, r: 14, mul: 1 }];
  }
  takeDamage() {
    if (Math.random() < 0.4) this.w.fx.hit(this.x - 8 + Math.random() * 6, this.y - 8 + Math.random() * 16);
  }
  draw(g: Ctx) {
    sheet(SHEET.fx).draw(g, 'gravecross', 0, this.x, this.y + 27);
  }
}

const TABS = ['BASIC', 'CHARGE', 'BOMB'] as const;

export class SelectScene implements Scene {
  private idx = G.save.flags.lastChar ?? 0;
  private t = 0;
  private switchT = 1;
  private dir = 1;
  private detail = false;
  private confirmT = -1;
  private bg = new MenuBackdrop(false);
  private pw!: World;
  private pc: HTMLCanvasElement;
  private pg: Ctx;
  private tabT = 0;
  private tab = 0;
  private statT = 0;

  constructor() {
    [this.pc, this.pg] = makeCanvas(W, H);
    this.makePreview();
  }

  enter() {
    G.audio.music('title');
  }

  private makePreview() {
    const w = new World(CHARS[this.idx].id, true);
    w.player.x = 40;
    w.player.y = 180;
    w.player.demo = { charge: false, bomb: false };
    w.player.invuln = 0;
    w.extraTargets.push(new Dummy(w));
    this.pw = w;
    this.tab = 0;
    this.tabT = 0;
  }

  private change(d: number) {
    this.idx = (this.idx + d + CHARS.length) % CHARS.length;
    this.dir = d;
    this.switchT = 0;
    this.statT = 0;
    G.audio.sfx('whoosh');
    this.makePreview();
  }

  update(dt: number) {
    this.t += dt;
    this.switchT = Math.min(1, this.switchT + dt / 0.4);
    this.statT += dt;
    this.bg.update(dt);
    this.updatePreview(dt);
    const inp = G.input;
    if (this.confirmT >= 0) {
      this.confirmT += dt;
      if (this.confirmT > 0.8 && !G.scenes.busy) G.scenes.go(new PreviewScene(CHARS[this.idx].id), undefined, 'ink');
      return;
    }
    if (inp.left) this.change(-1);
    if (inp.right) this.change(1);
    if (inp.tab) {
      this.detail = !this.detail;
      G.audio.sfx('uiMove');
    }
    if (inp.down) {
      this.tab = (this.tab + 1) % 3;
      this.tabT = 0;
      this.applyTab();
    }
    if (inp.clicked) {
      const m = uiMouse();
      if (m.x < 720 && m.y < 620) this.change(-1);
      else if (m.x > 1200 && m.y < 620) this.change(1);
      else if (m.x >= 720 && m.x <= 1200 && m.y < 620) this.confirm();
    }
    if (inp.confirm) this.confirm();
    if (inp.back && !G.scenes.busy) {
      G.audio.sfx('uiBack');
      G.scenes.go(new TitleScene(true), undefined, 'ink');
    }
  }

  private confirm() {
    if (this.confirmT >= 0) return;
    this.confirmT = 0;
    G.save.flags.lastChar = this.idx;
    G.save.saveFlags();
    G.audio.sfx('uiConfirm');
    G.audio.sfx('toll', 0.5);
  }

  private applyTab() {
    const p = this.pw.player;
    p.demo = { charge: false, bomb: this.tab === 2 };
    if (this.tab === 2) p.bombs = 3;
  }

  private updatePreview(dt: number) {
    this.tabT += dt;
    if (this.tabT > 3) {
      this.tab = (this.tab + 1) % 3;
      this.tabT = 0;
      this.applyTab();
    }
    const p = this.pw.player;
    if (this.tab === 1 && p.demo) {
      // hold 1.3 s, release, repeat
      const cyc = this.tabT % 2.2;
      p.demo.charge = cyc < 1.3;
    }
    p.x = 40;
    p.y = 180;
    G.audio.muted = true;
    this.pw.update(dt);
    G.audio.muted = false;
  }

  private t2(g: Ctx, str: string, x: number, y: number, color: string, font: PFont = 'S', o: { align?: 'left' | 'center' | 'right'; scale?: number } = {}) {
    return ptext(g, str, x, y, { font, color, align: o.align, scale: o.scale, outline: PAL.N0 });
  }

  render() {
    const r = G.r, g = r.wctx, ch = CHARS[this.idx];
    this.bg.draw(g);
    shade(g, 0, 0, W, H, 0.5);
    const k = ease.outCubic(this.switchT);
    const conf = this.confirmT >= 0 ? clamp(this.confirmT / 0.8, 0, 1) : 0;
    this.t2(g, 'CHOOSE YOUR REQUIEM', W / 2, 8, PAL.B5, 'S', { align: 'center', scale: 2 });
    this.t2(g, '당신의 진혼곡을 선택하라', W / 2, 26, PAL.N8, 'G9', { align: 'center' });

    // portraits: the selected one in front and lit, the others pushed back with a dither
    const port = sheet(SHEET.portraits), hud = sheet(SHEET.hud);
    const slots = [-1, 0, 1].map((d) => (this.idx + d + CHARS.length) % CHARS.length);
    slots.forEach((ci, si) => {
      const c = CHARS[ci], sel = si === 1;
      const x = 320 + (si - 1) * 150 + Math.round((1 - k) * 30 * this.dir) * (sel ? 1 : 0);
      const y = 196 + (sel ? Math.round(Math.sin(this.t * 1.6) * 1) : 6);
      port.draw(g, c.id, 0, x, y, { flash: sel && conf > 0 && conf < 0.2 });
      if (!sel) port.draw(g, c.id, 0, x, y, { shadow: true, alpha: 0.62 });
      this.t2(g, c.name, x, 202, sel ? c.color : PAL.N6, 'S', { align: 'center' });
    });
    const cf = Math.floor(this.t * 3) % 2;
    hud.draw(g, 'cursor', cf, 236, 120, { flipX: true });
    hud.draw(g, 'cursor', cf, 404, 120);

    // info (left)
    const y0 = 216;
    this.panel(g, 8, y0, 210, 124, ch.color);
    this.t2(g, ch.name, 16, y0 + 6, ch.color, 'S', { scale: 2 });
    this.t2(g, ch.nameKr + ' · ' + ch.titleKr, 16, y0 + 22, PAL.B4, 'G9');
    const info: [string, string][] = [['ROLE', ch.roleKr + ' · ' + ch.role], ['SHOT', ch.basic], ['CHARGE', ch.charge], ['BOMB', ch.bomb]];
    info.forEach(([a, b], i) => {
      this.t2(g, a, 16, y0 + 42 + i * 14, PAL.N7);
      this.t2(g, b, 62, y0 + 40 + i * 14, PAL.B4, 'G9');
    });
    this.t2(g, ch.bombEn, 62, y0 + 98, PAL.N7);

    // live weapon preview (centre): the real player/shot code firing at a target, at game scale
    this.panel(g, 224, y0, 196, 124, ch.color);
    TABS.forEach((tb, i) => {
      const x = 236 + i * 58;
      const on = i === this.tab;
      this.t2(g, tb, x, y0 + 6, on ? PAL.B5 : PAL.N6);
      if (on) {
        g.fillStyle = ch.color;
        g.fillRect(x, y0 + 15, tb.length * 6 - 1, 1);
      }
    });
    this.pw.drawWorld(this.prevBg());
    g.drawImage(this.pc, 0, 134, 192, 98, 226, y0 + 22, 192, 98);
    this.t2(g, '↓', 410, y0 + 6, PAL.N6);

    // stats (right)
    this.panel(g, 426, y0, 206, 124, ch.color);
    const pipF = ch.id === 'seraphine' ? 1 : ch.id === 'noctis' ? 2 : 3;
    ['HP', 'SPEED', 'POWER', 'RANGE'].forEach((n, i) => {
      const y = y0 + 8 + i * 13;
      this.t2(g, n, 434, y, PAL.N7);
      for (let s = 0; s < 10; s++) hud.draw(g, 'pip', s < ch.stats[i] && this.statT > s * 0.03 ? pipF : 0, 478 + s * 7, y + 3);
    });
    this.t2(g, 'DIFFICULTY', 434, y0 + 62, PAL.N7);
    for (let i = 0; i < 3; i++) hud.draw(g, 'skull', 0, 502 + i * 11, y0 + 65, { alpha: i < ch.difficulty ? 1 : 0.25 });
    this.t2(g, ch.difficultyLabel, 540, y0 + 60, PAL.B4, 'G9');
    this.t2(g, ch.tip, 434, y0 + 80, PAL.B4, 'G9');
    this.t2(g, '"' + ch.line + '"', 434, y0 + 96, PAL.N8, 'G9');

    if (this.detail) {
      this.panel(g, 426, 40, 206, 74, ch.color);
      const det = [
        `이동속도 ${ch.speed} px/s (집중 60%)`,
        `HP ${ch.hp}칸 · 폭탄 무적 ${ch.bombInvuln}초`,
        `차지 0.6초 = 50 / 1.2초 = 120`,
        `기본 공격 간격 ${ch.fireInterval}초 · DPS ${Math.round(ch.dpsMul * 100)}%`,
      ];
      det.forEach((d, i) => this.t2(g, d, 434, 46 + i * 16, PAL.B4, 'G9'));
    }
    if (conf > 0) {
      shade(g, 0, 150, W, 30, clamp(conf * 3, 0, 1) * 0.7);
      ptext(g, '"' + ch.line + '"', W / 2, 158, { font: 'G11', color: PAL.B5, align: 'center', alpha: clamp(conf * 3, 0, 1) });
    }
    r.presentWorld();
    r.uiTransform();
    keyHints(r, 24, 1038, [['←→', 'SELECT'], ['ENTER', 'CONFIRM'], ['ESC', 'BACK'], ['TAB', 'DETAIL']]);
  }

  private panel(g: Ctx, x: number, y: number, w: number, h: number, accent: string) {
    g.fillStyle = PAL.N1;
    g.fillRect(x, y, w, h);
    g.fillStyle = PAL.N4;
    g.fillRect(x, y, w, 1);
    g.fillRect(x, y + h - 1, w, 1);
    g.fillRect(x, y, 1, h);
    g.fillRect(x + w - 1, y, 1, h);
    g.fillStyle = accent;
    g.fillRect(x, y, w, 1);
  }

  private prevBg() {
    const g = this.pg;
    g.fillStyle = PAL.N1;
    g.fillRect(0, 0, W, H);
    g.fillStyle = PAL.N2;
    for (let x = 0; x < 200; x += 8) g.fillRect(x, 222, 4, 1);
    return g;
  }
}
