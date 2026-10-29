import { G, Scene } from '../core/app';
import { C } from '../core/constants';
import { clamp, TAU } from '../core/math';
import { HeroId } from '../gfx/sprites';
import { rgba } from '../gfx/canvas';
import { ART } from '../gfx/sprites';
import { button, keyHints, panel, text } from '../gfx/ui';
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

  render() {
    const r = G.r, ctx = r.ctx;
    this.bg.draw(r.wctx, { tint: '#000000', tintA: 0.35 });
    r.presentWorld();
    ctx.save();
    r.clipView();
    r.worldTransform();
    ctx.globalCompositeOperation = 'lighter';
    this.bg.drawGlow(ctx, ART.glow.red);
    ctx.restore();
    r.uiTransform();
    if (this.howto) {
      this.renderHowTo();
      return;
    }
    // bottom gradient for text
    const grd = ctx.createLinearGradient(0, 600, 0, 1080);
    grd.addColorStop(0, 'rgba(5,5,8,0)');
    grd.addColorStop(1, 'rgba(5,5,8,0.9)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 600, 1920, 480);
    // title engraving
    const eng = clamp(this.t / 0.8, 0, 1);
    text(r, 'STAGE 1', 960, 60, { size: 24, font: 'display', weight: 700, align: 'center', spacing: 12, color: C.gold, alpha: eng });
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 360 + 1200 * eng, 300);
    ctx.clip();
    text(r, 'ASHEN OUTSKIRTS', 960, 96, { size: 72, font: 'display', weight: 700, align: 'center', spacing: 8, color: C.ivory, glow: 'rgba(216,179,94,0.6)', glowBlur: 16 });
    ctx.restore();
    text(r, '재의 변두리', 960, 186, { size: 30, font: 'serif', weight: 600, align: 'center', spacing: 10, color: C.sub, alpha: eng });
    text(r, '잿빛 장지와 매달린 종탑의 골짜기', 960, 236, { size: 24, font: 'serif', align: 'center', color: C.ivory, alpha: eng });
    // enemy types
    panel(r, 56, 300, 900, 200, { style: 'menu', alpha: 0.85 });
    text(r, 'ENEMY TYPES', 80, 316, { size: 18, font: 'display', weight: 700, spacing: 4, color: C.gold });
    (['bat', 'candle', 'skeleton', 'cleric', 'sentinel'] as const).forEach((k, i) => {
      const a = clamp((this.t - 0.5 - i * 0.08) / 0.2, 0, 1);
      const x = 96 + i * 170, y = 352;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(11,11,15,0.8)';
      ctx.fillRect(x, y, 96, 96);
      ctx.strokeStyle = C.frame;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, 93, 93);
      const seen = G.save.flags.seen[k];
      const spr = ART.enemy[k][0];
      const sc = Math.min(2, Math.floor(84 / Math.max(spr.width, spr.height) * 3) / 3) * 1.5;
      ctx.imageSmoothingEnabled = false;
      if (!seen) ctx.filter = 'brightness(0)';
      const dw = spr.width * sc, dh = spr.height * sc;
      ctx.drawImage(spr, x + 48 - dw / 2, y + 48 - dh / 2, dw, dh);
      ctx.filter = 'none';
      text(r, seen ? ENEMIES[k].nameKr : '???', x + 48, y + 108, { size: 18, align: 'center', color: C.ivory });
      ctx.globalAlpha = 1;
    });
    // hazards
    panel(r, 56, 530, 900, 220, { style: 'menu', alpha: 0.85, accent: C.blood });
    text(r, 'HAZARD', 80, 546, { size: 18, font: 'display', weight: 700, spacing: 4, color: C.warn });
    const hz: [string, string][] = [['검은 안개', '시야가 좁아진다'], ['낙뢰 십자가', '붉은 예고선 1초 뒤 낙뢰'], ['붕괴 파편', '위에서 떨어진다 · 파괴 가능']];
    hz.forEach(([n, d], i) => {
      const x = 96 + i * 290, y = 584;
      ctx.fillStyle = 'rgba(11,11,15,0.85)';
      ctx.fillRect(x, y, 240, 90);
      ctx.strokeStyle = C.blood;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, 238, 88);
      this.hazardIcon(i, x + 120, y + 45);
      text(r, n, x, y + 100, { size: 21, weight: 700, color: C.ivory });
      text(r, d, x, y + 128, { size: 18, color: C.sub });
    });
    // boss silhouette
    const sa = clamp((this.t - 0.8) / 0.6, 0, 1);
    ctx.save();
    ctx.globalAlpha = sa;
    ctx.imageSmoothingEnabled = false;
    ctx.filter = 'brightness(0)';
    ctx.drawImage(ART.boss.bell[0], 1290, 250, 360, 300);
    ctx.drawImage(ART.boss.body, 1260, 330, 400, 440);
    ctx.filter = 'none';
    ctx.fillStyle = C.warn;
    ctx.fillRect(1371, 434, 6, 6);
    ctx.fillRect(1395, 432, 6, 6);
    ctx.restore();
    text(r, 'BOSS', 1540, 790, { size: 21, font: 'display', weight: 700, align: 'center', spacing: 6, color: C.warn, alpha: sa });
    text(r, 'BELLKEEPER ABADDON', 1540, 820, { size: 30, font: 'display', weight: 700, align: 'center', spacing: 3, color: C.ivory, alpha: sa });
    text(r, '침묵의 종지기', 1540, 862, { size: 24, font: 'serif', align: 'center', color: C.sub, alpha: sa });
    // begin button with rune loading ring
    const ready = this.loaded >= 1 && this.t >= 2.0;
    const bx = 1440, by = 960;
    button(r, bx, by, 420, 66, 'BEGIN REQUIEM', ready ? 'focus' : 'disabled', this.t, { size: 28, accent: C.blood });
    ctx.fillStyle = ready ? C.blood : 'rgba(179,38,59,0.25)';
    if (ready) {
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(this.t * 4);
      ctx.fillRect(bx, by, 420, 66);
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < 12; i++) {
      const lit = i / 12 < this.loaded;
      ctx.fillStyle = lit ? C.gold : 'rgba(90,74,46,0.6)';
      const px = bx + 18 + i * 35;
      ctx.fillRect(px, by - 10, 8, 4);
    }
    if (this.beginT >= 0) {
      const k = clamp(this.beginT / 0.4, 0, 1);
      ctx.strokeStyle = rgba(C.blood, 1 - k);
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(960, 540, 60 + k * 1200, 0, TAU);
      ctx.stroke();
    }
    keyHints(r, 56, 1004, [['ENTER', 'BEGIN'], ['ESC', 'CHANGE CHARACTER']]);
  }

  private hazardIcon(i: number, x: number, y: number) {
    const ctx = G.r.ctx;
    if (i === 0) {
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = `rgba(42,39,51,${0.5 + k * 0.1})`;
        ctx.beginPath();
        ctx.ellipse(x - 50 + k * 30, y + 10 - (k % 2) * 10, 50, 18, 0, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = C.cyan;
      ctx.fillRect(x - 3, y - 6, 4, 4);
      ctx.fillRect(x + 6, y - 6, 4, 4);
    } else if (i === 1) {
      ctx.fillStyle = '#09090C';
      ctx.fillRect(x - 5, y - 30, 10, 60);
      ctx.fillRect(x - 22, y - 14, 44, 10);
      ctx.fillStyle = C.warn;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.t * 12);
      ctx.fillRect(x + 40, y - 40, 3, 80);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#3A3742';
      for (let k = 0; k < 3; k++) {
        const yy = y - 26 + ((this.t * 40 + k * 26) % 60);
        ctx.beginPath();
        ctx.moveTo(x - 40 + k * 36, yy);
        ctx.lineTo(x - 30 + k * 36, yy - 12);
        ctx.lineTo(x - 18 + k * 36, yy + 4);
        ctx.fill();
      }
    }
  }

  private renderHowTo() {
    const r = G.r;
    panel(r, 560, 120, 800, 840, { style: 'tome', alpha: 0.96 });
    text(r, 'HOW TO PLAY', 960, 150, { size: 36, font: 'display', weight: 700, align: 'center', spacing: 8, color: C.gold });
    text(r, '처음 한 번만 표시됩니다', 960, 200, { size: 18, align: 'center', color: C.sub });
    controlsTable(r, 640, 250);
    const tips = ['적탄은 불투명한 구슬 · 내 탄은 반투명 빛줄기', '히트박스는 몸 중앙의 작은 점 하나', '탄을 스치면(GRAZE) 점수 +10'];
    tips.forEach((t, i) => text(r, '·  ' + t, 660, 720 + i * 34, { size: 21, color: C.ivory }));
    const a = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.t * 5));
    text(r, 'ENTER — 계속', 960, 900, { size: 24, font: 'display', weight: 700, align: 'center', spacing: 4, color: C.ivory, alpha: a });
  }
}
