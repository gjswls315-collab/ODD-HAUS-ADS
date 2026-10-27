// Inline the built JS bundle so the game ships as one self-contained file:
//  - release/eclipse-requiem.html : standalone page (open directly in a browser)
//  - release/artifact.html        : page body for hosting as a claude.ai artifact (skeleton is added by the host)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const dist = join(root, 'dist');
let html = readFileSync(join(dist, 'index.html'), 'utf8');
const js = readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.js'));
if (js.length !== 1) throw new Error('expected exactly one JS bundle, found ' + js.join(', '));
const code = readFileSync(join(dist, 'assets', js[0]), 'utf8').replace(/<\/script/g, '<\\/script');
const tag = `<script type="module">${code}</script>`;
html = html.replace(/<script[^>]*src="[^"]*assets\/[^"]+\.js"[^>]*><\/script>/, () => tag);
if (!html.includes(code.slice(0, 200))) throw new Error('bundle was not inlined');
mkdirSync(join(root, 'release'), { recursive: true });
writeFileSync(join(root, 'release/eclipse-requiem.html'), html);
const art = readFileSync(join(root, 'artifact.html'), 'utf8').replace('<!--APP-->', () => tag);
writeFileSync(join(root, 'release/artifact.html'), art);
console.log(`release/eclipse-requiem.html  ${(html.length / 1024).toFixed(1)} KiB`);
console.log(`release/artifact.html         ${(art.length / 1024).toFixed(1)} KiB`);
