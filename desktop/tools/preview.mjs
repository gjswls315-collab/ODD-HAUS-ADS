// Screenshots of every window in a normal browser (with the mock bridge), for checking the art
// and for the README. Needs Playwright with its Chromium.
//   node tools/preview.mjs [out-dir] [episodes, comma separated: id or id@ms to pick the moment]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const out = path.resolve(process.argv[2] || 'preview-out');
const pack = process.env.PACK || 'chiikawa';
const episodes = (process.argv[3] || (pack === 'chiikawa' ? 'ramen@7000,weedexam@9500,chimera@6200,concert@6800,parallel@4600,momonga_stage@7600' : 'capboat@6500,peek@6000,lights@4200,mug@3600,pajama@5000,cartoon@3200,buddywalk@7000')).split(',');
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
  await page.waitForFunction(() => document.title === 'ready' || document.documentElement.dataset.ready === '1', null, { timeout: 20000 });
  if (at) await page.waitForTimeout(at);
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage, clip });
  await page.close();
  console.log('wrote', path.join(out, `${name}.png`));
}

const ids = pack === 'chiikawa' ? 'chiikawa,hachiware,usagi,momonga,kurimanju,rakko,shisa,yoroi,chimera' : 'vin,picker,aa,locke,rex';
await shot('cast', `/tools/preview/sheet.html?s=1.6&ids=${ids}`, { w: 1700, h: 1200, fullPage: true });
await shot('props', '/tools/preview/props.html', { w: 1600, h: 1300 });
await shot('desk', `/src/renderer/desk/index.html?typing=1&pack=${pack}`, { w: 300, h: 400, at: 6500 });
await shot('scene', `/tools/preview/scene.html?typing=1&ep=picnic&speed=1.5&borrow=0&pack=${pack}`, { w: 1600, h: 900, at: 9000 });
for (const tab of ['today', 'friends', 'episodes', 'alerts', 'etc']) {
  await shot(`settings-${tab}`, `/src/renderer/settings/index.html?tab=${tab}&pack=${pack}`, { w: 820, h: 720, fullPage: true });
}
await shot('summary', `/src/renderer/settings/index.html?view=summary&pack=${pack}`, { w: 600, h: 560 });
for (const item of episodes) {
  const [id, ms] = item.split('@');
  // a desk on screen lets the desk friend step out and join in
  await shot(`episode-${id}`, `/src/renderer/overlay/index.html?ep=${id}&epDelay=800&speed=2&pack=${pack}&desk=1120,320,300,400`, {
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
