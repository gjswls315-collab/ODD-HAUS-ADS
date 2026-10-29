import { G, Scene } from '../core/app';
import { H, W } from '../core/constants';
import { loadedSheets, missingAssets, sheet } from '../gfx/assets';
import { PAL } from '../gfx/palette';
import { ptext } from '../gfx/pixeltext';

// Asset browser (?artsheet): every loaded sheet/image with its tags playing, for checking replaced art in-engine.
// ←/→ change sheet, ↑/↓ change tag.

export class ArtSheetScene implements Scene {
  private i = 0;
  private tag = 0;
  private t = 0;
  private keys = loadedSheets();

  update(dt: number) {
    this.t += dt;
    const inp = G.input;
    if (inp.left) { this.i = (this.i + this.keys.length - 1) % this.keys.length; this.tag = 0; }
    if (inp.right) { this.i = (this.i + 1) % this.keys.length; this.tag = 0; }
    const tags = [...sheet(this.keys[this.i]).tags.keys()];
    if (inp.down) this.tag = (this.tag + 1) % tags.length;
    if (inp.up) this.tag = (this.tag + tags.length - 1) % tags.length;
  }

  render() {
    const r = G.r, g = r.wctx;
    g.fillStyle = PAL.S1;
    g.fillRect(0, 0, W, H);
    const key = this.keys[this.i], sh = sheet(key);
    const tags = [...sh.tags.keys()], tag = tags[this.tag] ?? tags[0];
    ptext(g, `${this.i + 1}/${this.keys.length}  ${key}  (${sh.img.width}x${sh.img.height})`, 6, 4, { color: PAL.B5 });
    // whole sheet, top-left
    const img = sh.img, sc = img.width <= 200 && img.height <= 120 ? 2 : 1;
    g.drawImage(img, 0, 0, Math.min(img.width, 400 / sc), Math.min(img.height, 300 / sc), 6, 16, Math.min(img.width * sc, 400), Math.min(img.height * sc, 300));
    // selected tag playing, right
    ptext(g, 'TAG ' + tag + '  [' + sh.count(tag) + ']', 420, 16, { color: PAL.G3 });
    tags.slice(0, 26).forEach((t, k) => ptext(g, t, 420, 28 + k * 9, { color: t === tag ? PAL.B5 : PAL.N7 }));
    const f = sh.frame(tag, sh.index(tag, this.t));
    const cx = 540, cy = 250;
    g.fillStyle = PAL.N1;
    g.fillRect(cx - 1, cy - 1, 2, 2);
    sh.draw(g, tag, sh.index(tag, this.t), cx, cy);
    ptext(g, `${f.w}x${f.h} pivot ${f.pts.pivot.join(',')}`, 420, 340, { color: PAL.N8 });
    const miss = missingAssets();
    if (miss.length) ptext(g, 'MISSING: ' + miss.join(' '), 6, 350, { color: PAL.R4 });
    r.presentWorld();
  }
}
