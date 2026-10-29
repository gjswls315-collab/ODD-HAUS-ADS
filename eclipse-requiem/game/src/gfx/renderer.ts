import { C, H, UW, W } from '../core/constants';
import { Ctx, makeCanvas } from './canvas';

/**
 * Two-layer renderer (docs/06 §4-1):
 *  - world: 640x360 pixel-art canvas, blitted with nearest-neighbour at an integer scale when possible
 *  - screen: full-resolution backing canvas; the pixel UI is drawn on it in the same 640x360 logical grid
 *    (`logical()`), or in 1920x1080 design units (`uiTransform()`, 3 design px = 1 logical px)
 */
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: Ctx;
  readonly world: HTMLCanvasElement;
  readonly wctx: Ctx;
  k = 3; // backing px per logical px
  vx = 0;
  vy = 0;
  vw = W * 3;
  vh = H * 3;
  bw = 0;
  bh = 0;
  integerPref = true;
  shakeX = 0;
  shakeY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    [this.world, this.wctx] = makeCanvas(W, H);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    // size to the canvas's container (the whole window in the standalone build)
    const host = this.canvas.parentElement;
    const cw = Math.max(1, host && host !== document.body ? host.clientWidth : window.innerWidth);
    const ch = Math.max(1, host && host !== document.body ? host.clientHeight : window.innerHeight);
    this.bw = Math.max(320, Math.floor(cw * dpr));
    this.bh = Math.max(180, Math.floor(ch * dpr));
    this.canvas.width = this.bw;
    this.canvas.height = this.bh;
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    const fit = Math.min(this.bw / W, this.bh / H);
    const ki = Math.floor(fit);
    // Integer scale keeps pixels perfectly square; fall back to a fractional fit when it would waste >15% of the window.
    this.k = this.integerPref && ki >= 1 && ki / fit >= 0.85 ? ki : fit;
    this.vw = Math.round(W * this.k);
    this.vh = Math.round(H * this.k);
    this.vx = Math.floor((this.bw - this.vw) / 2);
    this.vy = Math.floor((this.bh - this.vh) / 2);
    this.ctx.imageSmoothingEnabled = false;
  }

  /** UI design px -> backing px scale. */
  get s() {
    return this.vw / UW;
  }

  beginFrame() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = C.letterbox;
    ctx.fillRect(0, 0, this.bw, this.bh);
  }

  presentWorld() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.vx, this.vy, this.vw, this.vh);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    const sx = Math.round(this.shakeX) * this.k, sy = Math.round(this.shakeY) * this.k;
    ctx.drawImage(this.world, this.vx + sx, this.vy + sy, this.vw, this.vh);
    ctx.restore();
  }

  /** Transform for drawing in world logical coordinates on the high-res screen (glow pass). */
  worldTransform() {
    const sx = Math.round(this.shakeX) * this.k, sy = Math.round(this.shakeY) * this.k;
    this.ctx.setTransform(this.k, 0, 0, this.k, this.vx + sx, this.vy + sy);
  }

  /** Transform for drawing in 640x360 logical coordinates on the screen canvas (pixel UI, no shake). */
  logical() {
    this.ctx.setTransform(this.k, 0, 0, this.k, this.vx, this.vy);
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Transform for drawing in 1920x1080 UI design coordinates. */
  uiTransform() {
    const s = this.s;
    this.ctx.setTransform(s, 0, 0, s, this.vx, this.vy);
  }

  clipView() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.rect(this.vx, this.vy, this.vw, this.vh);
    ctx.clip();
  }

  uiToScreenX(x: number) {
    return this.vx + x * this.s;
  }
  uiToScreenY(y: number) {
    return this.vy + y * this.s;
  }
}
