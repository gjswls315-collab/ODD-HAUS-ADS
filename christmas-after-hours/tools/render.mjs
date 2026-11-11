#!/usr/bin/env node
// Headless, frame-accurate renderer (Playwright + Chromium). Because the film is a pure function
// of time, frames are stepped one by one - the result is identical on a fast or a slow machine.
//
//   node tools/render.mjs check                       camera-path + console-error check
//   node tools/render.mjs stills [--times 1,6,12]     JPEG stills + a contact sheet
//   node tools/render.mjs wav    [--out renders/film.wav]   soundtrack only (OfflineAudioContext)
//   node tools/render.mjs video  [--fps 24 --w 1280 --h 720 --from 0 --to 40 --out renders/film.mp4]
//
// Needs a production build (npm run build) and ffmpeg on the PATH for `video`.
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const cmd = args[0] || 'check';
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const W = Number(opt('w', 1280)), H = Number(opt('h', 720));

if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error('dist/ not found - run `npm run build` first.'); process.exit(1); }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer((req, res) => {
  const p = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const f = fs.existsSync(p) && fs.statSync(p).isFile() ? p : null;
  if (!f) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const launch = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] };
let browser;
try { browser = await chromium.launch(launch); }
catch { browser = await chromium.launch({ ...launch, executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' }); }
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const problems = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) { problems.push(`[${m.type()}] ${m.text()}`); console.log(`[page ${m.type()}]`, m.text()); } });
page.on('pageerror', (e) => { problems.push(`[pageerror] ${e.message}`); console.log('[pageerror]', e.message); });

const t0 = Date.now();
await page.goto(`http://localhost:${port}/index.html?capture=1&w=${W}&h=${H}&q=${opt('q', 0)}`);
await page.waitForFunction(() => window.__film, null, { timeout: 240000 });
const film = await page.evaluate(() => ({ ready: window.__film.ready, error: window.__film.error, collisions: window.__film.collisions, character: window.__film.character, shots: window.__film.shots }));
if (!film.ready) { console.error('film failed to start:\n' + film.error); await browser.close(); server.close(); process.exit(1); }
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)}s · character artwork: ${film.character ? 'loaded' : 'MISSING'} · ${film.shots.length} set-ups`);

async function still(t, file, type = 'jpeg') {
  await page.evaluate((tt) => window.__film.renderAt(tt), t);
  const data = await page.evaluate(([ty]) => document.getElementById('film').toDataURL(`image/${ty}`, 0.93), [type]);
  fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
}

let code = 0;
if (cmd === 'check') {
  await still(12, path.join(ROOT, 'renders', '_check.jpg')).catch((e) => problems.push(String(e)));
  console.log(JSON.stringify(await page.evaluate(() => window.__film.info())));
  console.log('build ms', JSON.stringify(await page.evaluate(() => window.__timing)));
  console.log(film.collisions.length ? 'camera collisions:\n  ' + film.collisions.join('\n  ') : 'camera paths: clear of all set geometry');
  console.log(problems.length ? `${problems.length} console problem(s)` : 'console: clean');
  code = film.collisions.length || problems.some((p) => !p.startsWith('[warning]')) ? 1 : 0;
} else if (cmd === 'stills') {
  const out = path.resolve(ROOT, opt('out', 'renders/stills'));
  fs.mkdirSync(out, { recursive: true });
  const times = opt('times') ? opt('times').split(',').map(Number) : film.shots.map((s) => s.t + (s.end - s.t) * 0.55);
  const files = [];
  for (const t of times) { const f = path.join(out, `t${t.toFixed(2).padStart(5, '0')}.jpg`); const s = Date.now(); await still(t, f); files.push(f); console.log(`${path.basename(f)}  ${Date.now() - s} ms`); }
  if (!opt('nosheet')) {
    const cols = Number(opt('cols', 4)), rows = Math.ceil(files.length / cols), tw = Number(opt('tw', 640));
    const list = path.join(out, '_list.txt'); fs.writeFileSync(list, files.map((f) => `file '${f}'\nduration 1`).join('\n'));
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', `scale=${tw}:-1,tile=${cols}x${rows}:padding=4:color=black`, '-frames:v', '1', '-q:v', '3', path.join(out, '_sheet.jpg')]);
    fs.rmSync(list); if (r.status === 0) console.log('contact sheet: ' + path.join(out, '_sheet.jpg'));
  }
} else if (cmd === 'video') {
  const fps = Number(opt('fps', 24)), from = Number(opt('from', 0)), to = Number(opt('to', 40));
  const out = path.resolve(ROOT, opt('out', 'renders/odd-haus-christmas-after-hours.mp4'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const wav = out.replace(/\.mp4$/, '.wav');
  console.log('rendering soundtrack (OfflineAudioContext)…');
  fs.writeFileSync(wav, Buffer.from(await page.evaluate(() => window.__film.wavBase64()), 'base64'));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-ss', String(from), '-t', String(to - from), '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(opt('crf', 17)), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((to - from) * fps), s = Date.now();
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    await page.evaluate((tt) => window.__film.renderAt(tt), t);
    const data = await page.evaluate(() => document.getElementById('film').toDataURL('image/jpeg', 0.95));
    if (!ff.stdin.write(Buffer.from(data.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % fps === 0) console.log(`  ${t.toFixed(1)}s / ${to}s   (${((Date.now() - s) / 1000 / (i + 1)).toFixed(2)} s/frame)`);
  }
  ff.stdin.end();
  code = await new Promise((r) => ff.on('close', r));
  if (!opt('keepwav')) fs.rmSync(wav, { force: true });
  console.log(code === 0 ? `wrote ${out}` : 'ffmpeg failed');
} else if (cmd === 'wav') {
  const out = path.resolve(ROOT, opt('out', 'renders/odd-haus-christmas-after-hours.wav'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(await page.evaluate(() => window.__film.wavBase64()), 'base64'));
  console.log(`wrote ${out}`);
} else {
  console.log(`unknown command: ${cmd}`); code = 1;
}
await browser.close(); server.close(); process.exit(code);
