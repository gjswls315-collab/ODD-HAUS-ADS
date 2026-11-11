#!/usr/bin/env node
// Drives the real player UI in headless Chromium: transport, clock accuracy, seek, mute, audio
// context, responsive layout. Needs `npm run build` first.   node tools/ui-test.mjs [--shots dir]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const shots = args.includes('--shots') ? path.resolve(args[args.indexOf('--shots') + 1]) : null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const p = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!fs.existsSync(p) || !fs.statSync(p).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/index.html?q=2`;
const launch = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
let browser;
try { browser = await chromium.launch(launch); } catch { browser = await chromium.launch({ ...launch, executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' }); }

const results = []; let failed = 0;
const ok = (name, cond, detail = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); if (!cond) failed++; };
const errors = [];

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => window.__film && window.__film.ready, null, { timeout: 240000 });
// read the film clock itself (not the last drawn frame: software GL here draws ~1 frame a second)
const st = () => page.evaluate(() => ({ t: window.__film.clock(), playing: window.__film.state.playing, ended: window.__film.state.ended }));
const box = await page.locator('#stage').boundingBox();
ok('stage is 16:9', Math.abs(box.width / box.height - 16 / 9) < 0.01, `${Math.round(box.width)}x${Math.round(box.height)}`);
ok('start button enabled', await page.locator('#start').isEnabled());
if (shots) { fs.mkdirSync(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, 'ui-desktop-start.png') }); }

await page.click('#start');
await page.waitForFunction(() => window.__film.state.playing, null, { timeout: 20000 });
const a = await st(); const w0 = Date.now();
await page.waitForTimeout(3000);
const b = await st(); const wall = (Date.now() - w0) / 1000;
ok('plays after pressing Play film', b.playing && b.t > a.t);
ok('clock follows real time', Math.abs((b.t - a.t) - wall) < 0.15, `film ${(b.t - a.t).toFixed(2)}s vs wall ${wall.toFixed(2)}s`);
ok('time readout updates', /^00:0[1-5]\.\d \/ 00:40\.0$/.test(await page.locator('#time').textContent()), await page.locator('#time').textContent());
const au = await page.evaluate(() => window.__film.audio());
ok('audio context running with a scheduled score', au.state === 'running' && au.scheduled, JSON.stringify(au));

await page.click('#play');
const p1 = await st(); await page.waitForTimeout(700); const p2 = await st();
ok('pause holds the frame', !p1.playing && Math.abs(p2.t - p1.t) < 1e-6, `t=${p1.t.toFixed(2)}`);
await page.click('#play'); await page.waitForFunction(() => window.__film.state.playing, null, { timeout: 20000 }); await page.waitForTimeout(500);
const r1 = await st();
ok('resume continues from the same time', r1.t > p1.t && r1.t < p1.t + 1.5, `t=${r1.t.toFixed(2)}`);

await page.evaluate(() => { const s = document.getElementById('seek'); s.value = '24'; s.dispatchEvent(new Event('input', { bubbles: true })); });
await page.waitForFunction(() => window.__film.state.playing, null, { timeout: 20000 }); await page.waitForTimeout(300);
const s1 = await st();
ok('seek jumps and keeps playing', s1.playing && s1.t >= 24 && s1.t < 25.5, `t=${s1.t.toFixed(2)}`);
ok('shot label follows the timeline', /mascot/.test(await page.locator('#shot').textContent()), await page.locator('#shot').textContent());
if (shots) await page.screenshot({ path: path.join(shots, 'ui-desktop-playing.png') });

await page.click('#mute');
ok('mute toggles', (await page.locator('#mute').getAttribute('aria-pressed')) === 'true' && (await page.locator('#mute').textContent()) === 'Unmute');
await page.click('#mute');
await page.click('#restart'); await page.waitForFunction(() => window.__film.state.playing && window.__film.state.t < 5, null, { timeout: 20000 }); await page.waitForTimeout(200);
ok('restart returns to the top', (await st()).t < 1.2, `t=${(await st()).t.toFixed(2)}`);

await page.evaluate(() => window.__film.seek(39.2)); await page.waitForFunction(() => window.__film.state.ended, null, { timeout: 30000 });
const e = await st();
ok('stops exactly at 40 s', !e.playing && e.ended && Math.abs(e.t - 40) < 1e-6, `t=${e.t}`);
ok('offers Replay at the end', (await page.locator('#play').textContent()) === 'Replay');

// determinism: the same film time gives the same pixels
const hash = async (t) => page.evaluate((tt) => { window.__film.renderAt(tt); const c = document.getElementById('film'); const x = document.createElement('canvas'); x.width = 64; x.height = 36; const g = x.getContext('2d'); g.drawImage(c, 0, 0, 64, 36); const d = g.getImageData(0, 0, 64, 36).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) >>> 0; return h; }, t);
const h1 = await hash(17.5); await hash(3); const h2 = await hash(17.5);
ok('frame at a given time is deterministic', h1 === h2, `${h1} / ${h2}`);

// phone portrait
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
const mb = await page.locator('#stage').boundingBox();
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
ok('phone: stage fits and stays 16:9', mb.width <= 390 && Math.abs(mb.width / mb.height - 16 / 9) < 0.02, `${Math.round(mb.width)}x${Math.round(mb.height)}`);
ok('phone: no horizontal overflow', !overflow);
ok('phone: transport buttons visible', await page.locator('#play').isVisible() && await page.locator('#restart').isVisible() && await page.locator('#mute').isVisible());
if (shots) await page.screenshot({ path: path.join(shots, 'ui-phone.png') });

ok('no console or page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
console.log(results.join('\n'));
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
await browser.close(); server.close(); process.exit(failed ? 1 : 0);
