import { H, W } from '../core/constants';
import { fxRng as R } from '../core/math';
import { sheet } from '../gfx/assets';
import { Ctx } from '../gfx/canvas';
import { SHEET } from '../gfx/sprites';
import { Section, StageBg } from '../game/stagebg';

// Menu backdrop: the Stage 1 parallax layers (same image assets as the game) drifting slowly under the red eclipse.

export class MenuBackdrop {
  t = 0;
  readonly bg = new StageBg();
  ash: { x: number; y: number; vx: number; vy: number; f: number }[] = [];
  constructor(public showCathedral = true, section: Section = 'A') {
    this.bg.section = section;
    this.bg.belfryX = showCathedral ? 300 : null;
    this.bg.setFog(0.55);
    this.bg.fogLevel = 0.55;
    for (let i = 0; i < 40; i++) this.ash.push({ x: R.range(0, W), y: R.range(0, H), vx: -R.range(3, 9), vy: R.range(2, 7), f: R.int(0, 2) });
  }
  /** Darken the backdrop (0..0.7) behind menus. */
  set dim(v: number) {
    this.bg.dim = v;
  }
  update(dt: number) {
    this.t += dt;
    this.bg.update(dt, 10);
    for (const a of this.ash) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.y > H || a.x < 0) {
        a.x = R.range(300, W + 20);
        a.y = R.range(-20, 120);
      }
    }
  }
  draw(g: Ctx) {
    this.bg.drawBack(g);
    this.bg.drawFog(g);
    const fx = sheet(SHEET.fx);
    for (const p of this.ash) fx.draw(g, 'ash', p.f, p.x, p.y);
  }
}
