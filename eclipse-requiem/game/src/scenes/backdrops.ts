import { H, W } from '../core/constants';
import { fxRng as R } from '../core/math';
import { Ctx } from '../gfx/canvas';
import { makeBelfry, makeFar, makeFogBlob, makeForeground, makeMid, makeMoon, makeSky } from '../gfx/art/backdrop';

// Shared menu backdrop: blood eclipse over a ruined cathedral (docs/03 §1). Drawn at 640x360 logical px.

let A: {
  sky: HTMLCanvasElement; moon: HTMLCanvasElement; far: HTMLCanvasElement; mid: HTMLCanvasElement; belfry: HTMLCanvasElement;
  fog: HTMLCanvasElement[]; fg: { top: HTMLCanvasElement; bot: HTMLCanvasElement };
} | null = null;

function assets() {
  if (!A) A = { sky: makeSky(5), moon: makeMoon(70, 3), far: makeFar(77), mid: makeMid(91), belfry: makeBelfry(), fog: [makeFogBlob(260, 70), makeFogBlob(220, 60, '#1E1A26')], fg: makeForeground(13) };
  return A;
}

export class MenuBackdrop {
  t = 0;
  ash: { x: number; y: number; vx: number; vy: number }[] = [];
  crows: { x: number; y: number; vx: number; ph: number }[] = [];
  private nextCrows = 3;
  moonX = 572;
  moonY = 70;
  constructor(public showCathedral = true) {
    for (let i = 0; i < 50; i++) this.ash.push({ x: R.range(0, W), y: R.range(0, H), vx: -R.range(3, 9), vy: R.range(2, 7) });
  }
  update(dt: number) {
    this.t += dt;
    for (const a of this.ash) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.y > H || a.x < 0) {
        a.x = R.range(300, W + 20);
        a.y = R.range(-20, 120);
      }
    }
    this.nextCrows -= dt;
    if (this.nextCrows <= 0) {
      this.nextCrows = 12;
      const y = R.range(60, 130);
      for (let i = 0; i < 7; i++) this.crows.push({ x: W + 10 + i * 9 + R.range(0, 6), y: y + Math.abs(i - 3) * 4 + R.range(-2, 2), vx: -R.range(36, 44), ph: R.range(0, 6) });
    }
    for (const c of this.crows) c.x += c.vx * dt;
    this.crows = this.crows.filter((c) => c.x > -20);
  }
  draw(g: Ctx, opts: { tint?: string; tintA?: number } = {}) {
    const a = assets();
    g.drawImage(a.sky, 0, 0);
    const pulse = Math.round(Math.sin(this.t * (Math.PI * 2 / 8)) * 1);
    g.drawImage(a.moon, Math.round(this.moonX - a.moon.width / 2), Math.round(this.moonY - a.moon.height / 2) + pulse * 0);
    for (const c of this.crows) {
      const f = Math.sin(this.t * 10 + c.ph) > 0;
      g.fillStyle = '#050508';
      g.fillRect(Math.round(c.x), Math.round(c.y), 2, 1);
      g.fillRect(Math.round(c.x) - 2, Math.round(c.y) + (f ? -1 : 1), 2, 1);
      g.fillRect(Math.round(c.x) + 2, Math.round(c.y) + (f ? -1 : 1), 2, 1);
    }
    const drift = this.t * 4;
    loop(g, a.far, drift * 0.3, 140);
    if (this.showCathedral) g.drawImage(a.belfry, 430, 60);
    loop(g, a.mid, drift * 0.6 + 400, 120);
    if (opts.tint) {
      g.globalAlpha = opts.tintA ?? 0.15;
      g.fillStyle = opts.tint;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    // fog banks
    for (let i = 0; i < 4; i++) {
      const f = a.fog[i % 2];
      const x = ((-(drift * (1 + i * 0.4)) % (W + f.width)) + W + f.width) % (W + f.width) - f.width;
      g.globalAlpha = 0.5;
      g.drawImage(f, Math.round(x), H - 70 - (i % 2) * 34);
      g.globalAlpha = 1;
    }
    for (const p of this.ash) {
      g.fillStyle = '#6E6A66';
      g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    loop(g, a.fg.bot, drift * 1.6, H - 36);
  }
  drawGlow(ctx: Ctx, glow: HTMLCanvasElement) {
    ctx.globalAlpha = 0.55;
    ctx.drawImage(glow, this.moonX - 150, this.moonY - 150, 300, 300);
    ctx.globalAlpha = 0.25;
    ctx.drawImage(glow, this.moonX - 280, this.moonY - 280, 560, 560);
    ctx.globalAlpha = 1;
  }
}

function loop(g: Ctx, img: HTMLCanvasElement, off: number, y: number) {
  const w = img.width;
  let x = Math.round(-((off % w) + w) % w);
  for (; x < W; x += w) g.drawImage(img, x, y);
}
