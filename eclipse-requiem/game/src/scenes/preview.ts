import { G, Scene } from '../core/app';
import { C, W } from '../core/constants';
import { clamp } from '../core/math';
import { image, sheet } from '../gfx/assets';
import { Ctx } from '../gfx/canvas';
import { shade } from '../gfx/dither';
import { PAL } from '../gfx/palette';
import { PFont, ptext } from '../gfx/pixeltext';
import { HeroId, SHEET } from '../gfx/sprites';
import { button, fade, keyHints, panel, text } from '../gfx/ui';
import { ENEMIES } from '../game/defs';
import { uiMouse } from '../ui/menu';
import { MenuBackdrop } from './backdrops';
import { controlsTable, GameScene } from './game';
import { SelectScene } from './select';

// Stage preview / mission briefing, doubles as loading screen (docs/01 SCR-05).
// On the very first run the controls guide (HOW TO PLAY) is shown first.

export class PreviewScene implements Scene {
  private t = 0;
  private bg = new MenuBackdrop(true);
  private howto: boolean;
  private beginT = -1;

  constructor(private hero: HeroId) {
    this.howto = !G.save.flags.howtoSeen;
  }

  enter() {
    G.audio.music(null);
  }

  private get loaded() {
    return clamp((this.t - 0.4) / 1.4, 0, 1);
  }

  update(dt: number) {
    this.t += dt;
    this.bg.update(dt);
    const inp = G.input;
    if (this.howto) {
      if ((inp.confirm || inp.clicked) && this.t > 0.4) {
        this.howto = false;
        G.save.flags.howtoSeen = true;
        G.save.saveFlags();
        G.audio.sfx('uiConfirm');
        this.t = 0;
      }
      return;
    }
    if (this.beginT >= 0) {
      this.beginT += dt;
      if (this.beginT > 0.5 && !G.scenes.busy) G.scenes.go(new GameScene(this.hero), undefined, 'ink');
      return;
    }
    const ready = this.loaded >= 1 && this.t >= 2.0;
    let go = inp.confirm;
    if (inp.clicked) {
      const m = uiMouse();
      go = go || (m.x >= 1440 && m.x <= 1860 && m.y >= 960 && m.y <= 1026);
    }
    if (go) {
      if (!ready) G.audio.sfx('uiDeny');
      else {
        this.beginT = 0;
        G.audio.sfx('toll', 0.8);
      }
    }
    if (inp.back && !G.scenes.busy) {
      G.audio.sfx('uiBack');
      G.scenes.go(new SelectScene(), undefined, 'ink');
    }
  }

  private t2(g: Ctx, str: string, x: number, y: number, color: string, font: PFont = 'S', o: { align?: 'left' | 'center' | 'right'; scale?: number } = {}) {
    return ptext(g, str, x, y, { font, color, align: o.align, scale: o.scale, outline: PAL.N0 });
  }

  private box(g: Ctx, x: number, y: number, w: number, h: number, accent: string) {
    g.fillStyle = PAL.N1;
    g.fillRect(x, y, w, h);
    g.fillStyle = PAL.N4;
    g.fillRect(x, y + h - 1, w, 1);
    g.fillRect(x, y, 1, h);
    g.fillRect(x + w - 1, y, 1, h);
    g.fillStyle = accent;
    g.fillRect(x, y, w, 1);
  }

  render() {
    const r = G.r, g = r.wctx;
    this.bg.draw(g);
    shade(g, 0, 0, W, 360, this.howto ? 0.6 : 0.35);
    if (this.howto) {
      r.presentWorld();
      r.uiTransform();
      this.renderHowTo();
      return;
    }
    const eng = clamp(this.t / 0.8, 0, 1);
    // title engraving: revealed left to right
    this.t2(g, 'STAGE 1', W / 2, 14, PAL.G3, 'S', { align: 'center' });
    g.save();
    g.beginPath();
    g.rect(0, 0, 120 + 400 * eng, 60);
    g.clip();
    this.t2(g, 'ASHEN OUTSKIRTS', W / 2, 26, PAL.B5, 'S', { align: 'center', scale: 3 });
    g.restore();
    this.t2(g, '재의 변두리 — 잿빛 장지와 매달린 종탑의 골짜기', W / 2, 54, PAL.N8, 'G9', { align: 'center' });

    // enemy roster (unseen ones as silhouettes)
    const en = sheet(SHEET.enemies);
    this.box(g, 12, 76, 304, 112, PAL.N5);
    this.t2(g, 'ENEMY TYPES', 20, 82, PAL.G3);
    (['bat', 'candle', 'skeleton', 'cleric', 'sentinel'] as const).forEach((k, i) => {
      if (this.t < 0.5 + i * 0.08) return;
      const x = 18 + i * 59, y = 94;
      g.fillStyle = PAL.N0;
      g.fillRect(x, y, 56, 70);
      const seen = G.save.flags.seen[k];
      g.save();
      g.beginPath();
      g.rect(x, y, 56, 70);
      g.clip();
      en.draw(g, k, en.index(k, this.t), x + 28, y + 36, { shadow: !seen });
      g.restore();
      this.t2(g, seen ? ENEMIES[k].nameKr : '???', x + 28, y + 74, seen ? PAL.B4 : PAL.N6, 'G9', { align: 'center' });
    });

    // hazards
    const fx = sheet(SHEET.fx);
    this.box(g, 12, 196, 304, 92, PAL.R2);
    this.t2(g, 'HAZARD', 20, 202, PAL.R4);
    const hz: [string, string][] = [['검은 안개', '시야가 좁아진다'], ['낙뢰 십자가', '예고선 1초 뒤 낙뢰'], ['붕괴 파편', '낙하 · 파괴 가능']];
    hz.forEach(([n, d], i) => {
      const x = 18 + i * 99, y = 214;
      g.fillStyle = PAL.N0;
      g.fillRect(x, y, 94, 40);
      g.save();
      g.beginPath();
      g.rect(x, y, 94, 40);
      g.clip();
      if (i === 0) g.drawImage(image('stage1/fog_a'), x - 40, y - 50);
      else if (i === 1) {
        const f = Math.floor(this.t * 6) % 2;
        fx.draw(g, 'gravecross', 1 + f, x + 30, y + 46);
        for (let yy = y + 2; yy < y + 40; yy += 6) fx.draw(g, 'teledot', f, x + 66, yy);
      } else fx.draw(g, 'rubble', Math.floor(this.t * 8), x + 47, y + ((this.t * 30) % 60) - 10);
      g.restore();
      this.t2(g, n, x, y + 42, PAL.B4, 'G9');
      this.t2(g, d, x, y + 54, PAL.N7, 'G9');
    });

    // boss: the real sprite parts as a silhouette, soul lantern lit
    const sa = clamp((this.t - 0.8) / 0.6, 0, 1);
    if (sa > 0) {
      const bs = sheet(SHEET.boss), bx = 470, by = 196;
      const pt = (n: string) => bs.point('body', 0, n);
      const o = { shadow: true, dither: Math.round(sa * 16) };
      bs.draw(g, 'armB', 0, bx + pt('armB')[0], by + pt('armB')[1], o);
      bs.draw(g, 'bell_c0', 2, bx + pt('bell')[0], by + pt('bell')[1], o);
      bs.draw(g, 'body', 0, bx, by, o);
      bs.draw(g, 'head', 0, bx + pt('head')[0], by + pt('head')[1], o);
      bs.draw(g, 'armF_down', 0, bx + pt('armF')[0], by + pt('armF')[1], o);
      bs.draw(g, 'core', bs.index('core', this.t), bx, by, { dither: Math.round(sa * 16) });
      g.save();
      g.globalAlpha = sa;
      this.t2(g, 'BOSS', 470, 290, PAL.R4, 'S', { align: 'center' });
      this.t2(g, 'BELLKEEPER ABADDON', 470, 300, PAL.B5, 'S', { align: 'center', scale: 2 });
      this.t2(g, '침묵의 종지기', 470, 318, PAL.N8, 'G11', { align: 'center' });
      g.restore();
    }
    // loading pips above the button
    const hud = sheet(SHEET.hud);
    for (let i = 0; i < 12; i++) hud.draw(g, 'pip', i / 12 < this.loaded ? 1 : 0, 486 + i * 11, 314);
    r.presentWorld();
    r.uiTransform();
    const ready = this.loaded >= 1 && this.t >= 2.0;
    button(r, 1440, 960, 420, 66, 'BEGIN REQUIEM', ready ? 'focus' : 'disabled', this.t, { size: 28 });
    if (this.beginT >= 0) fade(r, clamp(this.beginT / 0.4, 0, 1));
    r.uiTransform();
    keyHints(r, 48, 1038, [['ENTER', 'BEGIN'], ['ESC', 'CHANGE CHARACTER']]);
  }

  private renderHowTo() {
    const r = G.r;
    panel(r, 560, 120, 800, 840, { style: 'tome', alpha: 0.96 });
    text(r, 'HOW TO PLAY', 960, 150, { size: 48, font: 'display', weight: 700, align: 'center', color: C.gold });
    text(r, '처음 한 번만 표시됩니다', 960, 200, { size: 18, align: 'center', color: C.sub });
    controlsTable(r, 640, 250);
    const tips = ['적탄은 불투명한 구슬 · 내 탄은 반투명 빛줄기', '히트박스는 몸 중앙의 작은 점 하나', '탄을 스치면(GRAZE) 점수 +10'];
    tips.forEach((t, i) => text(r, '·  ' + t, 660, 720 + i * 34, { size: 21, color: C.ivory }));
    if (Math.floor(this.t * 2) % 2 === 0) text(r, 'ENTER — 계속', 960, 900, { size: 30, weight: 700, align: 'center', color: C.ivory });
  }
}
