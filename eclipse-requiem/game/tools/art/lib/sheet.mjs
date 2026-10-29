// Sprite sheet builder: packs frames into one PNG and writes Aseprite-compatible JSON
// (array frames + meta.frameTags + meta.slices), the same format the game loader reads from artist exports.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Bitmap } from './raster.mjs';
import { encodePNG } from './png.mjs';

export const ASSETS = new URL('../../../assets/', import.meta.url).pathname;

export class Sheet {
  /** @param {string} path e.g. 'sprites/hero_seraphine' (relative to game/assets, no extension) */
  constructor(path, { maxWidth = 512, pad = 1 } = {}) {
    this.path = path;
    this.maxWidth = maxWidth;
    this.pad = pad;
    this.frames = [];
    this.tags = [];
  }
  /**
   * Append frames to a tag.
   * @param {string} tag
   * @param {Bitmap[]} bitmaps
   * @param {{ duration?: number|number[], pivot?: [number,number]|((i:number)=>[number,number]), points?: Record<string, [number,number]|((i:number)=>[number,number])>, direction?: string }} o
   */
  add(tag, bitmaps, o = {}) {
    const from = this.frames.length;
    bitmaps.forEach((bmp, i) => {
      const dur = Array.isArray(o.duration) ? o.duration[i] : o.duration ?? 100;
      const pts = {};
      const pv = typeof o.pivot === 'function' ? o.pivot(i) : o.pivot ?? [Math.floor(bmp.w / 2), Math.floor(bmp.h / 2)];
      pts.pivot = pv;
      for (const [k, v] of Object.entries(o.points || {})) pts[k] = typeof v === 'function' ? v(i) : v;
      this.frames.push({ name: `${tag} ${i}`, bmp, dur, pts });
    });
    this.tags.push({ name: tag, from, to: this.frames.length - 1, direction: o.direction || 'forward' });
    return this;
  }
  pack() {
    let x = 0, y = 0, rowH = 0, W = 0;
    for (const f of this.frames) {
      if (x > 0 && x + f.bmp.w > this.maxWidth) { x = 0; y += rowH + this.pad; rowH = 0; }
      f.x = x; f.y = y;
      x += f.bmp.w + this.pad;
      rowH = Math.max(rowH, f.bmp.h);
      W = Math.max(W, f.x + f.bmp.w);
    }
    return { w: W, h: y + rowH };
  }
  write() {
    const { w, h } = this.pack();
    const img = new Bitmap(w, h);
    for (const f of this.frames) img.blit(f.bmp, f.x, f.y);
    const base = ASSETS + this.path;
    mkdirSync(dirname(base), { recursive: true });
    writeFileSync(base + '.png', encodePNG(w, h, img.data));
    const sliceNames = [...new Set(this.frames.flatMap((f) => Object.keys(f.pts)))];
    const json = {
      frames: this.frames.map((f) => ({
        filename: f.name,
        frame: { x: f.x, y: f.y, w: f.bmp.w, h: f.bmp.h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: f.bmp.w, h: f.bmp.h },
        sourceSize: { w: f.bmp.w, h: f.bmp.h },
        duration: f.dur,
      })),
      meta: {
        app: 'eclipse-requiem tools/art (placeholder art, replace with final Aseprite export)',
        version: '1',
        image: this.path.split('/').pop() + '.png',
        format: 'RGBA8888',
        size: { w, h },
        scale: '1',
        frameTags: this.tags,
        slices: sliceNames.map((name) => ({
          name,
          color: '#0000ffff',
          keys: this.frames.flatMap((f, i) => (f.pts[name] ? [{ frame: i, bounds: { x: Math.round(f.pts[name][0]), y: Math.round(f.pts[name][1]), w: 1, h: 1 } }] : [])),
        })),
      },
    };
    writeFileSync(base + '.json', JSON.stringify(json, null, 1));
    return { path: this.path, w, h, frames: this.frames.length };
  }
}

/** Write a single image (backgrounds, logo). */
export function writeImage(path, bmp) {
  const base = ASSETS + path;
  mkdirSync(dirname(base), { recursive: true });
  writeFileSync(base + '.png', encodePNG(bmp.w, bmp.h, bmp.data));
  return { path, w: bmp.w, h: bmp.h };
}
