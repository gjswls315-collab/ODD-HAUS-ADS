// Assembles the world and owns everything that changes with time: light levels, flicker,
// twinkle, the shop going dark at the end. update(t) is a pure function of film time.
import * as THREE from 'three';
import { shared, NL } from '../core/toon.js';
import { smooth, noise1 } from '../core/util.js';
import { loadCharacter } from '../art/character.js';
import { makeEnvTextures } from '../art/textures-env.js';
import { makePropTextures } from '../art/textures-props.js';
import { buildStreet } from './street.js';
import { buildStore } from './store.js';
import { buildInterior } from './interior.js';
import { buildSnow, buildSmoke } from './fx.js';
import { colliders } from './kit.js';
import { kickEnv, bassEnv, levelEnv } from '../audio/pattern.js';

export async function buildWorld() {
  const tm = {}, mark = (k, t0) => { tm[k] = Math.round(performance.now() - t0); };
  let t0 = performance.now();
  const character = await loadCharacter(); mark('character', t0); t0 = performance.now();
  const env = makeEnvTextures(); mark('texEnv', t0); t0 = performance.now();
  const T = { ...env, ...makePropTextures(character) }; mark('texProps', t0); t0 = performance.now();
  const scene = new THREE.Scene();
  const world = {
    lights: [], glows: [], tick: [], follow: [], anchors: {},
    uTime: shared.uTime, uSpill: shared.uSpill, uStore: { value: 1 },
  };
  const ctx = { scene, T, world };
  buildStreet(ctx);
  buildStore(ctx);
  buildInterior(ctx);
  buildSnow(ctx);
  buildSmoke(ctx);
  mark('geometry', t0); window.__timing = tm;
  if (world.lights.length > NL) console.warn(`[world] ${world.lights.length} lights defined, only ${NL} are shaded`);

  const spillBase = new THREE.Color('#E0A25E');
  const ambInt = new THREE.Color('#2c2118'), ambExt = new THREE.Color('#33476a');
  const tmp = new THREE.Color();

  world.levels = (t) => {
    const A = 1 - 0.95 * smooth(35.55, 36.15, t);      // window bay + wrapping table
    const B = 1 - 0.95 * smooth(36.2, 36.8, t);        // middle of the shop
    const C = 1 - 0.9 * smooth(36.75, 37.35, t);       // counter and poster: last to go
    const open = t < 35.3 ? 1 : t < 35.36 ? 0.15 : t < 35.5 ? 0.9 : t < 35.56 ? 0.1 : 0.02;
    const sign = 1 - 0.45 * smooth(36.9, 37.4, t);
    return { street: 1, sign, storeA: A, storeB: B, storeC: C, open, storeAll: (A + B + C) / 3, music: 1 };
  };

  world.update = (t, camera) => {
    shared.uTime.value = t;
    const lv = world.levels(t);
    world.lights.slice(0, NL).forEach((l, i) => {
      const flick = 1 + 0.035 * noise1(t * 5.5, l.seed || i) + 0.012 * noise1(t * 23, (l.seed || i) + 9);
      const k = l.i * (lv[l.group] ?? 1) * flick;
      shared.uLightPos.value[i].set(l.p[0], l.p[1], l.p[2], l.zone);
      tmp.set(l.c);
      shared.uLightCol.value[i].set(tmp.r * k, tmp.g * k, tmp.b * k, l.r);
    });
    for (const g of world.glows) {
      let k = lv[g.group] ?? 1;
      if (g.twinkle) k *= 0.72 + 0.28 * Math.sin(t * (0.9 + g.twinkle * 0.13) + g.twinkle * 2.1);
      else if (g.seed !== undefined) k *= 1 + 0.03 * noise1(t * 5.5, g.seed);
      if (g.u) g.u.value = g.base * k;
      else g.m.color.copy(g.m.userData.base).multiplyScalar(k);
    }
    world.uStore.value = lv.storeAll;
    shared.uSpill.value.copy(spillBase).multiplyScalar(1.5 * (0.04 + 0.96 * lv.storeAll));
    shared.uAmbInt.value.copy(ambInt).multiplyScalar(0.22 + 0.78 * lv.storeAll);
    shared.uAmbExt.value.copy(ambExt);
    if (world.smoke) world.smoke.uniforms.uLevel.value = lv.storeC;
    const s = { kick: kickEnv(t), bass: bassEnv(t), level: levelEnv(t), levels: lv };
    for (const f of world.tick) f(t, s);
    for (const o of world.follow) o.position.copy(camera.position);
  };

  return { scene, world, T, character, colliders };
}
