// Automated playthrough: a bot plays Stage 1 in fast-forward (fixed 60 Hz steps) and we record
// timeline / midboss / boss state changes plus screenshots at key moments.
// usage: node scripts/simulate.mjs <baseUrl> <outDir> [hero] [mortal] [idle]
//   mortal: the bot can be hit;  idle: the boss takes no damage (exercises phase timeouts and the time-over collapse)
// Scene names come from a duck-typed check, since class names are minified in the release build.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [base = 'http://localhost:5173/', out = './sim', hero = 'seraphine', mortal = '', idle = ''] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${base}?play=${hero}`);
await page.waitForFunction(() => window.__ER && window.__ER.scenes.current && window.__ER.scenes.current.w);

await page.evaluate(({ mortal, idle }) => {
  const G = window.__ER;
  const sceneName = (s) => (!s ? 'none' : s.w && s.hud ? 'GameScene' : s.constructor.name);
  window.__sceneName = sceneName;
  const log = (window.__log = []);
  let last = {};
  window.__step = (seconds) => {
    const n = Math.round(seconds * 60);
    for (let i = 0; i < n; i++) {
      const sc = G.scenes.current;
      const w = sc && sc.w;
      if (w && w.player && w.director) {
        const p = w.player;
        if (!mortal) p.hit = () => false;
        if (idle && w.boss && !w.boss.__idle) { w.boss.__idle = true; w.boss.takeDamage = () => {}; }
        p.demo = { charge: (w.t % 2.4) < 1.3, bomb: false };
        // aim: boss core, else nearest on-screen enemy, else centre
        let ty = 180, tx = 120;
        if (w.boss && w.boss.state === 'fight') { ty = w.boss.y; tx = 140; }
        else if (w.midboss && w.midboss.state === 'fight') ty = w.midboss.y - 10;
        else {
          let best = null;
          for (const e of w.enemies) if (e.alive && e.wait <= 0 && e.x < 620 && e.x > p.x + 20 && (!best || e.x < best.x)) best = e;
          if (best) ty = best.y;
        }
        if (!p.dead && p.entering <= 0 && !p.autoPilot) {
          p.y += Math.max(-3, Math.min(3, ty - p.y));
          p.x += Math.max(-3, Math.min(3, tx - p.x));
        }
        const rec = {
          scene: 'GameScene',
          tl: Math.floor(w.director.tl),
          section: w.director.section,
          mid: w.midboss ? w.midboss.state : '-',
          boss: w.boss ? `${w.boss.state}:${w.boss.phase}` : '-',
          lives: p.lives,
          cleared: w.cleared,
          gameOver: w.gameOver,
        };
        for (const k of Object.keys(rec)) {
          if (k === 'tl') continue;
          if (rec[k] !== last[k]) log.push({ t: +w.t.toFixed(2), tl: rec.tl, [k]: rec[k], score: w.score, bullets: w.bullets.count, enemies: w.enemies.length, hp: w.boss ? Math.round(w.boss.hp) : null });
        }
        last = rec;
        window.__maxBullets = Math.max(window.__maxBullets || 0, w.bullets.count);
      } else {
        const name = sceneName(sc);
        if (name !== last.scene) log.push({ scene: name });
        last.scene = name;
      }
      G.input.beginStep();
      G.time += 1 / 60;
      G.scenes.update(1 / 60);
    }
    G.r.beginFrame();
    G.scenes.render();
  };
}, { mortal, idle });

const shots = [
  [14, 'a_wave'], [40, 'a_candles'], [24, 'b_skeleton'], [36, 'b_sentinel'], [30, 'c_fog'], [20, 'midboss'],
];
for (const [sec, name] of shots) {
  await page.evaluate((s) => window.__step(s), sec);
  await page.screenshot({ path: `${out}/${name}.png` });
}
// run until boss intro
for (let i = 0; i < 40; i++) {
  const st = await page.evaluate(() => { const w = window.__ER.scenes.current.w; return w && w.boss ? w.boss.state : null; });
  if (st) break;
  await page.evaluate(() => window.__step(2));
}
await page.evaluate(() => window.__step(3.2));
await page.screenshot({ path: `${out}/boss_warning.png` });
await page.evaluate(() => window.__step(6.5));
await page.screenshot({ path: `${out}/boss_p1.png` });
for (let i = 0; i < 200; i++) {
  const info = await page.evaluate(() => { const s = window.__ER.scenes.current; return { scene: window.__sceneName(s), b: s.w && s.w.boss ? `${s.w.boss.state}:${s.w.boss.phase}` : '' }; });
  if (info.b === 'fight:1' && !globalThis.p2) { globalThis.p2 = 1; await page.evaluate(() => window.__step(5)); await page.screenshot({ path: `${out}/boss_p2.png` }); }
  if (info.b === 'fight:2' && !globalThis.p3) { globalThis.p3 = 1; await page.evaluate(() => window.__step(6)); await page.screenshot({ path: `${out}/boss_p3.png` }); }
  if (info.b.startsWith('defeat') && !globalThis.df) { globalThis.df = 1; await page.evaluate(() => window.__step(2.4)); await page.screenshot({ path: `${out}/boss_defeat.png` }); }
  if (info.scene !== 'GameScene') break;
  await page.evaluate(() => window.__step(1));
}
await page.evaluate(() => window.__step(4));
await page.screenshot({ path: `${out}/clear.png` });
const log = await page.evaluate(() => window.__log);
const maxB = await page.evaluate(() => window.__maxBullets);
console.log(JSON.stringify(log, null, 0).replace(/\},\{/g, '},\n{'));
console.log('max bullets:', maxB);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
