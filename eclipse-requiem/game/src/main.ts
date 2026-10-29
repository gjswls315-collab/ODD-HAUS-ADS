import { G } from './core/app';
import { STEP } from './core/constants';
import { loadAssets, missingAssets } from './gfx/assets';
import { loadFonts } from './gfx/pixeltext';
import { IntroScene } from './scenes/intro';
import { ArtSheetScene } from './scenes/artsheet';
import { GameScene } from './scenes/game';
import { HeroId } from './gfx/sprites';

async function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  G.init(canvas);
  // all graphics are image files under game/assets (see assets/README.md)
  await Promise.all([loadAssets(), loadFonts()]);
  if (missingAssets().length) console.warn('[assets] missing at boot', missingAssets());
  document.getElementById('boot')?.remove();
  canvas.focus();

  const unlock = () => G.audio.unlock();
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);
  canvas.addEventListener('pointerdown', () => canvas.focus());

  const params = new URLSearchParams(location.search);
  if (params.has('artsheet')) G.scenes.go(new ArtSheetScene(), undefined, 'none');
  else if (params.has('play')) {
    const hero = (params.get('play') || 'seraphine') as HeroId;
    G.scenes.go(new GameScene(['seraphine', 'noctis', 'morgana'].includes(hero) ? hero : 'seraphine', Number(params.get('tl') || 0)), undefined, 'none');
  }
  else G.scenes.go(new IntroScene(), undefined, 'none');

  let acc = 0;
  let last = performance.now();
  const frame = (now: number) => {
    let d = (now - last) / 1000;
    last = now;
    if (d > 0.25) d = 0.25;
    acc += d;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      G.input.beginStep();
      G.time += STEP;
      G.scenes.update(STEP);
      acc -= STEP;
      steps++;
    }
    if (steps === 5) acc = 0;
    G.r.beginFrame();
    G.scenes.render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  const hide = () => {
    G.scenes.current?.onHide?.();
    last = performance.now();
    acc = 0;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hide();
    else last = performance.now();
  });
  window.addEventListener('blur', hide);

  // Test/debug hook (used by the automated playthrough checks).
  (window as unknown as { __ER: typeof G }).__ER = G;
}

void boot();
