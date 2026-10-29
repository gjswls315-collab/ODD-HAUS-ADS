// Upscale PNG assets for review: node tools/art/view.mjs <out.png> <scale> <in1.png> [in2.png ...] (stacked vertically on slate)
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { Bitmap } from './lib/raster.mjs';
import { encodePNG } from './lib/png.mjs';

export function decodePNG(buf) {
  let p = 8, w = 0, h = 0, ct = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
    if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), out = new Uint8ClampedArray(w * h * 4), line = w * bpp;
  let prev = new Uint8Array(line);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (line + 1)], cur = new Uint8Array(raw.subarray(y * (line + 1) + 1, (y + 1) * (line + 1)));
    for (let i = 0; i < line; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      cur[i] = (cur[i] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
    for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; out[o] = cur[x * bpp]; out[o + 1] = cur[x * bpp + 1]; out[o + 2] = cur[x * bpp + 2]; out[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255; }
    prev = cur;
  }
  return Bitmap.from(w, h, out);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [out, k, ...ins] = process.argv.slice(2), s = +k;
  const imgs = ins.map((f) => decodePNG(readFileSync(f)));
  const W = Math.max(...imgs.map((b) => b.w)) + 8, H = imgs.reduce((a, b) => a + b.h + 8, 8);
  const c = new Bitmap(W, H);
  c.rect(0, 0, W, H, 'S1');
  let y = 4;
  for (const b of imgs) { c.blit(b, 4, y); y += b.h + 8; }
  const o = new Bitmap(W * s, H * s);
  for (let yy = 0; yy < o.h; yy++) for (let x = 0; x < o.w; x++) { const q = c.get(Math.floor(x / s), Math.floor(yy / s)); const i = o.idx(x, yy); o.data[i] = q[0]; o.data[i + 1] = q[1]; o.data[i + 2] = q[2]; o.data[i + 3] = 255; }
  writeFileSync(out, encodePNG(o.w, o.h, o.data));
}
