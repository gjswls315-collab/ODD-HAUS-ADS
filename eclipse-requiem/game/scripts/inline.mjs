// Inline the built JS bundle into dist/index.html so the game ships as one self-contained file.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
let html = readFileSync(join(dist, 'index.html'), 'utf8');
const assets = readdirSync(join(dist, 'assets'));
for (const file of assets.filter((f) => f.endsWith('.js'))) {
  const code = readFileSync(join(dist, 'assets', file), 'utf8').replace(/<\/script/g, '<\\/script');
  const tag = new RegExp(`<script[^>]*src="\\./assets/${file.replace('.', '\\.')}"[^>]*></script>`);
  html = html.replace(tag, () => `<script type="module">${code}</script>`);
}
mkdirSync(new URL('../release/', import.meta.url).pathname, { recursive: true });
writeFileSync(new URL('../release/eclipse-requiem.html', import.meta.url).pathname, html);
console.log(`release/eclipse-requiem.html  ${(html.length / 1024).toFixed(1)} KiB`);
