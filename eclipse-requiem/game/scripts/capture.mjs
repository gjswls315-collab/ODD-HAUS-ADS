// Fixed-moment screenshots at the 1280x720 reference resolution, used for before/after comparisons.
// usage: node scripts/capture.mjs <baseUrl> <outDir>
//   baseUrl: dev server (http://localhost:5173/) or a file:// URL of release/eclipse-requiem.html
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [base = 'http://localhost:5173/', out = './captures'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];

async function open(url) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(String(e.stack || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  return page;
}

// Gameplay: start a run at a timeline position, let a bot play (invincible) in fast-forward, then screenshot.
async function gameplay(name, hero, tl, seconds, after) {
  const page = await open(`${base}?play=${hero}&tl=${tl}`);
  await page.waitForFunction(() => window.__ER && window.__ER.scenes.current && window.__ER.scenes.current.w, null, { timeout: 30000 });
  await page.evaluate(() => {
    const G = window.__ER;
    window.__step = (sec) => {
      for (let i = 0; i < Math.round(sec * 60); i++) {
        const w = G.scenes.current.w;
        if (w && w.player) {
          const p = w.player;
          p.hit = () => false;
          p.demo = { charge: (w.t % 2.4) < 1.3, bomb: false };
          let ty = 180;
          if (w.boss && w.boss.state === 'fight') ty = w.boss.y;
          else if (w.midboss && w.midboss.state === 'fight') ty = w.midboss.y - 10;
          else {
            let best = null;
            for (const e of w.enemies) if (e.alive && e.wait <= 0 && e.x < 620 && e.x > p.x + 20 && (!best || e.x < best.x)) best = e;
            if (best) ty = best.y;
          }
          if (!p.dead && p.entering <= 0 && !p.autoPilot) { p.y += Math.max(-3, Math.min(3, ty - p.y)); p.x += Math.max(-3, Math.min(3, 110 - p.x)); }
        }
        G.input.beginStep();
        G.time += 1 / 60;
        G.scenes.update(1 / 60);
      }
      G.r.beginFrame();
      G.scenes.render();
    };
  });
  await page.evaluate((s) => window.__step(s), seconds);
  if (after) { await page.evaluate(after); await page.evaluate((s) => window.__step(s), 0); }
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${out}/${name}.png` });
  await page.close();
}

// Menus via real keyboard input.
const page = await open(base);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(5600);
await page.keyboard.press('Enter');
await page.waitForTimeout(1400);
await page.screenshot({ path: `${out}/01_title.png` });
await page.keyboard.press('Enter');
await page.waitForTimeout(1700);
await page.keyboard.down('Escape');
await page.waitForTimeout(1300);
await page.keyboard.up('Escape');
await page.waitForTimeout(3200);
await page.screenshot({ path: `${out}/02_select.png` });
await page.close();

await gameplay('03_stage_A', 'seraphine', 0, 24);
await gameplay('04_stage_B', 'noctis', 50, 16);
await gameplay('05_stage_C_fog', 'morgana', 115, 9);
await gameplay('06_midboss', 'seraphine', 134, 9);
await gameplay('07_boss_p1', 'seraphine', 165, 16);
await gameplay('08_boss_p3', 'noctis', 165, 11, () => {
  // push the boss through both phase transitions the normal way (damage to each threshold)
  const b = window.__ER.scenes.current.w.boss;
  b.takeDamage(b.hp - 0.65 * b.maxHp + 1);
  window.__step(2.2);
  b.takeDamage(b.hp - 0.3 * b.maxHp + 1);
  window.__step(7);
});
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
