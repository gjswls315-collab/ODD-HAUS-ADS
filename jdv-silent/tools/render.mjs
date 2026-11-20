#!/usr/bin/env node
// Frame-by-frame capture of index.html (window.render(t)) in headless Chromium.
//   node tools/render.mjs stills 4.6,10.2,16.8 [--out out/stills] [--q 1]
//   node tools/render.mjs frames [--workers 3] [--from 0 --to 47.6]   → out/frames/00000.jpg …
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(HERE, "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg" };

function serve() {
  const srv = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const f = path.join(REPO, p);
    if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, () => ok(srv)));
}

async function openPage(port, q) {
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("[console]", m.text()); });
  await page.goto(`http://localhost:${port}/jdv-silent/index.html?q=${q}`);
  await page.waitForFunction(() => window.READY || window.__error, null, { timeout: 600000 });
  const err = await page.evaluate(() => window.__error || null);
  if (err) throw new Error(err);
  return { browser, page };
}

async function grab(page, t) {
  const data = await page.evaluate((tt) => { window.render(tt); return window.frameJPEG(0.92); }, t);
  return Buffer.from(data.split(",")[1], "base64");
}

const srv = await serve();
const port = srv.address().port;
const q = opt("q", "1");
const cmd = args[0];
if (cmd === "stills") {
  const out = path.resolve(HERE, opt("out", "out/stills"));
  fs.mkdirSync(out, { recursive: true });
  const { browser, page } = await openPage(port, q);
  for (const t of args[1].split(",").map(Number)) {
    const s = Date.now();
    // render a few preceding frames so cached state (hatch boil) matches a real run
    fs.writeFileSync(path.join(out, `t${t.toFixed(2).padStart(6, "0")}.jpg`), await grab(page, t));
    console.log(`t=${t}  ${((Date.now() - s) / 1000).toFixed(1)}s`);
  }
  await browser.close();
} else if (cmd === "frames") {
  const out = path.resolve(HERE, "out/frames");
  fs.mkdirSync(out, { recursive: true });
  const fps = 24, from = Number(opt("from", 0)), dur = JSON.parse(fs.readFileSync(path.join(HERE, "timeline.json"))).dur;
  const to = Number(opt("to", dur));
  const all = []; for (let f = Math.round(from * fps); f < Math.round(to * fps); f++) all.push(f);
  const todo = all.filter((f) => !fs.existsSync(path.join(out, `${String(f).padStart(5, "0")}.jpg`)));
  const workers = Number(opt("workers", 3));
  const chunk = Math.ceil(todo.length / workers);
  console.log(`${todo.length} of ${all.length} frames to render with ${workers} workers`);
  const t0 = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const mine = todo.slice(w * chunk, (w + 1) * chunk);
    if (!mine.length) return;
    const { browser, page } = await openPage(port, q);
    for (const f of mine) {
      fs.writeFileSync(path.join(out, `${String(f).padStart(5, "0")}.jpg`), await grab(page, f / fps));
      if (++done % 24 === 0) console.log(`${done}/${todo.length}  ${((Date.now() - t0) / 1000 / done).toFixed(2)} s/frame avg`);
    }
    await browser.close();
  }));
  console.log(`done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
srv.close();
