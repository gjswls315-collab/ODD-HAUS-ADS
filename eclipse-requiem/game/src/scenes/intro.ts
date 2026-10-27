import { G, Scene } from '../core/app';
import { C, H, W } from '../core/constants';
import { clamp, ease, fxRng as R, TAU } from '../core/math';
import { makeMoon } from '../gfx/art/backdrop';
import { ART } from '../gfx/sprites';
import { text } from '../gfx/ui';
import { drawLogo } from '../ui/logo';
import { TitleScene } from './title';

// Logo / intro (docs/01 SCR-01). The first key press here also unlocks browser audio.

export class IntroScene implements Scene {
  private t = 0;
  private moon = makeMoon(64, 9);
  private dust: { x: number; y: number; tx: number; ty: number; d: number }[] = [];
  private skipped = false;

  constructor() {
    for (let i = 0; i < 120; i++) {
      const a = R.range(0, TAU), rr = R.range(500, 1000);
      this.dust.push({ x: 960 + Math.cos(a) * rr, y: 520 + Math.sin(a) * rr, tx: R.range(560, 1360), ty: R.range(410, 520), d: R.range(0, 0.4) });
    }
  }

  update(dt: number) {
    this.t += dt;
    const inp = G.input;
    if ((inp.anyKeyThisStep || inp.clicked) && !G.scenes.busy) {
      G.audio.unlock();
      if (this.t < 4.5 && !this.skipped) {
        this.skipped = true;
        this.t = 4.5;
        return;
      }
      G.audio.sfx('uiConfirm');
      G.scenes.go(new TitleScene(true), undefined, 'fade');
    }
    if (this.t > 2.5 && this.t - dt <= 2.5) G.audio.sfx('toll', 0.5);
  }

  render() {
    const r = G.r, g = r.wctx, t = this.t;
    g.fillStyle = '#050508';
    g.fillRect(0, 0, W, H);
    const ringA = clamp((t - 0.5) / 1.0, 0, 1);
    if (ringA > 0) {
      g.globalAlpha = ringA;
      g.drawImage(this.moon, Math.round(W / 2 - this.moon.width / 2), Math.round(H / 2 - 8 - this.moon.height / 2));
      // stained glass pattern inside the eclipse
      const glassA = clamp((t - 1.5) / 0.8, 0, 1) * 0.2 * (0.8 + 0.2 * Math.sin(t * 7));
      g.globalAlpha = glassA * ringA;
      g.strokeStyle = '#B3263B';
      g.lineWidth = 1;
      const cx = W / 2, cy = H / 2 - 8;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60);
        g.stroke();
      }
      for (const rr of [22, 42]) {
        g.beginPath();
        g.arc(cx, cy, rr, 0, TAU);
        g.stroke();
      }
      // rotating corona sparks (2 deg/s)
      g.globalAlpha = ringA;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU + t * (2 * Math.PI / 180);
        const rr = 66 + (i % 3);
        g.fillStyle = i % 4 === 0 ? '#FF8A6A' : '#D94C3A';
        g.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), 1, 1);
      }
      g.globalAlpha = 1;
    }
    r.presentWorld();
    const ctx = r.ctx;
    ctx.save();
    r.clipView();
    r.worldTransform();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * ringA;
    ctx.drawImage(ART.glow.red, W / 2 - 110, H / 2 - 118, 220, 220);
    ctx.restore();

    r.uiTransform();
    // gold dust converging into the logo (2.5 s -> 3.7 s)
    if (t > 2.3 && t < 4.2) {
      const k = clamp((t - 2.5) / 1.2, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const d of this.dust) {
        const kk = ease.inOutCubic(clamp((k - d.d) / (1 - d.d), 0, 1));
        const x = d.x + (d.tx - d.x) * kk, y = d.y + (d.ty - d.y) * kk;
        ctx.globalAlpha = 0.8 * (1 - Math.max(0, k - 0.85) / 0.15);
        ctx.fillStyle = C.gold;
        ctx.fillRect(x, y, 4, 4);
      }
      ctx.restore();
    }
    const logoA = clamp((t - 3.3) / 0.6, 0, 1);
    if (logoA > 0) drawLogo(960, 400, 96, t, logoA, false);
    const subA = clamp((t - 3.7) / 0.5, 0, 1);
    if (subA > 0) text(r, '일식의 진혼곡', 960, 540, { size: 36, font: 'serif', weight: 600, align: 'center', spacing: 18, color: C.ivory, alpha: subA * 0.85 });
    if (t > 4.5) {
      const a = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin((t - 4.5) * (Math.PI * 2 / 1.2)));
      text(r, 'PRESS ANY KEY', 960, 940, { size: 24, font: 'display', weight: 600, align: 'center', spacing: 8, color: C.ivory, alpha: a });
      text(r, '화면을 한 번 클릭한 뒤 키보드 · 게임패드로 플레이합니다 (사운드 ON 권장)', 960, 990, { size: 18, align: 'center', color: C.sub, alpha: 0.7 });
    }
  }
}
