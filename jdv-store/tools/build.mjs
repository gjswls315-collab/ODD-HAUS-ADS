#!/usr/bin/env node
// Bundles src/ into single-file pages (three.js still loads from the jsDelivr CDN):
//   dist/jdv-store.html      full standalone page (open directly in a browser)
//   dist/artifact.html       body-only page for publishing as a claude.ai Artifact
import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const res = await esbuild.build({
  entryPoints: [path.join(ROOT, "src/main.js")], bundle: true, format: "esm", minify: true, write: false,
  external: ["three", "three/addons/*"], target: "es2020", legalComments: "none",
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const cut = (a, b) => html.slice(html.indexOf(a) + a.length, html.indexOf(b)).trim();
const head = cut("<!--PAGE-HEAD-->", "<!--PAGE-HEAD-END-->");
const body = cut("<!--PAGE-BODY-->", "<!--PAGE-BODY-END-->");
const importmap = html.slice(html.indexOf('<script type="importmap">'), html.indexOf("</script>", html.indexOf('<script type="importmap">')) + 9);
const script = `<script type="module">\n${js}</script>`;
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
const full = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n${importmap}\n</head>\n<body>\n${body}\n${script}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(ROOT, "dist/jdv-store.html"), full);
fs.writeFileSync(path.join(ROOT, "dist/artifact.html"), `${head}\n${importmap}\n${body}\n${script}\n`);
for (const f of ["jdv-store.html", "artifact.html"]) console.log(`dist/${f}  ${(fs.statSync(path.join(ROOT, "dist", f)).size / 1024).toFixed(0)} KB`);
