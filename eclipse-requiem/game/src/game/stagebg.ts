import { H, W } from '../core/constants';
import { fxRng as R } from '../core/math';
import { Ctx } from '../gfx/canvas';
import {
  Light, makeBelfry, makeChunk, makeClouds, makeFar, makeFogBlob, makeForeground, makeMid, makeMoon, makeSky, Section,
} from '../gfx/art/backdrop';
import { ART } from '../gfx/sprites';

// Runtime parallax for Stage 1 (docs/05 §3): L0 sky x0.15, L1 far x0.4, L2 mid x0.7, L3 terrain x1.0, L4 fore x1.25.

let cache: {
  sky: HTMLCanvasElement; moon: HTMLCanvasElement; clouds: HTMLCanvasElement; far: HTMLCanvasElement; mid: HTMLCanvasElement;
  fg: { top: HTMLCanvasElement; bot: HTMLCanvasElement }; fog: HTMLCanvasElement[]; belfry: HTMLCanvasElement;
} | null = null;

export function bgAssets() {
  if (!cache) {
    cache = {
      sky: makeSky(), moon: makeMoon(30), clouds: makeClouds(), far: makeFar(), mid: makeMid(), fg: makeForeground(),
      fog: [makeFogBlob(200, 60), makeFogBlob(260, 80, '#1E1A26'), makeFogBlob(160, 50, '#2E2838')], belfry: makeBelfry(),
    };
  }
  return cache;
}

const CHUNK = 320;

export class StageBg {
  a = bgAssets();
  dist = 0;
  time = 0;
  section: Section = 'A';
  private chunks = new Map<number, { c: HTMLCanvasElement; lights: Light[] }>();
  fogLevel = 0.25;
  private fogTarget = 0.25;
  belfryX: number | null = null;
  belfryShake = 0;
  tintColor = '#000000';
  tintA = 0;
  private tintTarget = { color: '#000000', a: 0 };
  dim = 0;
  /** Player option "Background dim" (0 / 0.15 / 0.3). */
  userDim = 0;
  boltT = 0;
  boltX = 0;
  boltRed = false;
  lightningRate = 0;
  collapse = 0;

  setFog(level: number) {
    this.fogTarget = level;
  }
  setTint(color: string, a: number) {
    this.tintTarget = { color, a };
    if (a > 0) this.tintColor = color;
  }

  update(dt: number, speed: number) {
    this.time += dt;
    this.dist += speed * dt;
    this.fogLevel += (this.fogTarget - this.fogLevel) * Math.min(1, dt * 0.8);
    this.tintA += (this.tintTarget.a - this.tintA) * Math.min(1, dt / 1.2);
    if (this.belfryX !== null) this.belfryX += (330 - this.belfryX) * Math.min(1, dt * 0.22);
    if (this.boltT > 0) this.boltT -= dt;
    if (this.lightningRate > 0 && R.next() < this.lightningRate * dt) this.bolt(R.next() < 0.6);
    // drop chunks that scrolled off
    const first = Math.floor(this.dist / CHUNK);
    for (const k of this.chunks.keys()) if (k < first - 1) this.chunks.delete(k);
  }

  bolt(red = false) {
    this.boltT = 0.12;
    this.boltX = R.range(40, W - 40);
    this.boltRed = red;
  }

  private chunk(i: number) {
    let c = this.chunks.get(i);
    if (!c) {
      const made = makeChunk(i, this.section);
      c = { c: made.c, lights: made.lights };
      this.chunks.set(i, c);
    }
    return c;
  }

  private loop(g: Ctx, img: HTMLCanvasElement, off: number, y: number) {
    const w = img.width;
    let x = -((off % w) + w) % w;
    x = Math.round(x);
    for (; x < W; x += w) g.drawImage(img, x, y);
  }

  drawBack(g: Ctx) {
    const a = this.a;
    g.drawImage(a.sky, 0, 0);
    // twinkle a few stars
    for (let i = 0; i < 12; i++) {
      if (Math.sin(this.time * (1 + i * 0.37) + i * 9) > 0.92) {
        g.fillStyle = '#C8CCE0';
        g.fillRect((i * 97 + 31) % W, (i * 53 + 11) % 150, 1, 1);
      }
    }
    // far lightning flash behind the skyline
    if (this.boltT > 0) {
      g.fillStyle = this.boltRed ? 'rgba(179,38,59,0.18)' : 'rgba(200,210,234,0.12)';
      g.fillRect(0, 0, W, H);
      g.fillStyle = this.boltRed ? '#D94C3A' : '#C8D2EA';
      let x = this.boltX;
      for (let y = 0; y < 150; y += 8) {
        g.fillRect(Math.round(x), y, 1, 8);
        x += R.int(-4, 4);
      }
    }
    g.globalAlpha = 0.5;
    this.loop(g, a.clouds, this.dist * 0.15 + this.time * 3, 34);
    g.globalAlpha = 1;
    g.drawImage(a.moon, 520 - a.moon.width / 2, 58 - a.moon.height / 2);
    this.loop(g, a.far, this.dist * 0.4, 112);
    if (this.belfryX !== null) {
      const sx = this.belfryShake > 0 ? R.int(-1, 1) : 0;
      g.drawImage(a.belfry, Math.round(this.belfryX + sx), 46 + Math.round(this.collapse * 8));
    }
    this.loop(g, a.mid, this.dist * 0.7, 100);
    // terrain chunks
    const first = Math.floor(this.dist / CHUNK);
    for (let i = first; i <= first + 2; i++) {
      const x = Math.round(i * CHUNK - this.dist);
      if (x > W) break;
      g.drawImage(this.chunk(i).c, x, H - 140);
    }
    // tints (background only: drawn before actors)
    if (this.tintA > 0.005) {
      g.globalAlpha = this.tintA;
      g.fillStyle = this.tintColor;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    const dim = (this.section === 'C' ? 0.25 : 0) + this.dim + this.userDim;
    if (dim > 0) {
      g.fillStyle = `rgba(4,4,8,${Math.min(0.7, dim)})`;
      g.fillRect(0, 0, W, H);
    }
  }

  drawFront(g: Ctx) {
    const a = this.a;
    // fog banks
    if (this.fogLevel > 0.02) {
      g.globalAlpha = Math.min(1, this.fogLevel);
      for (let i = 0; i < 6; i++) {
        const f = a.fog[i % 3];
        const x = ((-(this.dist * (0.9 + i * 0.07) + this.time * (6 + i * 2)) % (W + f.width)) + W + f.width) % (W + f.width) - f.width;
        const y = H - 70 - (i % 3) * 26 - (i > 2 ? 40 : 0);
        g.drawImage(f, Math.round(x), y);
      }
      g.globalAlpha = 1;
    }
    this.loop(g, a.fg.top, this.dist * 1.25, 0);
    this.loop(g, a.fg.bot, this.dist * 1.25, H - 36);
  }

  drawGlow(ctx: Ctx) {
    ctx.globalAlpha = 0.55;
    ctx.drawImage(ART.glow.red, 520 - 70, 58 - 70, 140, 140);
    ctx.globalAlpha = 0.25;
    ctx.drawImage(ART.glow.red, 520 - 130, 58 - 130, 260, 260);
    const first = Math.floor(this.dist / CHUNK);
    for (let i = first; i <= first + 2; i++) {
      const c = this.chunks.get(i);
      if (!c) continue;
      const ox = i * CHUNK - this.dist;
      for (const l of c.lights) {
        const fl = 0.75 + 0.25 * Math.sin(this.time * 9 + l.x);
        ctx.globalAlpha = 0.6 * fl;
        const s = l.r * 2;
        ctx.drawImage(ART.glow[l.color], ox + l.x - s / 2, H - 140 + l.y - s / 2, s, s);
      }
    }
    if (this.belfryX !== null) {
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 4; i++) ctx.drawImage(ART.glow.red, this.belfryX + 96 + i * 30 - 6, 46 + 214, 30, 40);
    }
    if (this.boltT > 0) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(this.boltRed ? ART.glow.red : ART.glow.silver, this.boltX - 60, 0, 120, 160);
    }
    ctx.globalAlpha = 1;
  }
}
