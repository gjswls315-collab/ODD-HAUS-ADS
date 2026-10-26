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
  await import('/src/renderer/shared/chiikawa.js');
  const make = (size, paint) => {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    paint(c.getContext('2d'), size);
    return c.toDataURL('image/png');
  };
  // Chiikawa's face filling the square: the colour tray icon
  const faceIcon = (ctx, size) => {
    const s = size / 52;
    ctx.translate(size / 2, size / 2 + 26 * s);
    ctx.scale(s, s);
    drawFriend(ctx, 'chiikawa', { pose: 'stand', seed: 9, look: [0, 0] }, 0.5);
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
      ctx.translate(size / 2 - 70, size - 60);
      ctx.scale(5.2, 5.2);
      drawFriend(ctx, 'hachiware', { pose: 'stand', seed: 4, look: [0.3, 0] }, 0.35);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(size / 2 + 60, size - 50);
      ctx.scale(5.6, 5.6);
      drawFriend(ctx, 'chiikawa', { pose: 'wave', seed: 9, look: [-0.2, 0] }, 0.35);
      ctx.restore();
      void fillStroke;
    }),
    'tray.png': make(32, faceIcon),
    'tray@2x.png': make(64, faceIcon),
    // macOS menu bar: a black template image (a round head with ears, eyes cut out)
    'trayTemplate.png': make(18, (ctx, size) => {
      const r = size * 0.4;
      ctx.fillStyle = '#000';
      for (const dx of [-0.27, 0.27]) {
        ellipse(ctx, size / 2 + dx * size, size * 0.22, size * 0.14, size * 0.14);
        ctx.fill();
      }
      ellipse(ctx, size / 2, size * 0.56, r, r * 0.92);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      for (const dx of [-0.17, 0.17]) {
        ellipse(ctx, size / 2 + dx * size * 0.8, size * 0.55, size * 0.07, size * 0.09);
        ctx.fill();
      }
      ellipse(ctx, size / 2, size * 0.7, size * 0.07, size * 0.05);
      ctx.fill();
    }),
    'trayTemplate@2x.png': make(36, (ctx, size) => {
      const r = size * 0.4;
      ctx.fillStyle = '#000';
      for (const dx of [-0.27, 0.27]) {
        ellipse(ctx, size / 2 + dx * size, size * 0.22, size * 0.14, size * 0.14);
        ctx.fill();
      }
      ellipse(ctx, size / 2, size * 0.56, r, r * 0.92);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      for (const dx of [-0.17, 0.17]) {
        ellipse(ctx, size / 2 + dx * size * 0.8, size * 0.55, size * 0.07, size * 0.09);
        ctx.fill();
      }
      ellipse(ctx, size / 2, size * 0.7, size * 0.07, size * 0.05);
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
