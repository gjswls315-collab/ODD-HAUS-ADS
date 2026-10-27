import { G, Scene } from '../core/app';
import { C, H, W } from '../core/constants';
import { clamp, ease, TAU } from '../core/math';
import { Ctx, makeCanvas, rgba } from '../gfx/canvas';
import { ART } from '../gfx/sprites';
import { keyHints, panel, sigil, text } from '../gfx/ui';
import { CHARS } from '../game/defs';
import type { HitCircle, Target } from '../game/world';
import { World } from '../game/world';
import { uiMouse } from '../ui/menu';
import { MenuBackdrop } from './backdrops';
import { PreviewScene } from './preview';
import { TitleScene } from './title';

// Character select (docs/01 SCR-04, wireframe WF-2). The shot preview runs the real weapon code.

/** Training dummy for the shot preview: infinite HP, shows hit sparks. */
class Dummy implements Target {
  alive = true;
  isBoss = false;
  x = 250;
  y = 180;
  constructor(private w: World) {}
  hitCircles(): HitCircle[] {
    return [{ x: this.x, y: this.y, r: 14, mul: 1 }];
  }
  takeDamage() {
    this.w.fx.spark(this.x - 8, this.y, 1, ['#FFFFFF', this.w.ch.color], 50, { life: 0.2 });
  }
  draw(g: Ctx) {
    const x = this.x, y = this.y;
    g.fillStyle = '#3A2E22';
    g.fillRect(x - 1, y - 18, 3, 40);
    g.fillRect(x - 12, y - 10, 25, 3);
    g.fillStyle = '#8A7A5A';
    g.beginPath();
    g.arc(x, y, 9, 0, TAU);
    g.fill();
    g.fillStyle = '#B3263B';
    g.beginPath();
    g.arc(x, y, 5, 0, TAU);
    g.fill();
    g.fillStyle = '#E9E1D3';
    g.fillRect(x - 1, y - 1, 2, 2);
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
      if (m.x < 620 && m.y < 700) this.change(-1);
      else if (m.x > 1300 && m.y < 700) this.change(1);
      else if (m.x >= 660 && m.x <= 1260 && m.y < 760) this.confirm();
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

  render() {
    const r = G.r, g = r.wctx, ch = CHARS[this.idx];
    this.bg.draw(g, { tint: ch.color, tintA: 0.08 });
    // side cards and hero in pixel space
    const sideIdx = [(this.idx + 2) % 3, (this.idx + 1) % 3];
    const k = ease.outCubic(this.switchT);
    const conf = this.confirmT >= 0 ? clamp(this.confirmT / 0.8, 0, 1) : 0;
    g.save();
    g.globalAlpha = 0.55;
    g.filter = 'saturate(0.6) brightness(0.55)';
    g.drawImage(ART.heroCard[CHARS[sideIdx[0]].id], 150 - 61, 140 - 61);
    g.drawImage(ART.heroCard[CHARS[sideIdx[1]].id], 490 - 61, 140 - 61);
    g.restore();
    g.filter = 'none';
    const hero = ART.heroKey[ch.id];
    const off = Math.round((1 - k) * 40 * this.dir);
    g.drawImage(hero, Math.round(320 - hero.width / 2 + off), Math.round(150 - hero.height / 2 + Math.sin(this.t * 1.6) * 2));
    r.presentWorld();
    const ctx = r.ctx;
    ctx.save();
    r.clipView();
    r.worldTransform();
    ctx.globalCompositeOperation = 'lighter';
    this.bg.drawGlow(ctx, ART.glow.red);
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(this.t * 2);
    ctx.drawImage(ART.glow[ch.glow], 320 - 120, 150 - 110, 240, 220);
    if (conf > 0) {
      ctx.globalAlpha = (1 - conf) * 1.2;
      ctx.drawImage(ART.glow.white, 320 - 200, 150 - 200, 400, 400);
    }
    ctx.restore();

    r.uiTransform();
    // sigil behind hero
    ctx.save();
    ctx.globalAlpha = 0.25 + conf * 0.5;
    sigil(ctx, ch.sigil, 960, 440, 240 * (1 + conf * 0.6), ch.color, this.t * 0.1);
    ctx.restore();
    text(r, 'CHOOSE YOUR REQUIEM', 960, 40, { size: 48, font: 'display', weight: 700, align: 'center', spacing: 12, color: C.ivory, glow: 'rgba(0,0,0,0.9)', glowBlur: 10 });
    text(r, '당신의 진혼곡을 선택하라', 960, 104, { size: 30, font: 'serif', align: 'center', spacing: 6, color: rgba(C.ivory, 0.8) });
    // side card frames
    for (const [i, cx] of [[0, 300], [1, 1320]] as [number, number][]) {
      const c = CHARS[sideIdx[i]];
      ctx.strokeStyle = '#8A8F99';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.strokeRect(cx + 1.5, 211.5, 297, 417);
      ctx.globalAlpha = 1;
      text(r, c.name, cx + 150, 640, { size: 24, font: 'display', weight: 700, align: 'center', spacing: 4, color: C.sub });
      text(r, c.nameKr, cx + 150, 672, { size: 18, font: 'serif', align: 'center', color: C.sub });
    }
    // hero frame
    ctx.strokeStyle = ch.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = rgba(ch.color, 0.6);
    ctx.shadowBlur = 20 * r.s;
    ctx.strokeRect(661.5, 141.5, 597, 597);
    ctx.shadowBlur = 0;
    // arrows
    const pl = 1 + (this.dir < 0 ? 0.3 * (1 - this.switchT) : 0), pr = 1 + (this.dir > 0 ? 0.3 * (1 - this.switchT) : 0);
    text(r, '◀', 240, 420, { size: 36 * pl, align: 'center', baseline: 'middle', color: C.gold });
    text(r, '▶', 1680, 420, { size: 36 * pr, align: 'center', baseline: 'middle', color: C.gold });

    // info panel
    panel(r, 56, 760, 560, 230, { style: 'menu', alpha: 0.88, accent: ch.color });
    text(r, ch.name, 80, 776, { size: 48, font: 'display', weight: 700, spacing: 4, color: ch.color });
    text(r, `${ch.nameKr}  ·  ${ch.titleKr}`, 82, 834, { size: 21, font: 'serif', weight: 600, color: C.ivory });
    const info: [string, string][] = [['Role', `${ch.roleKr} · ${ch.role}`], ['Basic', ch.basic], ['Charge', ch.charge], ['Bomb', `${ch.bomb} · ${ch.bombEn}`]];
    info.forEach(([a, b], i) => {
      text(r, a, 82, 872 + i * 28, { size: 18, font: 'display', weight: 700, color: C.gold });
      text(r, b, 180, 870 + i * 28, { size: 21, color: C.ivory, maxWidth: 420 });
    });
    // preview panel
    panel(r, 650, 760, 620, 230, { style: 'menu', alpha: 0.88, accent: ch.color });
    TABS.forEach((tb, i) => {
      const x = 690 + i * 120;
      ctx.fillStyle = i === this.tab ? rgba(ch.color, 0.35) : 'rgba(0,0,0,0)';
      ctx.fillRect(x - 10, 774, 108, 30);
      text(r, tb, x + 44, 789, { size: 18, font: 'display', weight: 700, align: 'center', baseline: 'middle', color: i === this.tab ? C.ivory : C.sub });
    });
    text(r, '↓ 탭 전환 · 3초 자동', 1250, 789, { size: 18, align: 'right', baseline: 'middle', color: C.sub });
    this.pw.drawWorld(this.prevBg());
    ctx.imageSmoothingEnabled = false;
    // crop 300x75 logical around the preview lane, shown at 2 UI px per pixel (600x150)
    ctx.fillStyle = '#08080C';
    ctx.fillRect(660, 820, 600, 150);
    ctx.drawImage(this.pc, 0, 142, 300, 75, 660, 820, 600, 150);
    ctx.strokeStyle = rgba(ch.color, 0.6);
    ctx.lineWidth = 2;
    ctx.strokeRect(660, 820, 600, 150);
    // stats panel
    panel(r, 1300, 760, 564, 230, { style: 'menu', alpha: 0.88, accent: ch.color });
    const names = ['HP', 'SPEED', 'POWER', 'RANGE'];
    names.forEach((n, i) => {
      const y = 784 + i * 32;
      text(r, n, 1330, y, { size: 18, font: 'display', weight: 700, color: C.sub });
      const val = ch.stats[i];
      for (let s = 0; s < 10; s++) {
        const lit = s < val && this.statT > s * 0.03;
        ctx.fillStyle = lit ? ch.color : C.empty;
        ctx.fillRect(1440 + s * 21, y + 3, 18, 12);
      }
    });
    text(r, 'DIFFICULTY', 1330, 916, { size: 18, font: 'display', weight: 700, color: C.sub });
    text(r, '★'.repeat(ch.difficulty) + '☆'.repeat(3 - ch.difficulty) + '  ' + ch.difficultyLabel, 1460, 914, { size: 21, color: C.gold });
    text(r, ch.tip, 1330, 950, { size: 21, color: C.ivory, maxWidth: 520 });
    if (this.detail) {
      panel(r, 1300, 540, 564, 200, { style: 'tome', alpha: 0.95, accent: ch.color });
      const det = [
        `이동속도 ${ch.speed} px/s (집중 60%, 차지 중 85%)`,
        `HP ${ch.hp}칸 · 폭탄 무적 ${ch.bombInvuln}초`,
        `차지 1단 0.6초 = 50 / 2단 1.2초 = 120 (× 파워 배율)`,
        `기본 공격 간격 ${ch.fireInterval}초 · DPS ${Math.round(ch.dpsMul * 100)}%`,
      ];
      det.forEach((d, i) => text(r, d, 1330, 568 + i * 40, { size: 21, color: C.ivory }));
    }
    if (conf > 0) text(r, `"${ch.line}"`, 960, 700, { size: 30, font: 'serif', weight: 600, align: 'center', color: C.ivory, alpha: clamp(conf * 3, 0, 1), glow: 'rgba(0,0,0,1)', glowBlur: 10 });
    keyHints(r, 56, 1004, [['←/→', 'SELECT'], ['ENTER', 'CONFIRM'], ['ESC', 'BACK'], ['TAB', 'DETAIL']]);
  }

  private prevBg() {
    const g = this.pg;
    g.fillStyle = '#0D0C12';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#16141D';
    for (let x = 0; x < 300; x += 20) g.fillRect(x, 214, 10, 1);
    return g;
  }
}
