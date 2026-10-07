// ODD HAUS film3d — real-time 3D production app.
// Modes (URL ?mode=): lineup | free | shot (&shot=A|B|C) | reel. ?debug=1 shows the debug HUD.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Stage } from "./core/stage.js";
import { loadFonts } from "./core/textures.js";
import { loadCast } from "./characters/index.js";
import { buildHouse, buildLighting } from "./world/house.js";
import { SHOTS, REEL, LINEUP } from "./film/shots.js";
import { clamp } from "./core/util.js";

const params = new URLSearchParams(location.search);
const capture = params.has("capture");
// published pages only receive a bare #token: #free #A #B #C #reel #lineup #debug
const hash = location.hash.slice(1);
let debug = params.get("debug") === "1" || hash === "debug";
let mode = params.get("mode") || ({ free: "free", reel: "reel", A: "shot", B: "shot", C: "shot", W: "shot", V: "shot", lineup: "lineup" }[hash]) || "lineup";
if (["A", "B", "C", "W", "V"].includes(hash) && !params.get("shot")) params.set("shot", hash);
const W = Number(params.get("w")) || innerWidth;
const H = Number(params.get("h")) || innerHeight;

await loadFonts();
const stage = new Stage(document.getElementById("view"), { width: W, height: H, pixelRatio: capture ? 1 : Math.min(devicePixelRatio, 1.5) });
const { scene, camera } = stage;
const house = buildHouse();
scene.add(house);
const lights = buildLighting(scene, house);
const cast = await loadCast({ tryGLB: true });
for (const c of Object.values(cast)) scene.add(c);
const world = { scene, camera, stage, house, lights, cast, three: THREE };

// ------------------------------------------------------------------ film sequencing
let reel = [];
let duration = 0;
function setReel(list) {
  reel = [];
  let t = 0;
  for (const s of list) { reel.push({ shot: s, start: t }); t += s.duration; }
  duration = t;
  window.__duration = duration;
}
function shotAt(t) {
  for (let i = reel.length - 1; i >= 0; i--) if (t >= reel[i].start) return reel[i];
  return reel[0];
}
let activeShot = null;
function applyFilm(t) {
  const e = shotAt(t);
  if (!e) return;
  if (e.shot !== activeShot) {
    for (const c of Object.values(cast)) { c.visible = false; c.state.custom = {}; }
    e.shot.setup?.(world);
    activeShot = e.shot;
  }
  e.shot.update(clamp(t - e.start, 0, e.shot.duration), world);
}

// ------------------------------------------------------------------ cameras
const controls = new OrbitControls(camera, stage.renderer.domElement);
controls.enableDamping = true;
controls.enabled = false;
const keys = new Set();
addEventListener("keydown", (e) => keys.add(e.code));
addEventListener("keyup", (e) => keys.delete(e.code));
function updateFly(dt) {
  if (!controls.enabled) return;
  const v = new THREE.Vector3();
  const f = new THREE.Vector3(); camera.getWorldDirection(f);
  const r = new THREE.Vector3().crossVectors(f, camera.up).normalize();
  if (keys.has("KeyW")) v.add(f);
  if (keys.has("KeyS")) v.sub(f);
  if (keys.has("KeyD")) v.add(r);
  if (keys.has("KeyA")) v.sub(r);
  if (keys.has("KeyE")) v.y += 1;
  if (keys.has("KeyQ")) v.y -= 1;
  if (v.lengthSq() > 0) {
    v.normalize().multiplyScalar(dt * (keys.has("ShiftLeft") ? 2.4 : 0.9));
    camera.position.add(v); controls.target.add(v);
  }
}

// ------------------------------------------------------------------ modes
const labelsEl = document.getElementById("labels");
let showLabels = !capture && mode === "lineup";
let activeShotKey = params.get("shot") || "A";
function enterMode(m, opts = {}) {
  mode = m;
  document.body.classList.toggle("film", m === "shot" || m === "reel");
  document.body.classList.toggle("free", m === "free" || m === "lineup");
  controls.enabled = !capture && (m === "free" || m === "lineup");
  labelsEl.innerHTML = "";
  if (m === "lineup") {
    LINEUP.setup(world);
    camera.position.set(...LINEUP.camera.pos);
    controls.target.set(...LINEUP.camera.target);
    camera.fov = LINEUP.camera.fov; camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
    stage.setDOF(0, 0);
    duration = 0;
  } else if (m === "free") {
    LINEUP.setupStory(world);
    camera.position.set(1.6, 1.2, 2.5);
    controls.target.set(-0.6, 0.35, -1.0);
    camera.fov = 45; camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
    stage.setDOF(0, 0);
    duration = 0;
  } else {
    const list = m === "reel" ? REEL.map((k) => SHOTS[k]) : [SHOTS[opts.shot || activeShotKey]];
    setReel(list);
    activeShot = null;
  }
  filmTime = 0;
  buildBar();
}

// ------------------------------------------------------------------ time + render
let filmTime = 0, playing = !capture, lastNow = performance.now(), override = null;
function frame(now) {
  const dt = Math.min(0.1, (now - lastNow) / 1000);
  lastNow = now;
  if (playing) {
    filmTime += dt;
    if ((mode === "shot" || mode === "reel") && filmTime > duration) filmTime = 0;
  }
  updateFly(dt);
  render(filmTime, dt);
}
function render(t, dt = 1 / 24) {
  if (mode === "shot" || mode === "reel") applyFilm(t);
  else if (mode === "lineup") LINEUP.update(t, world);
  else LINEUP.updateStory(t, world);
  if (override) {
    camera.position.set(...override.pos);
    if (override.fov) { camera.fov = override.fov; camera.updateProjectionMatrix(); }
    camera.lookAt(...override.target);
    if (override.dof) stage.setDOF(...override.dof);
  } else if (controls.enabled) controls.update();
  for (const c of Object.values(cast)) if (c.visible) c.apply(t);
  if ((mode === "shot" || mode === "reel") && activeShot?.post) activeShot.post(clamp(t - shotAt(t).start, 0, activeShot.duration), world);
  stage.render(t);
  if (showLabels) drawLabels();
  if (debug) drawDebug(t, dt);
}

// ------------------------------------------------------------------ UI
const bar = document.getElementById("bar");
function buildBar() {
  if (capture) { bar.style.display = "none"; return; }
  const items = [["lineup", "Lineup"], ["free", "Free camera"], ["W", "Walk: humans"], ["V", "Walk: small + Buddy"], ["A", "Shot A"], ["B", "Shot B"], ["C", "Shot C"], ["reel", "Play A · B · C"]];
  bar.innerHTML = "";
  for (const [k, label] of items) {
    const b = document.createElement("button");
    b.textContent = label;
    if (k === mode || (mode === "shot" && activeShotKey === k)) b.classList.add("on");
    b.onclick = () => go(k);
    bar.appendChild(b);
  }
}
function go(k) {
  if (["A", "B", "C", "W", "V"].includes(k)) { activeShotKey = k; enterMode("shot", { shot: k }); }
  else enterMode(k);
  playing = true;
}

function drawLabels() {
  labelsEl.innerHTML = "";
  let i = 0;
  for (const c of Object.values(cast)) {
    if (!c.visible) continue;
    const p = c.position.clone().project(camera);
    const stagger = c.def.kind === "tiny" && (i++ % 2) ? 30 : 0;
    if (p.z > 1) continue;
    const el = document.createElement("div");
    el.className = "tag";
    el.style.left = `${(p.x * 0.5 + 0.5) * innerWidth}px`;
    el.style.top = `${(-p.y * 0.5 + 0.5) * innerHeight + 6 + stagger}px`;
    el.innerHTML = `${c.def.name}<small>${Math.round(c.def.height * 100)} cm · ${c.source === "glb" ? "GLB" : "procedural"}</small>`;
    labelsEl.appendChild(el);
  }
}

const dbg = document.getElementById("debug");
if (debug) document.body.classList.add("debug");
let fpsAcc = 0, fpsN = 0, fps = 0;
function drawDebug(t, dt) {
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  const e = (mode === "shot" || mode === "reel") ? shotAt(t) : null;
  const cp = camera.position;
  const assets = Object.values(cast).map((c) => `${c.def.id}:${c.source === "glb" ? "GLB" : "proc"}`).join("  ");
  dbg.textContent = [
    `mode    ${mode}${playing ? "" : "  (paused)"}`,
    `time    ${t.toFixed(2)}s${e ? ` / ${duration.toFixed(2)}s` : ""}`,
    `scene   ${e ? e.shot.scene : "-"}`,
    `shot    ${e ? `${e.shot.id} · ${e.shot.name}  (+${(t - e.start).toFixed(2)}s)` : "-"}`,
    `camera  ${cp.x.toFixed(2)} ${cp.y.toFixed(2)} ${cp.z.toFixed(2)}  fov ${camera.fov.toFixed(0)}`,
    `dof     focus ${stage.dof.focus.toFixed(2)}m  aperture ${stage.dof.aperture.toFixed(3)}`,
    `assets  ${assets}`,
    `fps     ${fps.toFixed(0)}   calls ${stage.renderer.info.render.calls}   tris ${(stage.renderer.info.render.triangles / 1000).toFixed(0)}k`,
    `keys    SPACE play/pause · R restart · 1 lineup · 2-4 shot A-C · 5 reel · 6 free cam · ←/→ ±1s · L labels · G debug`,
  ].join("\n");
}

addEventListener("keydown", (e) => {
  if (e.code === "Space") { playing = !playing; e.preventDefault(); }
  else if (e.code === "KeyR") filmTime = 0;
  else if (e.code === "ArrowRight") filmTime = Math.min(duration || 1e9, filmTime + 1);
  else if (e.code === "ArrowLeft") filmTime = Math.max(0, filmTime - 1);
  else if (e.code === "KeyL") { showLabels = !showLabels; if (!showLabels) labelsEl.innerHTML = ""; }
  else if (e.code === "KeyG" || (e.code === "KeyD" && !controls.enabled)) { debug = !debug; document.body.classList.toggle("debug", debug); }
  else if (/^Digit[1-7]$/.test(e.code)) go(["lineup", "A", "B", "C", "reel", "free", "reel"][Number(e.code.slice(5)) - 1]);
});
addEventListener("resize", () => { if (!capture) stage.setSize(innerWidth, innerHeight); });

// ------------------------------------------------------------------ boot
enterMode(mode, { shot: activeShotKey });
document.getElementById("loading")?.remove();
window.__world = world;
window.__renderAt = (t, cam) => {
  override = cam || null;
  render(t);
  return stage.renderer.domElement.toDataURL("image/jpeg", 0.92);
};
window.__ready = true;
if (!capture) stage.renderer.setAnimationLoop(frame);
