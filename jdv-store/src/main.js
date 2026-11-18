// JEON DE VERO — walkable first-person 3D store.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

import { ROOM, EYE, PLAYER_R, SPAWN, ZONES, buildColliders } from "./layout.js";
import { loadBrand } from "./brand.js";
import { buildMaterials, T } from "./materials.js";
import { mergeStatic } from "./geo.js";
import { LPSet, BookSet } from "./world/props.js";
import { buildShell } from "./world/shell.js";
import { buildRecordWall } from "./world/records.js";
import { buildMerch } from "./world/merch.js";
import { buildCoffeeBar } from "./world/coffee.js";
import { buildCenter } from "./world/center.js";
import { buildPlants } from "./world/plants.js";
import { buildTerrace } from "./world/terrace.js";
import { buildLights } from "./world/lights.js";
import { VARIANTS } from "./world/mascot.js";
import { Collision } from "./game/collision.js";
import { Controls } from "./game/controls.js";
import { Interactions } from "./game/interact.js";
import { Inspector } from "./game/inspect.js";
import { AudioEngine } from "./game/audio.js";
import { UI } from "./game/ui.js";
import { Collectibles, MINIS } from "./game/collectibles.js";
import { MURAL } from "./assets/brandArt.js";

document.getElementById("logo").src = MURAL;

const params = new URLSearchParams(location.search);
const SHOT = params.has("shot"); // headless capture mode

const ui = new UI();
const canvasEl = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: SHOT });
const maxPR = SHOT ? 1 : Math.min(window.devicePixelRatio || 1, 1.75);
let pixelRatio = maxPR;
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
if (SHOT) renderer.info.autoReset = false;

const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.03, 220);
camera.rotation.order = "YXZ";

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform vec2 res; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = (vUv - 0.5) * vec2(res.x / res.y, 1.0);
      float v = smoothstep(1.05, 0.35, length(d));
      c.rgb *= mix(0.74, 1.0, v);
      c.rgb = mix(c.rgb, c.rgb * vec3(1.03, 1.0, 0.95), 0.6);
      float n = fract(sin(dot(floor(vUv * res) + fract(time) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
      c.rgb += (n - 0.5) * 0.026;
      gl_FragColor = c;
    }`,
};

let composer, bloom, grade;
function setupComposer(scene) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: SHOT ? 4 : 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.3, 0.5, 2.2);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
}
function resize() {
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  if (composer) {
    composer.setPixelRatio(pixelRatio);
    composer.setSize(innerWidth, innerHeight);
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    grade.uniforms.res.value.set(s.x, s.y);
  }
}
addEventListener("resize", resize);

const tick = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// ---------------------------------------------------------------------------
const game = { ui, audio: null, interactions: null, onFound: null, openInspect: null };
const state = { started: false, inspecting: false, map: false, target: null };
const pos = new THREE.Vector3(SPAWN.x, 0, SPAWN.z);
const vel = new THREE.Vector3();
let bobPhase = 0, lastStep = 0, t = 0;

async function boot() {
  try {
    ui.progress(0.05, "Unlocking the front door");
    await loadBrand();
    await tick();
    ui.progress(0.18, "Mixing plaster and pouring concrete");
    await tick();
    buildMaterials();
    ui.atlas = T.covers.image;
    ui.progress(0.5, "Stocking the crates");
    await tick();

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xd9b48a, 26, 110);
    const ctx = { scene, lps: new LPSet(), books: new BookSet(), interactions: [], anim: [], game };
    const shell = buildShell(scene);
    buildRecordWall(ctx);
    buildMerch(ctx);
    buildCoffeeBar(ctx);
    buildCenter(ctx);
    buildPlants(ctx);
    ui.progress(0.66, "Watering the terrace");
    await tick();
    buildTerrace(ctx);
    buildLights(ctx);
    scene.add(ctx.lps.build());
    scene.add(ctx.books.build());
    const minis = new Collectibles(ctx);
    mergeStatic(scene);
    ui.progress(0.8, "Warming up the lights");
    await tick();

    // environment reflections captured from the shop itself
    renderer.shadowMap.needsUpdate = true;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(scene, 0.04, 0.05, 150, { size: 256, position: new THREE.Vector3(-0.4, 1.5, 0.6) });
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.3;
    renderer.shadowMap.needsUpdate = true;

    setupComposer(scene);
    resize();
    const collision = new Collision(buildColliders());
    const interactions = new Interactions(scene, ctx.interactions);
    const inspector = new Inspector(renderer, envRT.texture);
    const controls = new Controls(canvasEl);
    const audio = new AudioEngine();
    Object.assign(game, { audio, interactions });
    controls.yaw = SPAWN.yaw; controls.pitch = SPAWN.pitch;

    // ---- wiring ----
    const variantsOrder = MINIS.map((m) => m.key);
    [...ui.el.slots.children].forEach((s, i) => { s.dataset.swatch = VARIANTS[variantsOrder[i]].swatch; });
    ui.setFound([], variantsOrder);
    game.onFound = (found) => {
      ui.setFound(found, variantsOrder);
      if (found.length === 5) setTimeout(() => { ui.done(); audio.chime(true); }, 1400);
    };
    const openInspect = (spec) => {
      state.inspecting = true;
      inspector.open(spec);
      ui.openInspect(spec);
      ui.setPrompt(null);
      controls.look = (dx, dy) => inspector.turn(dx, dy);
      audio.click?.(null);
    };
    const closeInspect = () => {
      state.inspecting = false;
      inspector.close();
      ui.closeInspect();
      controls.look = null;
    };
    game.openInspect = openInspect;

    const interact = () => {
      if (!state.started || !controls.active) return;
      if (state.inspecting) { closeInspect(); return; }
      if (state.map) { toggleMap(); return; }
      const s = state.target;
      if (!s) return;
      if (s.inspect) openInspect(s.inspect);
      else s.use(game, s);
    };
    const toggleMap = () => {
      if (!state.started) return;
      if (state.inspecting) closeInspect();
      state.map = !state.map;
      ui.toggleMap(state.map);
    };
    controls.on("interact", interact);
    controls.on("map", toggleMap);
    controls.on("pause", () => {
      if (!state.started) return;
      if (state.inspecting) closeInspect();
      ui.showPause(true, minis.found.length);
    });
    controls.on("resume", () => { ui.showPause(false); });
    controls.on("dragmode", () => { document.body.classList.add("drag-mode"); });
    controls.on("lockmode", () => { document.body.classList.remove("drag-mode"); });

    const enter = () => {
      audio.init();
      audio.setMuted(audio.muted);
      if (!state.started) {
        state.started = true;
        ui.showTitle(false);
        ui.showHUD(true);
        setTimeout(() => ui.el.hint.classList.add("fade"), 14000);
      }
      controls.start();
    };
    ui.el.enter.addEventListener("click", enter);
    ui.el.resume.addEventListener("click", enter);
    canvasEl.addEventListener("click", () => { if (state.started && !controls.active) enter(); });
    ui.el.sound.addEventListener("click", () => { audio.setMuted(!audio.muted); ui.setSound(!audio.muted); });
    ui.el.touchE?.addEventListener("click", (e) => { e.stopPropagation(); interact(); });
    ui.el.touchM?.addEventListener("click", (e) => { e.stopPropagation(); toggleMap(); });
    document.getElementById("map-close")?.addEventListener("click", () => toggleMap());
    if (controls.isTouch) document.body.classList.add("touch");

    // ---- hot reload snapshot (claude.ai viewer) ----
    window.claude?.hot?.snapshot?.(() => ({ x: pos.x, z: pos.z, yaw: controls.yaw, pitch: controls.pitch }));
    const restore = (d) => { if (d && typeof d.x === "number") { pos.set(d.x, 0, d.z); controls.yaw = d.yaw; controls.pitch = d.pitch; } };
    if (window.claude?.hot?.ready) window.claude.hot.ready(restore); else restore(window.claude?.hot?.data);

    // ---- loop ----
    const timer = new THREE.Timer();
    const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3();
    let perfAcc = 0, perfN = 0, perfT = 0;
    const zoneOf = (x, z) => ZONES.find((zn) => zn.test(x, z)).name;

    function frame(dtOverride, now) {
      if (dtOverride == null) timer.update(now);
      const dt = dtOverride ?? Math.min(timer.getDelta(), 0.05);
      t += dt;
      const canMove = state.started && controls.active && !state.inspecting && !state.map;
      // movement
      const yaw = controls.yaw;
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      const it = canMove ? controls.intent() : { x: 0, z: 0, fast: false };
      const speed = it.fast ? 3.1 : 1.6;
      wish.set(0, 0, 0).addScaledVector(fwd, it.z).addScaledVector(right, it.x);
      if (wish.lengthSq() > 1) wish.normalize();
      wish.multiplyScalar(speed);
      vel.lerp(wish, 1 - Math.exp(-dt * 9));
      const before = pos.clone();
      pos.addScaledVector(vel, dt);
      collision.resolve(pos, PLAYER_R);
      const moved = pos.distanceTo(before);
      const sp = moved / Math.max(dt, 1e-4);
      bobPhase += moved / 0.74 * Math.PI;
      if (Math.floor(bobPhase / Math.PI) !== lastStep) { lastStep = Math.floor(bobPhase / Math.PI); if (sp > 0.4) audio.footstep(pos.z < ROOM.z0 - 0.1 ? "deck" : "floor"); }
      const bobK = Math.min(1, sp / 1.6);
      const bob = Math.abs(Math.sin(bobPhase)) * 0.026 * bobK - 0.013 * bobK;
      // camera
      if (!state.started) {
        const drift = SHOT ? 0 : t;
        camera.position.set(pos.x + Math.sin(drift * 0.13) * 0.05, EYE + Math.sin(drift * 0.21) * 0.015, pos.z);
        camera.rotation.set(controls.pitch + Math.sin(drift * 0.17) * 0.012, controls.yaw + Math.sin(drift * 0.11) * 0.03, 0);
      } else {
        camera.position.set(pos.x, EYE + bob, pos.z);
        camera.rotation.set(controls.pitch, controls.yaw, Math.sin(bobPhase * 0.5) * 0.004 * bobK);
      }
      // world updates
      const doorMoved = shell.doors.update(dt, pos.x, pos.z);
      collision.doorOpen = shell.doors.state.open;
      const recMoved = ctx.lps.update(dt);
      if (doorMoved || recMoved) renderer.shadowMap.needsUpdate = true;
      for (const a of ctx.anim) a(dt, t);
      minis.update(dt, camera);
      // targeting
      if (canMove) {
        state.target = interactions.pick(camera);
        ui.setPrompt(state.target);
      } else if (!state.inspecting) { state.target = null; ui.setPrompt(null); }
      ui.setZone(zoneOf(pos.x, pos.z));
      ui.update(dt);
      const outside = THREE.MathUtils.smoothstep(-pos.z, -ROOM.z0 - 0.4, -ROOM.z0 + 1.2);
      audio.update(dt, camera, outside, shell.doors.state.open);
      if (state.map) ui.drawMap(pos.x, pos.z, controls.yaw, MINIS.filter((m) => minis.found.includes(m.key)).map((m) => ({ ...m, swatch: VARIANTS[m.key].swatch })));
      // render
      grade.uniforms.time.value = t;
      if (SHOT) renderer.info.reset();
      composer.render(dt);
      inspector.render(dt);
      // adaptive resolution
      if (!SHOT && state.started) {
        perfAcc += dt; perfN++; perfT += dt;
        if (perfT > 2.5) {
          const avg = perfAcc / perfN;
          if (avg > 0.026 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.25); resize(); }
          else if (avg < 0.0135 && pixelRatio < maxPR) { pixelRatio = Math.min(maxPR, pixelRatio + 0.25); resize(); }
          perfAcc = perfN = perfT = 0;
        }
      }
    }

    // capture hook for headless screenshots
    window.__jdv = {
      ready: true,
      game,
      pick: () => interactions.pick(camera)?.name || null,
      view(x, z, yaw, pitch = 0, y = EYE) { pos.set(x, 0, z); controls.yaw = yaw; controls.pitch = pitch; state.started = true; camera.position.set(x, y, z); },
      step(n = 1, dt = 1 / 30) { for (let i = 0; i < n; i++) frame(dt); },
      info: () => renderer.info.render,
      interact: () => { state.target = interactions.pick(camera); const s = state.target; if (s) { if (s.inspect) openInspect(s.inspect); else s.use(game, s); } return s?.name; },
      closeInspect,
      setOpen: (k) => { shell.doors.state.open = k; },
      started: () => { state.started = true; controls.active = true; },
    };
    if (SHOT) { ui.showTitle(false); ui.showHUD(true); }
    else ui.ready();
    renderer.setAnimationLoop(SHOT ? null : (now) => frame(null, now));
    if (SHOT) frame(1 / 30);
  } catch (err) {
    console.error(err);
    ui.progress(1, "Something went wrong loading the shop: " + (err && err.message ? err.message : err));
    window.__jdvError = String(err && err.stack ? err.stack : err);
  }
}

boot();
