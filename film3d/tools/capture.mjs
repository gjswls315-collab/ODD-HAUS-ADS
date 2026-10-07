#!/usr/bin/env node
// Headless capture for ODD HAUS film3d (Playwright + WebGL2/SwiftShader).
//
//   node tools/capture.mjs stills  --query "mode=lineup" --times 0,2.5 --out renders/stills
//   node tools/capture.mjs video   --query "mode=shot&shot=A" --from 0 --to 6 --fps 24 --out renders/shotA.mp4
//
// The page exposes window.__ready, window.__duration and window.__renderAt(t, cam?) -> JPEG data URL.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./serve.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };

const W = Number(opt("w", 1280)), H = Number(opt("h", 720));
const query = opt("query", "mode=lineup");
const out = path.resolve(ROOT, opt("out", "renders/out"));

const server = await startServer(0);
const port = server.address().port;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) console.log(`[page ${m.type()}]`, m.text()); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
// serve the CDN import map from node_modules so capture works offline
await page.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.*)$/, async (route) => {
  const rel = route.request().url().replace(/^.*three@[^/]+\//, "");
  const file = path.join(ROOT, "node_modules/three", rel);
  if (fs.existsSync(file)) await route.fulfill({ path: file, contentType: "text/javascript" });
  else await route.abort();
});

const url = `http://localhost:${port}/index.html?capture=1&w=${W}&h=${H}&${query}`;
const t0 = Date.now();
await page.goto(url);
await page.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: 180000 });
const err = await page.evaluate(() => window.__error || null);
if (err) { console.error("page error:", err); process.exit(1); }
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

async function frame(t, cam) {
  const data = await page.evaluate(([tt, c]) => window.__renderAt(tt, c), [t, cam || null]);
  return Buffer.from(data.split(",")[1], "base64");
}

if (cmd === "stills") {
  fs.mkdirSync(out, { recursive: true });
  const times = opt("times", "0").split(",").map(Number);
  const cams = opt("cams") ? JSON.parse(opt("cams")) : [null];
  const prefix = opt("prefix", "still");
  for (const [ci, cam] of cams.entries()) {
    for (const t of times) {
      const s = Date.now();
      const buf = await frame(t, cam);
      const f = path.join(out, `${prefix}${cams.length > 1 ? `_c${ci}` : ""}_t${t.toFixed(2)}.jpg`);
      fs.writeFileSync(f, buf);
      console.log(`${f}  (${((Date.now() - s) / 1000).toFixed(2)}s)`);
    }
  }
} else if (cmd === "video") {
  const fps = Number(opt("fps", 24));
  const from = Number(opt("from", 0));
  const dur = await page.evaluate(() => window.__duration || 0);
  const to = Number(opt("to", dur || 5));
  const n = Math.round((to - from) * fps);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", opt("crf", "18"), "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
  const s0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await frame(from + i / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 24 === 0) console.log(`frame ${i}/${n}  ${(((Date.now() - s0) / 1000) / (i + 1)).toFixed(2)}s/frame`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log("wrote", out);
}

await browser.close();
server.close();
