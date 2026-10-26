// Renders the app and tray icons from the same drawing code the app uses (needs Playwright).
//   node tools/make-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets');

const server = await serve(0);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/tools/preview/blank.html`);

const icons = await page.evaluate(async () => {
  const { drawFriend, ellipse, fillStroke, INK } = await import('/src/renderer/shared/draw.js');
  const make = (size, paint) => {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    paint(c.getContext('2d'), size);
    return c.toDataURL('image/png');
  };
  // Vin's face filling a circle: used for the colour tray icon
  const vinHead = (ctx, size) => {
    const s = size / 50;
    ctx.translate(size / 2, size / 2 + 38 * s);
    ctx.scale(s, s);
    drawFriend(ctx, 'vin', { pose: 'stand', seed: 9, look: [0, 0] }, 0.5);
  };
  return {
    'icon.png': make(512, (ctx, size) => {
      ctx.beginPath();
      ctx.roundRect(24, 24, size - 48, size - 48, 110);
      ctx.fillStyle = '#ffe9ed';
      ctx.fill();
      ctx.lineWidth = 18;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(24, 24, size - 48, size - 48, 110);
      ctx.clip();
      ellipse(ctx, size / 2, size - 40, 190, 50);
      ctx.fillStyle = '#ffd3dc';
      ctx.fill();
      ctx.translate(size / 2, size - 52);
      ctx.scale(5.3, 5.3);
      drawFriend(ctx, 'vin', { pose: 'wave', seed: 9, look: [0.2, 0] }, 0.35);
      ctx.restore();
      void fillStroke;
    }),
    'tray.png': make(32, vinHead),
    'tray@2x.png': make(64, vinHead),
    // macOS menu bar: a black template image (the record with two eye holes)
    'trayTemplate.png': make(18, (ctx, size) => {
      const r = size * 0.44;
      ellipse(ctx, size / 2, size / 2, r, r);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      for (const dx of [-0.17, 0.17]) {
        ellipse(ctx, size / 2 + dx * size, size * 0.42, size * 0.09, size * 0.12);
        ctx.fill();
      }
      ellipse(ctx, size / 2, size * 0.66, size * 0.12, size * 0.09);
      ctx.fill();
    }),
    'trayTemplate@2x.png': make(36, (ctx, size) => {
      const r = size * 0.44;
      ellipse(ctx, size / 2, size / 2, r, r);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      for (const dx of [-0.17, 0.17]) {
        ellipse(ctx, size / 2 + dx * size, size * 0.42, size * 0.09, size * 0.12);
        ctx.fill();
      }
      ellipse(ctx, size / 2, size * 0.66, size * 0.12, size * 0.09);
      ctx.fill();
    }),
  };
});

fs.mkdirSync(OUT, { recursive: true });
for (const [name, url] of Object.entries(icons)) {
  fs.writeFileSync(path.join(OUT, name), Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', path.join('assets', name));
}
await browser.close();
server.close();
