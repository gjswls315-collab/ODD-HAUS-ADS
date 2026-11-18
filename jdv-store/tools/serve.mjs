// Static server for local preview. three.js loads from the jsDelivr CDN (see the
// import map in index.html); with --offline it is served from node_modules instead.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg" };

export function startServer(port = 0, { offline = false } = {}) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/") p = "/index.html";
    let file = path.join(ROOT, p);
    if (offline && p === "/index.html") {
      const html = fs.readFileSync(file, "utf8").replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\//g, "/node_modules/three/");
      res.writeHead(200, { "Content-Type": "text/html" }); res.end(html); return;
    }
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(port, () => ok(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8080);
  const offline = process.argv.includes("--offline");
  startServer(port, { offline }).then(() => console.log(`JEON DE VERO shop on http://localhost:${port}${offline ? " (offline three.js)" : ""}`));
}
