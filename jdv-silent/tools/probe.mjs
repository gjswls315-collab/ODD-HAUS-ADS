// node tools/probe.mjs 6,12.5,...   → where the character lands in the 1440×1080 film frame; --raw saves raw 3D renders
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), REPO = path.resolve(HERE, "..");
const T = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2" };
const srv = http.createServer((q, r) => { const f = path.join(REPO, decodeURIComponent(new URL(q.url, "http://x").pathname)); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": T[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, ok));
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
pg.on("pageerror", (e) => console.log("[pageerror]", e.message));
const qi = process.argv.indexOf("--q"), Q = qi > 0 ? "?" + process.argv[qi + 1] : "";
await pg.goto(`http://localhost:${srv.address().port}/jdv-silent/index.html${Q}`);
await pg.waitForFunction(() => window.READY || window.__error, null, { timeout: 600000 });
const raw = process.argv.includes("--raw");
fs.mkdirSync(path.join(HERE, "out/raw"), { recursive: true });
for (const t of process.argv[2].split(",").map(Number)) {
  console.log(t, JSON.stringify(await pg.evaluate((tt) => window.__probe(tt), t)));
  if (raw) { const d = await pg.evaluate((tt) => window.__raw(tt), t); fs.writeFileSync(path.join(HERE, `out/raw/r${t}${Q.replace(/[?=&]/g, "_")}.jpg`), Buffer.from(d.split(",")[1], "base64")); }
}
await b.close(); srv.close();
