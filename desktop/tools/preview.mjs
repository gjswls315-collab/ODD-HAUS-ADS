// Screenshots of every window in a normal browser (with the mock bridge), for checking the art
// and for the README. Needs Playwright with its Chromium.
//   node tools/preview.mjs [out-dir] [episodes, comma separated: id or id@ms to pick the moment]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const out = path.resolve(process.argv[2] || 'preview-out');
const episodes = (process.argv[3] || 'capboat@6500,peek@6000,lights@4200,mug@3600,pajama@5000,cartoon@3200,buddywalk@7000').split(',');
fs.mkdirSync(out, { recursive: true });

const server = await serve(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const problems = [];

async function shot(name, url, { w, h, at = 0, fullPage = false, clip } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => problems.push(`${name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && problems.push(`${name}: ${m.text()}`));
  await page.goto(base + url);
  await page.waitForFunction(() => document.title === 'ready', null, { timeout: 20000 });
  if (at) await page.waitForTimeout(at);
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage, clip });
  await page.close();
  console.log('wrote', path.join(out, `${name}.png`));
}

await shot('cast', '/tools/preview/sheet.html?s=1.6', { w: 1700, h: 1200, fullPage: true });
await shot('props', '/tools/preview/props.html', { w: 1600, h: 1300 });
await shot('desk', '/src/renderer/desk/index.html?typing=1', { w: 300, h: 400, at: 6500 });
await shot('scene', '/tools/preview/scene.html?typing=1&ep=picnic&speed=1.5', { w: 1600, h: 900, at: 13000 });
for (const tab of ['today', 'friends', 'episodes', 'alerts', 'etc']) {
  await shot(`settings-${tab}`, `/src/renderer/settings/index.html?tab=${tab}`, { w: 820, h: 720, fullPage: true });
}
await shot('summary', '/src/renderer/settings/index.html?view=summary', { w: 600, h: 560 });
for (const item of episodes) {
  const [id, ms] = item.split('@');
  await shot(`episode-${id}`, `/src/renderer/overlay/index.html?ep=${id}&speed=2&wanderers=vin,picker,aa,locke,rex`, {
    w: 1440,
    h: 720,
    at: Number(ms) || 7000,
  });
}

await browser.close();
server.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
