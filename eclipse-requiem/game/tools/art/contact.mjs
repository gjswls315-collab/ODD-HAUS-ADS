// Contact sheet of every frame in a Sheet, one row per tag, scaled up for review (tooling only).
import { writeFileSync } from 'node:fs';
import { Bitmap } from './lib/raster.mjs';
import { encodePNG } from './lib/png.mjs';

export function contact(sheet, file, { scale = 3, bg = 'S1', maxW = 900 } = {}) {
  const rows = [];
  for (const t of sheet.tags) {
    const fr = sheet.frames.slice(t.from, t.to + 1);
    let x = 0, y = 0, rowH = 0, w = 0;
    const pos = [];
    for (const f of fr) { if (x > 0 && x + f.bmp.w > maxW) { x = 0; y += rowH + 4; rowH = 0; } pos.push([x, y]); x += f.bmp.w + 4; rowH = Math.max(rowH, f.bmp.h); w = Math.max(w, x); }
    rows.push({ fr, pos, w, h: y + rowH });
  }
  const W = Math.max(...rows.map((r) => r.w)) + 8, H = rows.reduce((a, r) => a + r.h + 8, 8);
  const img = new Bitmap(W, H);
  img.rect(0, 0, W, H, bg);
  let oy = 4;
  for (const r of rows) {
    r.fr.forEach((f, i) => { img.rect(4 + r.pos[i][0], oy + r.pos[i][1], f.bmp.w, f.bmp.h, 'S2'); img.blit(f.bmp, 4 + r.pos[i][0], oy + r.pos[i][1]); });
    oy += r.h + 8;
    img.rect(0, oy - 4, W, 1, 'N3');
  }
  const o = new Bitmap(W * scale, H * scale);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const p = img.get(Math.floor(x / scale), Math.floor(y / scale)); const k = o.idx(x, y); o.data[k] = p[0]; o.data[k + 1] = p[1]; o.data[k + 2] = p[2]; o.data[k + 3] = 255; }
  writeFileSync(file, encodePNG(o.w, o.h, o.data));
}
