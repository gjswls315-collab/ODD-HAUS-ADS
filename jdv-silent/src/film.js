// "The Early Shift" — a JEON DE VERO silent film.
// Picture is a pure function of time: window.render(t) draws frame t (deterministic, any order).
// Pipeline per frame: 3D set (tonal painting, grey values) → Redraw (ink line, wash, boiling hatch)
// → iris / intertitle → FilmPost (silver print, flicker, weave, scratches, burn, grain) → gate + theatre.
import * as THREE from "three";
import { loadBrand, img } from "/jdv-store/src/brand.js";
import { buildMaterials, M } from "/jdv-store/src/materials.js";
import { mergeStatic, cbox, cyl } from "/jdv-store/src/geo.js";
import { LPSet, BookSet, mug } from "/jdv-store/src/world/props.js";
import { buildShell } from "/jdv-store/src/world/shell.js";
import { buildRecordWall } from "/jdv-store/src/world/records.js";
import { buildMerch } from "/jdv-store/src/world/merch.js";
import { buildCoffeeBar } from "/jdv-store/src/world/coffee.js";
import { buildCenter } from "/jdv-store/src/world/center.js";
import { buildPlants } from "/jdv-store/src/world/plants.js";
import { buildTerrace } from "/jdv-store/src/world/terrace.js";
import { buildLights } from "/jdv-store/src/world/lights.js";
import { Redraw } from "../engine/redraw.js";
import { FilmPost, damage } from "../engine/film.js";
import { intertitle, iris, house, curtains, burn } from "./cards.js";
import { buildRig, applyPose, REST } from "./rig.js";

const TL = await (await fetch(new URL("../timeline.json", import.meta.url))).json();
const H = TL.hits;
const W = 1920, HH = 1080, GW = 1440, GATE = { x: (W - GW) / 2, y: 0, w: GW, h: HH };
const params = new URLSearchParams(location.search);
const SCALE = Number(params.get("q") || 1); // 3D render scale (review stills can go lower)

// ---------------------------------------------------------------------------
// keyframe tracks: [[t, value, ease?], ...]; ease shapes the segment arriving at that key
const EASE = { s: (u) => u * u * (3 - 2 * u), lin: (u) => u, out: (u) => 1 - (1 - u) ** 3, in: (u) => u * u * u, inout: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2), back: (u) => { const c = 1.7; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; } };
function num(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e = "s"] = keys[i];
    if (t <= t1) { const [t0, v0] = keys[i - 1]; const u = t1 > t0 ? (t - t0) / (t1 - t0) : 1; return v0 + (v1 - v0) * EASE[e](Math.min(1, Math.max(0, u))); }
  }
  return keys[keys.length - 1][1];
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const SNAP = 0.085; // the two-frame snap of a double take

// ---------------------------------------------------------------------------
// set up
await loadBrand();
buildMaterials();
M.walnut.color.setScalar(1.85); M.walnutDark.color.setScalar(1.7); M.oak.color.setScalar(1.15);
M.plaster.color.setScalar(0.8); M.galv.color = new THREE.Color(1.2, 1.2, 1.2);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xb8b0a4, 24, 110);
const ctx = { scene, lps: new LPSet(), books: new BookSet(), interactions: [], anim: [], skipCrates: [0] };
buildShell(scene);
buildRecordWall(ctx);
buildMerch(ctx);
buildCoffeeBar(ctx);
buildCenter(ctx);
buildPlants(ctx);
buildTerrace(ctx);
buildLights(ctx);
scene.add(ctx.lps.build());
scene.add(ctx.books.build());

// film-only set dressing on the cabinet's front edge: it passes in the foreground of the tracking shot
const dress = new THREE.Group(); scene.add(dress);
{
  const singles = new THREE.Group();
  for (let i = 0; i < 6; i++) { const s = cbox(0.18, 0.006, 0.18, i % 2 ? M.cardboard : M.paper, 0, 0.004 + i * 0.0062, 0, { uv: false }); s.rotation.y = (i * 0.37) % 0.3 - 0.15; singles.add(s); }
  singles.position.set(-2.99, 0.76, 0.66); dress.add(singles);
  const mg = mug(); mg.position.set(-2.97, 0.76, 0.5); mg.rotation.y = 2.2; dress.add(mg);
  const tag = new THREE.Group();
  tag.add(cbox(0.07, 0.015, 0.05, M.walnut, 0, 0.0075, 0, { uv: false }));
  const card = cbox(0.004, 0.09, 0.07, M.paper, 0, 0.06, 0, { uv: false }); card.rotation.z = -0.2; tag.add(card);
  tag.position.set(-2.97, 0.76, 0.04);
}

// the crate he digs: the remaining crate nearest the turntable; the house sleeve sits 10th from the front
const crate = ctx.crates.reduce((a, b) => (Math.abs(b.z - 1.04) < Math.abs(a.z - 1.04) ? b : a));
const HOUSE = 5; // catalogue index of "JDV House Sessions"
{
  const attr = ctx.lps.mesh.geometry.attributes.coverIdx;
  const N = crate.items.length;
  crate.items[N - 1 - 9].cover = HOUSE; attr.array[crate.items[N - 1 - 9].i] = HOUSE;
  attr.needsUpdate = true;
}
const tt = ctx.turntable;
// the store's own record on the platter stays hidden until our disc has landed
const ttDisc = tt.spin.children.filter((c) => c.material === M.vinylGrooves || c.material === M.recordLabel);

// the house disc that he rolls (axis +y natively)
const disc = new THREE.Group();
{
  const v = cyl(0.149, 0.149, 0.003, M.vinylGrooves, 64); disc.add(v);
  const l = cyl(0.046, 0.046, 0.0036, M.recordLabel, 40); disc.add(l);
}
disc.userData.dynamic = true;
scene.add(disc);

// Mr. Vero
const J = buildRig(0.24);
J.root.userData.dynamic = true;
scene.add(J.root);

// lights: sort what the shop built into daylight and practical groups, add the film's key light
const lights = { day: [], groups: {} };
scene.traverse((o) => {
  if (!o.isLight) return;
  o.castShadow = false;
  o.userData.base = o.intensity;
  if (o.isDirectionalLight || o.isHemisphereLight || o.isRectAreaLight) { lights.day.push(o); return; }
  const p = o.position;
  const g = p.z < -4.3 ? "terrace" : p.y > 2.6 && p.y < 2.9 ? "track" : Math.abs(p.x - -0.95) < 0.2 && Math.abs(p.z - 0.73) < 0.3 ? "pendant" : p.x < -3 && p.z < -0.5 ? "lamp" : p.x > 1.5 && p.z > 1 ? "bar" : "corner";
  (lights.groups[g] ??= []).push(o);
});
const emis = {
  lamp: (ctx.lamps || []).filter((l) => l.id === "sideboard").map((l) => l.mat),
  pendant: [M.enamelInside, M.bulb], track: [M.spotLens], corner: [M.lightbox, ...(ctx.lamps || []).filter((l) => l.id === "shelf").map((l) => l.mat)], bar: [M.lampGlass], terrace: [],
};
scene.traverse((o) => { if (o.isInstancedMesh && o.material === M.bulb) { o.material = M.bulb.clone(); emis.terrace.push(o.material); } });
for (const list of Object.values(emis)) for (const m of list) m.userData.base = m.emissiveIntensity;
const key = new THREE.SpotLight(0xf4f0ff, 8, 7, 0.55, 0.95, 2);
key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.01; key.shadow.radius = 5;
key.shadow.camera.near = 0.3; key.shadow.camera.far = 6;
scene.add(key, key.target);

mergeStatic(scene);

// renderers
const RW = Math.round(GW * SCALE), RH = Math.round(HH * SCALE);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.setSize(RW, RH, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const camera = new THREE.PerspectiveCamera(40, GW / HH, 0.02, 200);
const rd = new Redraw(GW, HH);
const fp = new FilmPost(GW, HH);
const mk = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
const filmC = mk(GW, HH), fg = filmC.getContext("2d");
const cardC = mk(GW, HH), cg = cardC.getContext("2d");
const out = document.getElementById("film"); out.width = W; out.height = HH;
const g = out.getContext("2d");

// ---------------------------------------------------------------------------
// shots
const shotAt = (t) => TL.shots.find((s) => t >= s.t0 && t < s.t1) || TL.shots[TL.shots.length - 1];
const crankT = (s, t) => (s.crank ? s.t0 + Math.floor((t - s.t0) * s.crank + 1e-6) / s.crank : t);

// cabinet / sideboard / plinth surfaces
const Y_CAB = 0.76, Y_SIDE = 0.8, Y_PLINTH = 0.885, PLAT = new THREE.Vector3(-3.275, 0.918, -0.36);
const surfaceY = (z) => Y_CAB + (Y_SIDE - Y_CAB) * smooth(0.06, -0.02, z);

// disc contact position along the cabinet (z) while rolling, then the hop and the wobble
function discState(t) {
  const r = 0.15;
  if (t < 14.5) return null;
  if (t < H.plinthHop) {
    const C = num([[14.5, 0.62], [H.push, 0.62], [H.getaway, 0.38, "s"], [H.plinthHop, -0.02, "in"]], t);
    const roll = -(0.62 - C) / r;
    return { pos: new THREE.Vector3(-3.2, surfaceY(C) + r, C), tilt: Math.PI / 2, phi: -Math.PI / 2, spin: roll, c: C };
  }
  const tLand = H.plinthHop + 0.42;
  if (t < tLand) {
    const u = (t - H.plinthHop) / (tLand - H.plinthHop);
    const x = -3.2 + (PLAT.x - -3.2) * u, z = -0.02 + (PLAT.z - -0.02) * EASE.out(u);
    const y = Y_SIDE + r + (PLAT.y + 0.11 - Y_SIDE - r) * u + 0.13 * Math.sin(Math.PI * u);
    return { pos: new THREE.Vector3(x, y, z), tilt: Math.PI / 2 - (Math.PI / 2 - 0.5) * EASE.out(u), phi: -Math.PI / 2 + u * 0.8, spin: -(0.64) / r - u * 3 };
  }
  // Euler's-disk wobble: tilt decays, precession speeds up, then flat on the spindle
  const u = clamp((t - tLand) / (H.settle - tLand), 0, 1);
  const tilt = 0.5 * Math.pow(1 - u, 1.6);
  const phi = -Math.PI / 2 + 0.8 + (u * 9 + u * u * 22);
  return { pos: new THREE.Vector3(PLAT.x, PLAT.y + r * Math.sin(tilt) + 0.001, PLAT.z), tilt, phi, spin: -(0.64) / r - 3, flat: u >= 1 };
}
function placeDisc(s) {
  if (!s || s.flat) { disc.visible = false; return; }
  disc.visible = true;
  disc.position.copy(s.pos);
  const axis = new THREE.Vector3(Math.cos(s.phi), 0, Math.sin(s.phi));
  // tilt: rotate the disc normal (+y) away from vertical about a horizontal axis; spin about its own normal
  const q = new THREE.Quaternion().setFromAxisAngle(axis, s.tilt);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.spin));
  disc.quaternion.copy(q);
}

// platter and tonearm
const OMEGA = 3.49;
function platterAngle(t) {
  const t0 = H.needleDrop + 0.1, t1 = t0 + 1.6;
  if (t <= t0) return 0;
  if (t <= t1) return 0.5 * OMEGA * (t - t0) ** 2 / (t1 - t0);
  return 0.5 * OMEGA * (t1 - t0) + OMEGA * (t - t1);
}
const armAngle = (t) => num([[H.grab, 0], [H.pushEnd, -0.5, "inout"], [H.nudge, -0.5], [H.needleDrop, -0.52]], t);
const armLift = (t) => num([[H.nudge, 1], [H.needleDrop, 0, "in"]], t);

// walking legs from distance travelled
function legs(p, dist, amp = 0.55, bob = 0.012) {
  const ph = (dist / 0.045) * Math.PI;
  p.legL = Math.sin(ph) * amp; p.legR = -Math.sin(ph) * amp;
  p.hop += Math.abs(Math.sin(ph)) * bob;
  return p;
}

function poseAt(t) {
  const p = { ...REST };
  if (t < 8.0) { // S1: beside the silent turntable
    Object.assign(p, { x: -3.18, y: Y_CAB, z: 0.32, yaw: num([[7.4, Math.PI / 2], [7.9, 0]], t) });
    p.hYaw = num([[4.4, 0], [5.0, 0.85], [5.6, 0.85], [5.6 + 0.22, -0.95, "out"], [7.3, -0.95], [7.9, 0]], t);
    p.hPitch = num([[4.4, 0], [5.0, 0.18], [5.6, 0.18], [5.82, 0], [7.9, 0]], t);
    const sh = num([[6.4, 0], [6.62, 1, "out"], [7.0, 1], [7.25, 0]], t);
    p.aLab = 0.12 + sh * 0.5; p.aRab = 0.12 + sh * 0.5; p.aLfl = sh * 0.45; p.aRfl = sh * 0.45;
    p.squash = 1 - sh * 0.05; p.hTilt = sh * 0.12; p.hop = sh * 0.004;
    p.sway = Math.sin(t * 1.3) * 0.015;
    return p;
  }
  if (t < 14.5) { // S2: digging the crate
    Object.assign(p, { x: -3.16, y: Y_CAB, z: 0.765, yaw: 0, lean: 0.12 });
    // left arm over the side wall to the front record; a flick on every flip
    let flick = 0;
    for (const f of H.flips.concat([H.reveal])) flick = Math.max(flick, Math.exp(-(((t - f) / 0.07) ** 2)));
    const reach = num([[8.0, 0], [8.5, 1, "out"], [H.reveal + 0.05, 1], [H.doubleTake, 0.85], [14.5, 0.85]], t);
    p.aLab = 0.12 + reach * 0.55; p.aLfl = reach * (1.35 + flick * 0.55);
    p.aRab = 0.12 + reach * 0.08; p.aRfl = reach * 0.25;
    p.lean = 0.12 + reach * 0.12 + flick * 0.06;
    p.hPitch = reach * 0.22; p.hYaw = num([[8.0, 0], [8.5, 0.35], [H.doubleTake, 0.35], [H.doubleTake + SNAP, 1.45, "lin"], [H.backToSleeve, 1.45], [H.backToSleeve + 0.25, 0.35, "out"]], t);
    const frozen = smooth(H.reveal, H.reveal + 0.1, t) * (1 - smooth(H.doubleTake - 0.05, H.doubleTake, t));
    p.lean -= frozen * 0.1;
    p.hop = Math.exp(-(((t - H.doubleTake - 0.1) / 0.07) ** 2)) * 0.02;
    if (t >= H.doubleTake && t < H.backToSleeve) p.hPitch = 0.05;
    return p;
  }
  if (t < 21.0) { // S3: pushing, losing, chasing the disc
    const ds = discState(t);
    const C = ds && !ds.flat && t < H.plinthHop ? ds.c : -0.02;
    const zPush = C + 0.15 + 0.065;
    const z = t < H.getaway ? zPush : num([[H.getaway, 0.38 + 0.215], [H.getaway + 0.35, 0.56, "out"], [20.35, -0.07, "inout"]], t);
    const dist = t < H.getaway ? 0.62 + 0.215 - z : 0.62 - 0.38 + (0.56 - z) * 1.0 + 0.4;
    Object.assign(p, { x: -3.2, y: surfaceY(z), z, yaw: Math.PI });
    const pushing = 1 - smooth(H.getaway, H.getaway + 0.15, t);
    p.lean = pushing * 0.42 + (1 - pushing) * 0.25;
    p.aLfl = pushing * 1.35 + (1 - pushing) * 0.9; p.aRfl = p.aLfl; p.aLab = 0.18; p.aRab = 0.18;
    // stumble when it gets away
    p.lean += Math.exp(-(((t - H.getaway - 0.18) / 0.12) ** 2)) * 0.35;
    legs(p, dist, t < H.getaway ? 0.35 : 0.7, t < H.getaway ? 0.006 : 0.016);
    // hands on knees at the end
    const knees = smooth(H.knees, H.knees + 0.25, t);
    p.lean = p.lean * (1 - knees) + 0.55 * knees; p.aLfl = p.aLfl * (1 - knees) + 0.75 * knees; p.aRfl = p.aLfl;
    p.squash = 1 - knees * 0.04;
    if (knees > 0) { p.legL *= 1 - knees; p.legR *= 1 - knees; }
    p.hPitch = 0.1 + knees * 0.15;
    return p;
  }
  if (t < 31.0) { // S4: up onto the plinth, the arm, the silence, the drop
    const x = num([[H.hop, -3.18], [H.land, -3.105, "out"]], t);
    const z = num([[H.hop, -0.06], [H.land, -0.2, "out"], [H.grab, -0.49, "inout"], [H.pushEnd, -0.38, "inout"], [H.pushEnd + 0.5, -0.33, "inout"]], t);
    const air = t > H.hop && t < H.land ? Math.sin(Math.PI * (t - H.hop) / (H.land - H.hop)) : 0;
    const base = t < H.land - 0.12 ? Y_SIDE : Y_PLINTH;
    const yLin = t < H.hop ? Y_SIDE : t < H.land ? Y_SIDE + (Y_PLINTH - Y_SIDE) * (t - H.hop) / (H.land - H.hop) : Y_PLINTH;
    Object.assign(p, { x, y: Math.max(base, yLin), z, yaw: Math.PI });
    p.hop = air * 0.09;
    const crouch = Math.exp(-(((t - H.crouch - 0.2) / 0.22) ** 2)) + Math.exp(-(((t - H.land - 0.06) / 0.08) ** 2)) * 0.8;
    p.squash = 1 - crouch * 0.14 + air * 0.08; p.lean = crouch * 0.3;
    p.aLab = 0.12 + air * 0.9; p.aRab = p.aLab;
    if (t > H.land && t < H.grab) legs(p, Math.abs(z - -0.2), 0.45);
    const hold = smooth(H.grab - 0.25, H.grab, t) * (1 - smooth(H.pushEnd, H.pushEnd + 0.2, t));
    p.aLfl = hold * 1.45; p.aRfl = hold * 1.45; p.aLab = Math.max(p.aLab, 0.12 + hold * 0.15); p.aRab = p.aLab; p.lean += hold * 0.18;
    if (t > H.grab && t < H.pushEnd) { legs(p, Math.abs(z - -0.49), 0.35, 0.004); p.lean += 0.12; }
    // the silence: he turns toward us and looks back over his shoulder at the record, then the nudge
    const turn = smooth(H.pushEnd + 0.15, H.pushEnd + 0.6, t) * (1 - smooth(H.nudge - 0.35, H.nudge - 0.1, t));
    p.yaw = Math.PI + (Math.PI / 2 - Math.PI) * turn;
    const look = smooth(H.pushEnd + 0.4, H.pushEnd + 0.8, t);
    p.hYaw = look * (0.85 + 0.35 * turn); p.hPitch = look * 0.3;
    const nudge = Math.exp(-(((t - H.nudge - 0.08) / 0.12) ** 2));
    p.aLfl = Math.max(p.aLfl, nudge * 1.2); p.aLab = Math.max(p.aLab, 0.12 + nudge * 0.25); p.lean += nudge * 0.15;
    // after the drop: a step aside, three-quarter to us, watching the record turn
    const aside = smooth(H.needleDrop + 0.3, H.needleDrop + 1.0, t);
    if (aside > 0) {
      p.z = p.z + (-0.24 - p.z) * aside; p.yaw = Math.PI + (2.62 - Math.PI) * aside;
      p.hYaw = p.hYaw * (1 - aside) + 1.15 * aside; p.hPitch = p.hPitch * (1 - aside) + 0.32 * aside;
      if (aside < 1) legs(p, aside * 0.1, 0.35, 0.004);
    }
    // the record turns: a small bob with the foxtrot's beats
    if (t > H.themeIn + 0.5) { const b = (t - H.themeIn) / 0.5; p.hop += Math.abs(Math.sin(Math.PI * b)) * 0.004; p.hTilt = Math.sin(Math.PI * b * 0.5) * 0.08; }
    return p;
  }
  if (t < 35.6) { // S5: he is a speck in the wide; keep him by the record, bobbing
    Object.assign(p, { x: -3.105, y: Y_PLINTH, z: -0.33, yaw: Math.PI });
    const b = (t - H.themeIn) / 0.5; p.hop = Math.abs(Math.sin(Math.PI * b)) * 0.005; p.hYaw = 0.85; p.hPitch = 0.2;
    return p;
  }
  // S6: dancing beside the turning record, then a turn to us and the cap
  const turned = t >= H.turnToUs + SNAP ? 1 : t >= H.turnToUs ? (t - H.turnToUs) / SNAP : 0;
  Object.assign(p, { x: -3.11, y: Y_PLINTH, z: -0.27, yaw: Math.PI * 0.82 + (Math.PI / 2 - Math.PI * 0.82) * turned });
  const b = (t - H.themeIn) / 0.5, beat = Math.sin(Math.PI * b);
  const dance = 1 - turned;
  p.sway = beat * 0.16 * dance; p.hTilt = -beat * 0.12 * dance; p.hop = Math.abs(beat) * 0.012 * dance;
  p.aLfl = (0.4 + Math.max(0, beat) * 0.7) * dance; p.aRfl = (0.4 + Math.max(0, -beat) * 0.7) * dance;
  p.aLab = 0.3 * dance + 0.12; p.aRab = 0.3 * dance + 0.12;
  p.legL = Math.max(0, beat) * 0.35 * dance; p.legR = Math.max(0, -beat) * 0.35 * dance;
  // the cap tip: right arm up sideways first (abduction), then forward to the brim
  const [c0, c1] = H.capTip;
  const ab = num([[c0, 0.12], [c0 + 0.28, 2.35, "out"], [c1 - 0.2, 2.35], [c1, 0.12]], t);
  const fl = num([[c0 + 0.18, 0], [c0 + 0.4, 0.42, "out"], [c1 - 0.25, 0.42], [c1, 0]], t);
  if (t > c0) { p.aRab = ab; p.aRfl = fl; }
  p.capLift = num([[c0 + 0.35, 0], [c0 + 0.55, 0.12, "out"], [c1 - 0.3, 0.12], [c1 - 0.05, 0]], t);
  p.hPitch = num([[c0 + 0.35, 0], [c0 + 0.55, 0.18], [c1 - 0.3, 0.18], [c1, 0]], t);
  return p;
}

// camera per shot: position, target, fov
function cameraAt(s, t) {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  switch (s.id) {
    case "S1": return { pos: v(-2.15, 1.05, -0.06), tgt: v(-3.2, 0.9, -0.04), fov: 40 };
    case "S2": return { pos: v(-2.38, 1.5, 0.98), tgt: v(-3.14, 0.9, 0.93), fov: 40 };
    case "S3": {
      const ds = discState(Math.min(t, H.plinthHop - 0.01));
      const follow = num([[14.5, 0.62], [H.push, 0.62], [H.getaway, 0.42], [H.plinthHop, 0.02, "inout"], [20.6, -0.2, "out"]], t);
      return { pos: v(-2.42, 0.97, follow + 0.1), tgt: v(-3.22, 0.88, follow - 0.02), fov: 42 };
    }
    case "S4": {
      const k = EASE.inout(clamp((t - 23.6) / 7.4, 0, 1));
      return { pos: v(-1.98 - 0.52 * k, 1.13 - 0.07 * k, -0.2 - 0.38 * k), tgt: v(-3.2, 0.96 - 0.03 * k, -0.36 + 0.06 * k), fov: 44 - 8 * k };
    }
    case "S5": return { pos: v(0.82, 1.62, 3.42), tgt: v(0.82 - Math.sin(0.64) * 4, 1.62 - 0.3, 3.42 - Math.cos(0.64) * 4), fov: 58 };
    case "S6": return { pos: v(-2.48, 1.03, -0.22), tgt: v(-3.12, 0.99, -0.29), fov: 40 };
  }
  return { pos: v(0, 1.6, 3), tgt: v(0, 1.5, 0), fov: 50 };
}

// lights: dawn before the needle drops, then the shop wakes up lamp by lamp
const LAMP_ORDER = ["lamp", "pendant", "corner", "track", "bar", "terrace"];
function lampLevel(group, t) {
  const i = LAMP_ORDER.indexOf(group);
  const ton = H.lamps[i];
  if (t < ton) return 0;
  const u = t - ton;
  if (u > 0.22) return 1;
  return [0.6, 0.1, 0.9, 0.3, 1][Math.min(4, Math.floor(u / 0.045))]; // old bulbs catch with a stutter
}
function setLights(s, t) {
  const after = smooth(H.needleDrop, H.needleDrop + 2.2, t);
  for (const l of lights.day) {
    const k = l.isHemisphereLight ? 0.55 + 0.25 * after : l.isRectAreaLight ? 0.55 : 0.35 + 0.4 * after;
    l.intensity = l.userData.base * k;
  }
  for (const [grp, list] of Object.entries(lights.groups)) {
    const k = grp === "corner" || LAMP_ORDER.includes(grp) ? lampLevel(grp === "corner" ? "corner" : grp, t) : 0;
    for (const l of list) l.intensity = l.userData.base * k;
    for (const m of emis[grp] || []) m.emissiveIntensity = m.userData.base * (0.03 + 0.97 * k);
  }
  // the film's key light, aimed at the action
  const K = {
    S1: [[-1.95, 2.2, 0.8], [-3.18, 0.86, 0.05], 12],
    S2: [[-1.95, 2.2, 1.6], [-3.12, 0.9, 0.9], 12],
    S3: [[-1.95, 2.25, 0.75], [-3.2, 0.85, 0.25], 13],
    S4: [[-1.95, 2.25, 0.3], [-3.2, 0.9, -0.33], 12],
    S5: [[-2.0, 2.25, 0.35], [-3.2, 0.9, -0.33], 0],
    S6: [[-2.0, 2.2, 0.2], [-3.12, 0.95, -0.28], 7],
  }[s.id];
  key.position.set(...K[0]); key.target.position.set(...K[1]); key.intensity = K[2];
  key.target.updateMatrixWorld();
  renderer.toneMappingExposure = { S1: 0.95, S2: 0.95, S3: 0.95, S4: 0.95 + 0.25 * after, S5: 0.8 + 0.6 * smooth(31.0, 33.0, t), S6: 1.15 }[s.id];
}

function stage(s, t) {
  // records: deterministic flips (each eases forward over ~0.18 s with a small bounce)
  const N = crate.items.length;
  crate.items.forEach((it, k) => {
    const order = N - 1 - k;
    const tf = order < H.flips.length ? H.flips[order] : order === H.flips.length ? H.reveal : Infinity;
    const lean = 0.16 - k * 0.002, fwd = -0.62 + order * 0.032;
    it.angle = t < tf ? lean : lean + (fwd - lean) * EASE.back(clamp((t - tf) / 0.18, 0, 1));
    ctx.lps.write(it);
  });
  ctx.lps.mesh.instanceMatrix.needsUpdate = true;
  // disc, platter, arm
  const ds = discState(t);
  placeDisc(ds);
  const landed = t >= H.settle;
  for (const d of ttDisc) d.visible = landed;
  tt.spin.rotation.y = -platterAngle(t);
  tt.armPivot.rotation.y = t < H.grab ? 0 : armAngle(t);
  tt.arm.position.y = -0.016 * (1 - armLift(t)) + 0.004;
  // the figure
  applyPose(J, poseAt(t));
  // camera
  const c = cameraAt(s, t);
  camera.position.copy(c.pos); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(c.tgt);
  setLights(s, t);
}

/** World point → film (gate) pixel coordinates, for an iris that tracks its subject. */
function toFilm(p) {
  const v = p.clone().project(camera);
  return [(v.x * 0.5 + 0.5) * GW, (1 - (v.y * 0.5 + 0.5)) * HH];
}

// look per shot (print + redraw)
function lookAt(s, t) {
  if (s.card) {
    const end = s.id === "C3";
    return { sepia: end ? 0.34 : 0.12, str: end ? 0.3 + smooth(H.burn - 0.6, H.burn, t) * 0.5 : 0.55, crank: 1 };
  }
  let sepia = s.sepia, str = s.str;
  if (s.id === "S4") { const a = smooth(H.needleDrop + 0.1, 31.0, t); sepia = 0.12 + 0.22 * a; str = 0.6 - 0.3 * a; }
  return { sepia, str, crank: s.speed || 1 };
}

const CARD_SEED = { question: 2, needle: 5, end: 9 };
let cache = { key: null };

function render(t) {
  const frame = Math.round(t * TL.fps);
  const s = shotAt(t);
  const look = lookAt(s, t);
  // ---- the film frame (1440×1080)
  if (s.card) {
    const spec = TL.cards[s.card];
    intertitle(cg, GW, HH, { ...spec, seed: CARD_SEED[s.card] }, spec.logo ? img.scriptCream : null);
    fg.drawImage(cardC, 0, 0);
  } else {
    const tm = crankT(s, t);
    const k3d = `${s.id}:${tm.toFixed(4)}`;
    if (cache.key !== k3d) { stage(s, tm); renderer.render(scene, camera); cache.key = k3d; cache.boil = null; }
    const boil = Math.floor(frame / 2);
    if (cache.boil !== boil) {
      rd.render(renderer.domElement, { frame, gamma: 0.9, contrast: 1.12, levels: 5, gap: 5.5, sigma: 1.15, p: 16, eps: 0.33, washDark: 0.3 });
      cache.boil = boil;
    }
    fg.drawImage(rd.canvas, 0, 0);
    // irises
    if (s.id === "S2" && t > H.irisSleeve[0]) {
      const N = crate.items.length, it = crate.items[N - 1 - 9];
      const c = toFilm(new THREE.Vector3(it.pos.x + 0.02, it.pos.y + 0.17, it.pos.z));
      const r = num([[H.irisSleeve[0], 1000], [H.irisSleeve[1], 0, "in"]], tm);
      iris(fg, GW, HH, c[0], c[1], r);
    }
    if (s.id === "S6" && t > H.irisHalf[0]) {
      const head = new THREE.Vector3(); J.neck.getWorldPosition(head); head.y += 0.035;
      const c = toFilm(head);
      const r = num([[H.irisHalf[0], 1100], [H.irisHalf[1], 470, "out"], [H.irisShut[0], 470], [H.irisShut[1], 0, "in"]], tm);
      iris(fg, GW, HH, c[0], c[1], r);
    }
  }
  // ---- print
  const lampOn = t >= H.lampClick && t < H.lampOff;
  const motor = smooth(H.motorUp, H.motorUp + 1.0, t);
  const print = fp.render(filmC, { frame, strength: look.str, sepia: look.sepia, crank: look.crank * (0.5 + 0.5 * motor), exposure: lampOn ? 1 : 0 });
  // ---- theatre
  const spill = lampOn ? fp.mean : 0;
  house(g, W, HH, spill);
  g.save();
  roundRect(g, GATE.x, GATE.y, GATE.w, GATE.h, 22); g.clip();
  if (lampOn) g.drawImage(print, GATE.x, GATE.y);
  else { g.fillStyle = "#050404"; g.fillRect(GATE.x, GATE.y, GATE.w, GATE.h); }
  if (lampOn && !s.card) damage(g, GATE.x, GATE.y, GATE.w, GATE.h, frame, look.str);
  if (lampOn && s.card) damage(g, GATE.x, GATE.y, GATE.w, GATE.h, frame, look.str * 0.6);
  // the print burns through
  const bk = s.id === "C3" ? smooth(H.burn, H.burn + 1.1, t) : 0;
  if (lampOn && bk > 0) burn(g, GATE, bk, frame);
  // soft dark rim of the aperture
  const rim = g.createLinearGradient(GATE.x, 0, GATE.x + GATE.w, 0);
  rim.addColorStop(0, "rgba(0,0,0,.55)"); rim.addColorStop(0.03, "rgba(0,0,0,0)"); rim.addColorStop(0.97, "rgba(0,0,0,0)"); rim.addColorStop(1, "rgba(0,0,0,.55)");
  g.fillStyle = rim; g.fillRect(GATE.x, 0, GATE.w, HH);
  g.restore();
  const open = num([[H.curtainOpen[0], 0], [H.curtainOpen[1], 1, "inout"], [H.curtainClose[0], 1], [H.curtainClose[1], 0, "inout"]], t);
  curtains(g, W, HH, GATE, bk > 0.6 ? 0.9 : spill, open);
  return frame;
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

window.DUR = TL.dur;
window.render = render;
window.frameJPEG = (q = 0.9) => out.toDataURL("image/jpeg", q);
window.READY = true;
if (params.has("t")) render(Number(params.get("t")));
