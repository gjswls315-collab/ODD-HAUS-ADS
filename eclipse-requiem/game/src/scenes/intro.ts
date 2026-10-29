import { G, Scene } from '../core/app';
import { H, W } from '../core/constants';
import { clamp } from '../core/math';
import { image } from '../gfx/assets';
import { ditherMask } from '../gfx/dither';
import { makeCanvas } from '../gfx/canvas';
import { PAL } from '../gfx/palette';
import { ptext } from '../gfx/pixeltext';
import { drawLogo } from '../ui/logo';
import { TitleScene } from './title';

// Logo / intro (docs/01 SCR-01). The first key press here also unlocks browser audio.
// The red eclipse (stage1/moon) dissolves in with an ordered dither, then the logo.

export class IntroScene implements Scene {
  private t = 0;
  private skipped = false;
  private buf = makeCanvas(84, 84);

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
    g.fillStyle = PAL.N0;
    g.fillRect(0, 0, W, H);
    const moonA = clamp((t - 0.5) / 1.4, 0, 1);
    if (moonA > 0) {
      const moon = image('stage1/moon');
      const [c, bg] = this.buf;
      bg.clearRect(0, 0, c.width, c.height);
      bg.drawImage(moon, 0, 0);
      ditherMask(bg, c.width, c.height, moonA * 16);
      g.drawImage(c, Math.round(W / 2 - moon.width / 2), 40);
    }
    drawLogo(g, W / 2, 140, t, clamp((t - 3.0) / 0.8, 0, 1));
    if (t > 4.5) {
      if (Math.floor((t - 4.5) * 2) % 2 === 0) ptext(g, 'PRESS ANY KEY', W / 2, 300, { font: 'S', color: PAL.B4, align: 'center' });
      ptext(g, '화면을 한 번 클릭한 뒤 키보드 · 게임패드로 플레이합니다 (사운드 ON 권장)', W / 2, 322, { font: 'G9', color: PAL.N7, align: 'center' });
    }
    r.presentWorld();
  }
}
