// Screenshot helper for reviewing the game in headless Chromium.
// usage: node scripts/shot.mjs <url> <out.png> [waitMs] [width] [height] [jsBeforeShot]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [url, out, wait = '1500', w = '1920', h = '1080', js = ''] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url);
await page.waitForTimeout(+wait);
if (js) { await page.evaluate(js); await page.waitForTimeout(400); }
await page.screenshot({ path: out });
await browser.close();
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
else console.log('ok', out);
