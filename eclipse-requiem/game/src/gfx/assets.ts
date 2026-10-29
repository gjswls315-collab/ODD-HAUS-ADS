import { Ctx, makeCanvas } from './canvas';
import { ditherMask } from './dither';

/**
 * Asset loader. All game graphics live in `game/assets/` as image files; code only loads and draws them.
 *  - Sprite sheets: `name.png` + `name.json` in Aseprite "Export Sprite Sheet" JSON (array or hash frames),
 *    animations from `meta.frameTags`, anchor/attachment points from `meta.slices` (1x1 slices, e.g. `pivot`, `muzzle`).
 *  - Plain images (background layers, logo): `name.png` without a JSON.
 * Keys are paths under assets/ without the extension, e.g. 'sprites/hero_seraphine', 'stage1/sky'.
 * Replacing a file with an artist's export of the same name (and tag names) swaps the art without code changes.
 */

const JSONS = import.meta.glob('../../assets/**/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const URLS = import.meta.glob('../../assets/**/*.{png,woff2}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const ROOT = '../../assets/';
const keyOf = (p: string) => p.slice(ROOT.length).replace(/\.[^.]+$/, '');

interface AseRect { x: number; y: number; w: number; h: number }
interface AseFrame { filename?: string; frame: AseRect; spriteSourceSize?: AseRect; sourceSize?: { w: number; h: number }; duration?: number }
interface AseJson {
  frames: AseFrame[] | Record<string, AseFrame>;
  meta: {
    image: string;
    frameTags?: { name: string; from: number; to: number; direction?: string }[];
    slices?: { name: string; keys: { frame: number; bounds: AseRect; pivot?: { x: number; y: number } }[] }[];
  };
}

export interface Frame {
  /** rect in the sheet image */
  x: number; y: number; w: number; h: number;
  /** trim offset inside the untrimmed source frame */
  ox: number; oy: number;
  /** duration in seconds */
  dur: number;
  /** named points in source-frame coordinates (always has `pivot`) */
  pts: Record<string, [number, number]>;
}
export interface Tag { from: number; to: number; dir: string; total: number }

export interface DrawOpts {
  alpha?: number;
  flash?: boolean;
  flipX?: boolean;
  add?: boolean;
  /** 0..16: ordered-dither visibility (fade without translucency); 16 = solid */
  dither?: number;
}

let scratch: [HTMLCanvasElement, Ctx] | null = null;

export class Sheet {
  readonly frames: Frame[] = [];
  readonly tags = new Map<string, Tag>();
  private whiteImg: HTMLCanvasElement | null = null;
  constructor(readonly key: string, readonly img: CanvasImageSource & { width: number; height: number }, json: AseJson | null, readonly missing = false) {
    if (!json) {
      this.frames.push({ x: 0, y: 0, w: img.width, h: img.height, ox: 0, oy: 0, dur: 0.1, pts: { pivot: [Math.floor(img.width / 2), Math.floor(img.height / 2)] } });
      this.tags.set('default', { from: 0, to: 0, dir: 'forward', total: 0.1 });
      return;
    }
    const list = Array.isArray(json.frames) ? json.frames : Object.values(json.frames);
    for (const f of list) {
      const src = f.sourceSize ?? { w: f.frame.w, h: f.frame.h };
      this.frames.push({
        x: f.frame.x, y: f.frame.y, w: f.frame.w, h: f.frame.h,
        ox: f.spriteSourceSize?.x ?? 0, oy: f.spriteSourceSize?.y ?? 0,
        dur: (f.duration ?? 100) / 1000,
        pts: { pivot: [Math.floor(src.w / 2), Math.floor(src.h / 2)] },
      });
    }
    for (const s of json.meta.slices ?? []) {
      const keys = [...s.keys].sort((a, b) => a.frame - b.frame);
      for (let i = 0; i < this.frames.length; i++) {
        let k = null;
        for (const key of keys) if (key.frame <= i) k = key;
        if (k) this.frames[i].pts[s.name] = [k.bounds.x + (k.pivot?.x ?? 0), k.bounds.y + (k.pivot?.y ?? 0)];
      }
    }
    for (const t of json.meta.frameTags ?? []) {
      let total = 0;
      for (let i = t.from; i <= t.to; i++) total += this.frames[i].dur;
      this.tags.set(t.name, { from: t.from, to: t.to, dir: t.direction ?? 'forward', total });
    }
    if (!this.tags.size) this.tags.set('default', { from: 0, to: this.frames.length - 1, dir: 'forward', total: this.frames.reduce((a, f) => a + f.dur, 0) });
  }

  has(tag: string) {
    return this.tags.has(tag);
  }
  tag(tag: string): Tag {
    return this.tags.get(tag) ?? this.tags.values().next().value!;
  }
  count(tag: string) {
    const t = this.tag(tag);
    return t.to - t.from + 1;
  }
  /** Frame index within a tag for an elapsed time (seconds). */
  index(tag: string, time: number, loop = true) {
    const t = this.tag(tag);
    if (t.total <= 0) return 0;
    let tt = loop ? ((time % t.total) + t.total) % t.total : Math.min(time, t.total - 1e-6);
    if (t.dir === 'pingpong' && loop) {
      // forward then back without repeating the end frames
      const n = t.to - t.from + 1;
      const seq = [...Array(n).keys(), ...[...Array(Math.max(0, n - 2)).keys()].map((i) => n - 2 - i)];
      const per = t.total / n;
      return seq[Math.floor(((time / per) % seq.length + seq.length) % seq.length)];
    }
    for (let i = t.from; i <= t.to; i++) {
      tt -= this.frames[i].dur;
      if (tt < 0) return i - t.from;
    }
    return t.to - t.from;
  }
  frame(tag: string, i: number): Frame {
    const t = this.tag(tag);
    const n = t.to - t.from + 1;
    return this.frames[t.from + (((Math.floor(i) % n) + n) % n)];
  }
  /** Named point relative to the pivot (offset you add to the draw position). */
  point(tag: string, i: number, name: string): [number, number] {
    const f = this.frame(tag, i), p = f.pts[name] ?? f.pts.pivot, pv = f.pts.pivot;
    return [p[0] - pv[0], p[1] - pv[1]];
  }
  size(tag: string, i = 0) {
    const f = this.frame(tag, i);
    return { w: f.w, h: f.h };
  }
  /** Draw a frame so that its pivot lands on (x, y). */
  draw(g: Ctx, tag: string, i: number, x: number, y: number, o: DrawOpts = {}) {
    const f = this.frame(tag, i);
    if (o.dither !== undefined && o.dither < 16) {
      if (o.dither <= 0) return;
      // compose the frame on a scratch canvas, keep a dithered fraction of its pixels, then draw that
      if (!scratch || scratch[0].width < f.w || scratch[0].height < f.h) scratch = makeCanvas(Math.max(f.w, scratch?.[0].width ?? 0), Math.max(f.h, scratch?.[0].height ?? 0));
      const [sc, sg] = scratch;
      sg.clearRect(0, 0, sc.width, sc.height);
      sg.drawImage(o.flash ? this.white() : this.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      ditherMask(sg, f.w, f.h, o.dither);
      const px = f.pts.pivot;
      const dx = Math.round(x - px[0] + f.ox), dy = Math.round(y - px[1] + f.oy);
      const prevA = g.globalAlpha;
      if (o.alpha !== undefined) g.globalAlpha = prevA * o.alpha;
      g.drawImage(sc, 0, 0, f.w, f.h, dx, dy, f.w, f.h);
      g.globalAlpha = prevA;
      return;
    }
    const img = o.flash ? this.white() : this.img;
    const px = f.pts.pivot;
    let dx = Math.round(x - px[0] + f.ox), dy = Math.round(y - px[1] + f.oy);
    const prevA = g.globalAlpha, prevC = g.globalCompositeOperation;
    if (o.alpha !== undefined) g.globalAlpha = prevA * o.alpha;
    if (o.add) g.globalCompositeOperation = 'lighter';
    if (o.flipX) {
      dx = Math.round(x + px[0] - f.ox - f.w);
      g.save();
      g.translate(dx + f.w, dy);
      g.scale(-1, 1);
      g.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      g.restore();
    } else g.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, f.w, f.h);
    g.globalAlpha = prevA;
    g.globalCompositeOperation = prevC;
  }
  /** White silhouette of the whole sheet, derived once (hit flash). */
  white() {
    if (!this.whiteImg) {
      const [c, g] = makeCanvas(this.img.width, this.img.height);
      g.drawImage(this.img, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#F2EBDD';
      g.fillRect(0, 0, c.width, c.height);
      this.whiteImg = c;
    }
    return this.whiteImg;
  }
}

const sheets = new Map<string, Sheet>();
const missingLog = new Set<string>();

/** Visible stand-in for a missing file: magenta checker, so gaps are obvious instead of silently hidden. */
function missingImage(w = 16, h = 16) {
  const [c, g] = makeCanvas(w, h);
  for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { g.fillStyle = ((x + y) / 4) % 2 ? '#FF00FF' : '#000000'; g.fillRect(x, y, 4, 4); }
  return c;
}

export function sheet(key: string): Sheet {
  let s = sheets.get(key);
  if (!s) {
    if (!missingLog.has(key)) { missingLog.add(key); console.warn('[assets] missing', key); }
    s = new Sheet(key, missingImage(), null, true);
    sheets.set(key, s);
  }
  return s;
}
/** Plain image by key (background layers etc.). */
export function image(key: string) {
  return sheet(key).img;
}
export function data<T>(key: string): T | null {
  return (JSONS[ROOT + key + '.json'] as T) ?? null;
}
export function fontUrl(name: string) {
  return URLS[ROOT + 'fonts/' + name + '.woff2'];
}
export function missingAssets() {
  return [...missingLog];
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('image failed: ' + url));
    im.src = url;
  });
}

export async function loadAssets() {
  const jobs: Promise<void>[] = [];
  for (const [path, url] of Object.entries(URLS)) {
    if (!path.endsWith('.png')) continue;
    const key = keyOf(path);
    const json = JSONS[ROOT + key + '.json'] as AseJson | undefined;
    jobs.push(loadImage(url).then((im) => { sheets.set(key, new Sheet(key, im, json && json.frames ? json : null)); }));
  }
  await Promise.all(jobs);
}
