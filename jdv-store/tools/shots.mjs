#!/usr/bin/env node
// Headless screenshots for review (Chromium + SwiftShader, no GPU needed).
//   node tools/shots.mjs [outDir] [--w 1280 --h 720] [--only name,name]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./serve.mjs";

const { chromium } = createRequire(import.meta.url)("playwright"); // pre-installed globally

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const out = path.resolve(ROOT, args[0] && !args[0].startsWith("--") ? args[0] : "shots");
const W = Number(opt("w", 1280)), H = Number(opt("h", 720));
const only = opt("only", "") ? opt("only").split(",") : null;

export const VIEWS = {
  spawn: [0.82, 3.42, 0.64, -0.07],
  records: [-1.7, 2.2, 1.25, -0.12],
  mural: [-1.2, 0.4, 1.57, 0.08],
  turntable: [-2.4, -0.5, 1.45, -0.42],
  pegboard: [-2.0, -1.0, 2.1, -0.05],
  backleft: [-0.6, 1.6, 0.35, -0.02],
  shelf: [1.2, -1.2, -0.35, 0.02],
  bar: [0.2, 1.9, -1.35, -0.12],
  table: [-0.9, 2.4, 0.0, -0.45],
  front: [0.2, -2.6, 3.14, -0.02],
  doors: [-0.9, -2.2, 0.0, 0.0],
  terrace: [-0.9, -5.0, 0.0, 0.0],
  terraceBack: [1.8, -8.0, 2.75, 0.02],
  terraceSide: [-2.6, -7.8, -0.9, 0.0],
  figbox: [1.9, -2.6, 0.2, 0.32],
  mini_classic: [-2.3, 3.2, 1.5708, 0.02],
  mini_midnight: [1.1, -0.95, 0.15, -0.28],
  mini_burgundy: [-0.85, 3.0, 0.0, -0.5],
  mini_forest: [1.35, 1.35, -1.5708, 0.24],
  mini_gold: [-2.9, -7.6, 1.5708, -0.38],
};
// extra actions after positioning: [interact?, label]
const ACTIONS = { inspect: [2.42, -2.85, 0.0, 0.5] };

const server = await startServer(0, { offline: true });
const port = server.address().port;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const logs = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
await page.goto(`http://localhost:${port}/index.html?shot=1`);
await page.waitForFunction(() => (window.__jdv && window.__jdv.ready) || window.__jdvError, null, { timeout: 300000 });
const err = await page.evaluate(() => window.__jdvError || null);
if (err) { console.error("page error:", err); console.log(logs.join("\n")); process.exit(1); }
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
fs.mkdirSync(out, { recursive: true });
for (const [name, v] of Object.entries(VIEWS)) {
  if (only && !only.includes(name)) continue;
  const s = Date.now();
  const info = await page.evaluate(([v, name]) => {
    window.__jdv.view(...v);
    if (name.startsWith("terrace") || name === "doors") window.__jdv.step(12, 0.16); else window.__jdv.step(3);
    return window.__jdv.info();
  }, [v, name]);
  await page.screenshot({ path: path.join(out, `${name}.jpg`), quality: 88, timeout: 300000 });
  console.log(`${name}.jpg  ${((Date.now() - s) / 1000).toFixed(1)}s  calls=${info.calls} tris=${info.triangles}`);
}
if (!only || only.includes("inspect")) {
  await page.evaluate((v) => { window.__jdv.view(...v); window.__jdv.step(2); return window.__jdv.interact(); }, ACTIONS.inspect).then((n) => console.log("interacted:", n));
  await page.evaluate(() => window.__jdv.step(12, 0.05));
  await page.screenshot({ path: path.join(out, "inspect.jpg"), quality: 88, timeout: 300000 });
  await page.evaluate(() => window.__jdv.closeInspect());
}
if (!only || only.includes("crate")) {
  const r = await page.evaluate(() => { window.__jdv.view(-2.2, 1.46, 1.57, -0.5); window.__jdv.step(2); const a = []; for (let i = 0; i < 4; i++) { a.push(window.__jdv.interact()); window.__jdv.step(4, 0.05); } return a; });
  console.log("crate:", r);
  await page.evaluate(() => window.__jdv.step(10, 0.05));
  await page.screenshot({ path: path.join(out, "crate.jpg"), quality: 88, timeout: 300000 });
}
if (!only || only.includes("audio")) {
  const res = await page.evaluate(async () => {
    const J = window.__jdv, g = J.game, out = [];
    try {
      g.audio.init();
      J.view(-2.4, -0.4, 1.57, -0.45); J.step(2); out.push("aim turntable: " + J.pick()); out.push("use: " + J.interact()); J.step(10, 0.1);
      g.audio.footstep("floor"); g.audio.footstep("deck"); g.audio.flip({ x: 0, y: 1, z: 0 }); g.audio.chime(true); g.audio.click(null);
      J.view(2.2, 2.45, -1.5708, -0.35); J.step(2); out.push("aim espresso: " + J.pick()); out.push("use: " + J.interact()); J.step(10, 0.2);
      J.view(-2.5, 3.3, 1.5708, 0.3); J.step(2); out.push("aim mini: " + J.pick()); out.push("use: " + J.interact()); J.step(12, 0.1);
      out.push("audio state: " + g.audio.ctx.state + ", music=" + g.audio.music);
      g.audio.setMusic(false, { x: 0, y: 1, z: 0 });
    } catch (e) { out.push("ERROR " + e.message + " " + e.stack); }
    return out;
  });
  console.log(res.join("\n"));
}
if (!only || only.includes("map")) {
  await page.evaluate(() => { window.__jdv.view(-0.5, -1.0, 0.8, 0); window.__jdv.step(1); });
  await page.keyboard.press("KeyM");
  await page.evaluate(() => window.__jdv.step(2));
  await page.screenshot({ path: path.join(out, "map.jpg"), quality: 88, timeout: 300000 });
  await page.keyboard.press("KeyM");
}
if (!only || only.includes("title")) {
  const p2 = await browser.newPage({ viewport: { width: W, height: H } });
  await p2.goto(`http://localhost:${port}/index.html`);
  await p2.waitForFunction(() => window.__jdv && window.__jdv.ready, null, { timeout: 300000 });
  await p2.waitForTimeout(4000);
  await p2.screenshot({ path: path.join(out, "title.jpg"), quality: 88, timeout: 300000 });
  await p2.close();
}
if (logs.length) console.log(logs.slice(0, 30).join("\n"));
await browser.close();
server.close();
