import { image } from '../gfx/assets';
import { Ctx } from '../gfx/canvas';
import { PAL } from '../gfx/palette';
import { ptext } from '../gfx/pixeltext';

// Title logo: the pixel lettering in assets/ui/logo.png (replaceable), drawn into the 640x360 game buffer,
// dithered in by `alpha`, with the Korean subtitle in Galmuri below it.

export function drawLogo(g: Ctx, cx: number, y: number, _t: number, alpha = 1, sub = true) {
  if (alpha <= 0) return;
  const img = image('ui/logo');
  const x = Math.round(cx - img.width / 2);
  if (alpha >= 1) g.drawImage(img, x, y);
  else {
    g.save();
    g.globalAlpha = alpha;
    g.drawImage(img, x, y);
    g.restore();
  }
  if (sub) ptext(g, '일식의 진혼곡', cx, y + img.height + 4, { font: 'G11', color: PAL.B3, align: 'center', outline: PAL.N0, alpha });
}
