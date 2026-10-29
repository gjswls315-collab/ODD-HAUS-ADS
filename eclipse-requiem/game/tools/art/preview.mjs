// Compose quick previews of authored layers (no browser needed). usage: node tools/art/preview.mjs <outDir>
import { writeFileSync, mkdirSync } from 'node:fs';
import { Bitmap } from './lib/raster.mjs';
import { encodePNG } from './lib/png.mjs';
import { buildStage1 } from './stage1.mjs';

const out = process.argv[2] || '.';
mkdirSync(out, { recursive: true });
const scale = (b, k) => { const o = new Bitmap(b.w * k, b.h * k); for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const p = b.get(Math.floor(x / k), Math.floor(y / k)); const i = o.idx(x, y); o.data[i] = p[0]; o.data[i + 1] = p[1]; o.data[i + 2] = p[2]; o.data[i + 3] = p[3]; } return o; };
const save = (name, b, k = 2) => writeFileSync(`${out}/${name}.png`, encodePNG(b.w * k, b.h * k, scale(b, k).data));

const { bmps: L } = buildStage1();
const tile = (dst, src, x, y) => { for (let k = -1; k < 3; k++) dst.blit(src, x + k * src.w, y); };
for (const [name, mid, near, ground, scroll] of [['A', 'mid_cemetery', 'near_wall', 'ground_graves', 0], ['B', 'mid_ravine', 'near_bridge', 'ground_bridge', 300], ['D', 'mid_ruins', 'near_ruins', 'ground_rubble', 100]]) {
  const s = new Bitmap(640, 360);
  s.blit(L.sky, 0, 0);
  tile(s, L.clouds, -Math.round(scroll * 0.06) % 1280, 20);
  s.blit(L.moon, 438, 20);
  tile(s, L.far, -Math.round(scroll * 0.12) % 1280, 150);
  if (name === 'D') s.blit(L.belfry, 300, 40);
  tile(s, L[mid], -Math.round(scroll * 0.32) % 960, 160);
  tile(s, L[near], -Math.round(scroll * 0.62) % 640, 146);
  tile(s, L.fog_a, -Math.round(scroll * 0.8) % 640, 250);
  tile(s, L[ground], -scroll % 640, 316);
  tile(s, L.fore_top, -Math.round(scroll * 1.4) % 960, 0);
  tile(s, L.fore_bottom, -Math.round(scroll * 1.4) % 960, 326);
  save('stage_' + name, s);
}
console.log('previews written to', out);
