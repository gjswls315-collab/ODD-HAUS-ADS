// Regenerate every placeholder asset in game/assets/. usage: node tools/art/build.mjs
// Final art replaces these files one by one (same file names, same tag names); see assets/README.md.
import { buildStage1 } from './stage1.mjs';
import { buildCombat } from './combat.mjs';
import { buildHeroes } from './heroes.mjs';
import { buildEnemies } from './enemies.mjs';
import { buildBoss } from './boss.mjs';
import { buildUI } from './ui.mjs';

const only = process.argv[2];
const groups = { stage1: () => buildStage1().files, combat: () => buildCombat().map((x) => x.info), heroes: () => buildHeroes().map((x) => x.info), enemies: () => buildEnemies().map((x) => x.info), boss: () => buildBoss().map((x) => x.info), ui: buildUI };
for (const [name, fn] of Object.entries(groups)) {
  if (only && only !== name) continue;
  const t = Date.now();
  const files = fn();
  console.log(`${name.padEnd(8)} ${String(files.length).padStart(3)} files  ${Date.now() - t} ms`);
}
