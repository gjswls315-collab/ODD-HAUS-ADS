import { H, W } from '../core/constants';
import { fxRng as R } from '../core/math';
import { data, image, sheet } from '../gfx/assets';
import { Ctx, makeCanvas } from '../gfx/canvas';
import { ditherFill, ditherMask } from '../gfx/dither';

// Stage parallax built from image layers (assets/stage1/*.png, layout in assets/stage1/stage.json).
// Back layers are drawn behind actors, fog and foreground in front of them; enemy bullets always go on top.

export type Section = 'A' | 'B' | 'C' | 'R' | 'D';

interface LayerDef {
  id: string;
  image?: string;
  x?: number;
  y: number;
  factor?: number;
  drift?: number;
  tiles?: Partial<Record<Section, string>>;
  mode?: 'queue' | 'fade';
  fadeTime?: number;
}
interface StageDef {
  back: LayerDef[];
  front: LayerDef[];
  fog: { images: string[]; bands: { y: number; factor: number; drift: number; image: number }[] };
  landmark: { image: string; broken: string; y: number; restX: number };
  bolt: { sheet: string; y: number };
}

class TiledLayer {
  private queue: { x: number; key: string }[] = [];
  private cur: string;
  private prev: string | null = null;
  private fadeK = 1;
  private buf: HTMLCanvasElement | null = null;
  constructor(readonly def: LayerDef, section: Section) {
    this.cur = this.keyFor(section);
  }
  private keyFor(s: Section) {
    const t = this.def.tiles!;
    return t[s] ?? t.A ?? Object.values(t)[0]!;
  }
  setSection(s: Section) {
    const k = this.keyFor(s);
    if (this.def.mode === 'fade' && k !== this.cur) {
      this.prev = this.cur;
      this.cur = k;
      this.fadeK = 0;
    } else if (this.def.mode !== 'fade') this.cur = k;
  }
  update(dt: number) {
    if (this.fadeK < 1) this.fadeK = Math.min(1, this.fadeK + dt / (this.def.fadeTime ?? 2));
  }
  draw(g: Ctx, off: number) {
    const y = this.def.y;
    if (this.def.mode === 'fade') {
      if (this.prev && this.fadeK < 1) {
        loop(g, image(this.prev), off, y);
        const img = image(this.cur);
        if (!this.buf || this.buf.height !== img.height) this.buf = makeCanvas(W, img.height)[0];
        const b = this.buf.getContext('2d')!;
        b.clearRect(0, 0, W, img.height);
        loop(b, img, off, 0);
        ditherMask(b, W, img.height, this.fadeK * 16);
        g.drawImage(this.buf, 0, y);
      } else loop(g, image(this.cur), off, y);
      return;
    }
    // queue: tiles keep the variant they had when they scrolled in
    while (this.queue.length && this.queue[0].x + image(this.queue[0].key).width <= off) this.queue.shift();
    if (!this.queue.length) this.queue.push({ x: Math.floor(off / image(this.cur).width) * image(this.cur).width, key: this.cur });
    for (;;) {
      const last = this.queue[this.queue.length - 1];
      const end = last.x + image(last.key).width;
      if (end > off + W) break;
      this.queue.push({ x: end, key: this.cur });
    }
    for (const t of this.queue) g.drawImage(image(t.key), Math.round(t.x - off), y);
  }
}

function loop(g: Ctx, img: CanvasImageSource & { width: number }, off: number, y: number) {
  const w = img.width;
  let x = -(((off % w) + w) % w);
  x = Math.round(x);
  for (; x < W; x += w) g.drawImage(img, x, y);
}

export class StageBg {
  private def = data<StageDef>('stage1/stage')!;
  private tiled = new Map<string, TiledLayer>();
  dist = 0;
  time = 0;
  private _section: Section = 'A';
  fogLevel = 0.25;
  private fogTarget = 0.25;
  belfryX: number | null = null;
  belfryShake = 0;
  belfryBroken = false;
  /** darkening applied to the background (phase escalation); colour argument kept for API compatibility */
  tintA = 0;
  private tintTarget = 0;
  dim = 0;
  /** Player option "Background dim" (0 / 0.15 / 0.3). */
  userDim = 0;
  boltT = 0;
  boltX = 0;
  boltRed = false;
  lightningRate = 0;
  collapse = 0;

  constructor() {
    for (const l of this.def.back) if (l.tiles) this.tiled.set(l.id, new TiledLayer(l, 'A'));
  }

  get section() {
    return this._section;
  }
  set section(s: Section) {
    this._section = s;
    for (const t of this.tiled.values()) t.setSection(s);
  }

  setFog(level: number) {
    this.fogTarget = level;
  }
  setTint(_color: string, a: number) {
    this.tintTarget = a;
  }

  update(dt: number, speed: number) {
    this.time += dt;
    this.dist += speed * dt;
    this.fogLevel += (this.fogTarget - this.fogLevel) * Math.min(1, dt * 0.8);
    this.tintA += (this.tintTarget - this.tintA) * Math.min(1, dt / 1.2);
    if (this.belfryX !== null) this.belfryX += (this.def.landmark.restX - this.belfryX) * Math.min(1, dt * 0.22);
    if (this.boltT > 0) this.boltT -= dt;
    if (this.lightningRate > 0 && R.next() < this.lightningRate * dt) this.bolt(R.next() < 0.6);
    for (const t of this.tiled.values()) t.update(dt);
  }

  bolt(red = false) {
    this.boltT = 0.12;
    this.boltX = R.range(40, W - 40);
    this.boltRed = red;
  }

  private drawLayer(g: Ctx, l: LayerDef) {
    if (l.id === 'bolt') {
      if (this.boltT > 0) {
        const s = sheet(this.def.bolt.sheet), tag = this.boltRed ? 'red' : 'white';
        const i = Math.min(s.count(tag) - 1, Math.floor((0.12 - this.boltT) / 0.04));
        s.draw(g, tag, i, this.boltX, this.def.bolt.y);
      }
      return;
    }
    if (l.id === 'landmark') {
      if (this.belfryX === null) return;
      const lm = this.def.landmark, img = image(this.belfryBroken ? lm.broken : lm.image);
      const sx = this.belfryShake > 0 ? R.int(-1, 1) : 0;
      g.drawImage(img, Math.round(this.belfryX + sx), lm.y + Math.round(this.collapse * 8));
      return;
    }
    const off = this.dist * (l.factor ?? 0) + this.time * (l.drift ?? 0);
    const t = this.tiled.get(l.id);
    if (t) t.draw(g, off);
    else if (l.image) {
      if ((l.factor ?? 0) === 0 && !l.drift) g.drawImage(image(l.image), l.x ?? 0, l.y);
      else loop(g, image(l.image), off, l.y);
    }
  }

  drawBack(g: Ctx) {
    for (const l of this.def.back) this.drawLayer(g, l);
    const dark = Math.min(0.7, (this._section === 'C' ? 0.25 : 0) + this.dim + this.userDim + this.tintA);
    if (dark > 0.01) ditherFill(g, 0, 0, W, H, dark * 16, '#07080B');
  }

  drawFront(g: Ctx) {
    const f = this.def.fog;
    if (this.fogLevel > 0.02) {
      g.globalAlpha = Math.min(1, this.fogLevel);
      for (const b of f.bands) loop(g, image(f.images[b.image % f.images.length]), this.dist * b.factor + this.time * b.drift, b.y);
      g.globalAlpha = 1;
    }
    for (const l of this.def.front) this.drawLayer(g, l);
  }
}
