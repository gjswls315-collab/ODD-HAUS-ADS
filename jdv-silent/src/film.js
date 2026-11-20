// "The Early Shift" (v2) — a JEON DE VERO silent film.
// window.render(t) draws frame t (deterministic, any order).
// Per frame: 3D set + Jeon de Vero (tonal painting) → Redraw (ink, wash, boiling hatch)
// → iris / smoke ring / logo card → FilmPost (silver print, damage) → gate, curtains, burn.
import * as THREE from "three";
import { loadBrand, img } from "/jdv-store/src/brand.js";
import { buildMaterials, M, T as STORE_T } from "/jdv-store/src/materials.js";
import { mergeStatic, cbox, cyl } from "/jdv-store/src/geo.js";
import { LPSet, BookSet } from "/jdv-store/src/world/props.js";
import { buildShell } from "/jdv-store/src/world/shell.js";
import { buildRecordWall } from "/jdv-store/src/world/records.js";
import { buildMerch, buildFigureBox } from "/jdv-store/src/world/merch.js";
import { buildCoffeeBar } from "/jdv-store/src/world/coffee.js";
import { buildCenter } from "/jdv-store/src/world/center.js";
import { buildPlants } from "/jdv-store/src/world/plants.js";
import { buildTerrace } from "/jdv-store/src/world/terrace.js";
import { buildLights } from "/jdv-store/src/world/lights.js";
import { canvas, tex } from "/jdv-store/src/textures.js";
import { Redraw } from "../engine/redraw.js";
import { FilmPost, damage } from "../engine/film.js";
import { decoBorder, iris, house, curtains, burn, CARD_BG } from "./cards.js";
import { buildRig, applyPose, REST } from "./rig.js";
import { buildJDV, applyJDV, loadHead, STAND } from "./jdv.js";
import { OVAL, PEEK, SIGN, POSTER, PENNANT } from "./assets/jdvArt.js";

const TL = await (await fetch(new URL("../timeline.json", import.meta.url))).json();
const H = TL.hits;
const W = 1920, HH = 1080, GW = 1440, GATE = { x: (W - GW) / 2, y: 0, w: GW, h: HH };
const params = new URLSearchParams(location.search);
const SCALE = Number(params.get("q") || 1);

// ---------------------------------------------------------------------------
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
const pulse = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
const hash = (n) => { const s = Math.sin(n * 91.3458 + 17.123) * 47453.5453; return s - Math.floor(s); };
const loadImg = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });

// ---------------------------------------------------------------------------
// set
await loadBrand();
buildMaterials();
M.walnut.color.setScalar(1.85); M.walnutDark.color.setScalar(1.7); M.oak.color.setScalar(1.15);
M.plaster.color.setScalar(0.8); M.galv.color = new THREE.Color(1.2, 1.2, 1.2);
const [headImg, ovalImg, peekImg, signImg, posterImg, pennantImg] = await Promise.all([loadHead(), loadImg(OVAL), loadImg(PEEK), loadImg(SIGN), loadImg(POSTER), loadImg(PENNANT)]);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xb8b0a4, 24, 110);
const ctx = { scene, lps: new LPSet(), books: new BookSet(), interactions: [], anim: [] };
const shell = buildShell(scene);
buildRecordWall(ctx);
buildMerch(ctx);
buildCoffeeBar(ctx);
buildCenter(ctx);
buildPlants(ctx);
buildTerrace(ctx);
buildLights(ctx);
scene.add(ctx.lps.build());
scene.add(ctx.books.build());

// film-only dressing from the client's references: the skate poster and the pennant on the back wall,
// boxed figures on the tile table
{
  const pt = new THREE.Texture(posterImg); pt.colorSpace = THREE.SRGBColorSpace; pt.needsUpdate = true;
  const frame = new THREE.Group();
  frame.add(cbox(0.6, 0.75, 0.03, M.walnutDark, 0, 0, 0, { uv: false }));
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.675), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.6 }));
  art.position.z = 0.016; frame.add(art);
  frame.position.set(-3.08, 1.72, -3.97); scene.add(frame);
  const pn = new THREE.Texture(pennantImg); pn.colorSpace = THREE.SRGBColorSpace; pn.needsUpdate = true;
  const pen = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.45), new THREE.MeshStandardMaterial({ map: pn, transparent: true, alphaTest: 0.3, roughness: 0.9, side: THREE.DoubleSide }));
  pen.position.set(2.05, 2.62, -3.97); scene.add(pen);
  const fb = buildFigureBox(); fb.position.set(-1.45, 0.5, 0.62); fb.rotation.y = 0.35; scene.add(fb);
}

// the house record: 10th sleeve from the front of the second crate carries his own face
const crate = ctx.crates.reduce((a, b) => (Math.abs(b.z - 1.04) < Math.abs(a.z - 1.04) ? b : a));
const HOUSE = 5;
const NC = crate.items.length, houseItem = crate.items[NC - 1 - 9];
{ const attr = ctx.lps.mesh.geometry.attributes.coverIdx; houseItem.cover = HOUSE; attr.array[houseItem.i] = HOUSE; attr.needsUpdate = true; }
const tt = ctx.turntable;
const ttDisc = tt.spin.children.filter((c) => c.material === M.vinylGrooves || c.material === M.recordLabel);

// props (world matrices set by hand each frame)
const J = buildJDV(headImg);
J.root.userData.dynamic = true; scene.add(J.root);
const props = { mug: J.props.mug, board: J.props.board, disc: new THREE.Group(), sleeve: new THREE.Group() };
props.disc.add(cyl(0.149, 0.149, 0.003, M.vinylGrooves, 64)); props.disc.add(cyl(0.046, 0.046, 0.0036, M.recordLabel, 40));
{
  const g = new THREE.BoxGeometry(0.315, 0.315, 0.004); const uv = g.attributes.uv;
  const cx = HOUSE % 8, cy = Math.floor(HOUSE / 8);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i)) / 8, (7 - cy + uv.getY(i)) / 8);
  props.sleeve.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: STORE_T.covers, roughness: 0.6 })));
}
for (const p of Object.values(props)) { p.matrixAutoUpdate = false; p.userData.dynamic = true; p.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(p); }

// the toy that only dances when nobody is looking
const toy = buildRig(0.27); toy.root.userData.dynamic = true; scene.add(toy.root);
const TOY = new THREE.Vector3(-3.24, 0.8, -1.05);

// smoke and steam: a pool of soft sprites driven by deterministic emitters
const smokeTex = (() => { const c = canvas(64), g = c.getContext("2d"); const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, "rgba(255,255,255,0.65)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return tex(c, { wrap: false }); })();
const pool = [];
for (let i = 0; i < 160; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, color: 0xf4f0ea })); s.visible = false; s.userData.dynamic = true; scene.add(s); pool.push(s); }

// lights
const lights = { day: [], groups: {} };
scene.traverse((o) => {
  if (!o.isLight) return;
  o.castShadow = false; o.userData.base = o.intensity;
  if (o.isDirectionalLight || o.isHemisphereLight || o.isRectAreaLight) { lights.day.push(o); return; }
  const p = o.position;
  const g = p.z < -4.3 ? "terrace" : p.y > 2.6 && p.y < 2.9 ? "track" : Math.abs(p.x + 0.95) < 0.2 && Math.abs(p.z - 0.73) < 0.3 ? "pendant" : p.x < -3 && p.z < -0.5 ? "lamp" : p.x > 1.5 && p.z > 1 ? "bar" : "corner";
  (lights.groups[g] ??= []).push(o);
});
const sun = lights.day.find((l) => l.isDirectionalLight);
const emis = {
  lamp: (ctx.lamps || []).filter((l) => l.id === "sideboard").map((l) => l.mat),
  pendant: [M.enamelInside, M.bulb], track: [M.spotLens], corner: [M.lightbox, ...(ctx.lamps || []).filter((l) => l.id === "shelf").map((l) => l.mat)], bar: [M.lampGlass], terrace: [],
};
scene.traverse((o) => { if (o.isInstancedMesh && o.material === M.bulb) { o.material = M.bulb.clone(); emis.terrace.push(o.material); } });
for (const list of Object.values(emis)) for (const m of list) m.userData.base = m.emissiveIntensity;
const key = new THREE.SpotLight(0xf4f0ff, 8, 9, 0.6, 0.95, 2);
key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.01; key.shadow.radius = 5;
key.shadow.camera.near = 0.3; key.shadow.camera.far = 8;
scene.add(key, key.target);

mergeStatic(scene);

// renderers
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.setSize(Math.round(GW * SCALE), Math.round(HH * SCALE), false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const camera = new THREE.PerspectiveCamera(40, GW / HH, 0.02, 200);
const rd = new Redraw(GW, HH);
const fp = new FilmPost(GW, HH);
const mk = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
const filmC = mk(GW, HH), fg = filmC.getContext("2d");
const out = document.getElementById("film"); out.width = W; out.height = HH;
const g = out.getContext("2d");

// ---------------------------------------------------------------------------
const shotAt = (t) => TL.shots.find((s) => t >= s.t0 && t < s.t1) || TL.shots[TL.shots.length - 1];
const crankT = (s, t) => (s.crank ? s.t0 + Math.floor((t - s.t0) * s.crank + 1e-6) / s.crank : t);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const P = (o) => ({ ...STAND, ...o });
const PLAT = V(-3.275, 0.918, -0.36);
const OMEGA = 3.49;
function platterAngle(t) {
  const t0 = H.needleDrop + 0.1, t1 = t0 + 1.6;
  if (t <= t0) return 0;
  if (t <= t1) return 0.5 * OMEGA * (t - t0) ** 2 / (t1 - t0);
  return 0.5 * OMEGA * (t1 - t0) + OMEGA * (t - t1);
}
const armAngle = (t) => num([[H.armAcross[0], 0], [H.armAcross[1], -0.5, "inout"], [H.nudge, -0.5], [H.needleDrop, -0.52]], t);
const armLift = (t) => num([[H.nudge, 1], [H.needleDrop, 0, "in"]], t);
const doorOpen = (t) => num([[H.doorsOpen[0], 0], [H.doorsOpen[1], 1, "inout"], [H.doorsClose[0], 1], [H.doorsClose[1], 0, "inout"]], t);
function legsWalk(p, dist, amp = 0.5) {
  const ph = (dist / 0.62) * Math.PI;
  p.hipLx = Math.sin(ph) * amp; p.hipRx = -Math.sin(ph) * amp;
  p.kneeL = 0.08 + Math.max(0, -Math.cos(ph)) * 0.6 * amp / 0.5; p.kneeR = 0.08 + Math.max(0, Math.cos(ph)) * 0.6 * amp / 0.5;
  p.shLfl = -Math.sin(ph) * 0.35; p.shRfl = Math.sin(ph) * 0.35;
  p.y += Math.abs(Math.sin(ph)) * 0.02;
  return p;
}
const beatBob = (t) => Math.abs(Math.sin(Math.PI * (t - H.themeIn) / 0.5));

// prop placement helpers
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function inHand(prop, wrist, offset = [0, -0.1, 0.03], rot = [0, 0, 0]) {
  wrist.updateMatrixWorld(true);
  _m.compose(V(...offset), _q.setFromEuler(_e.set(...rot)), V(1, 1, 1));
  prop.matrix.multiplyMatrices(wrist.matrixWorld, _m);
  prop.matrixWorld.copy(prop.matrix); prop.visible = true;
}
function atWorld(prop, pos, rot = [0, 0, 0], s = 1) {
  prop.matrix.compose(pos, _q.setFromEuler(_e.set(...rot, "YXZ")), V(s, s, s));
  prop.matrixWorld.copy(prop.matrix); prop.visible = true;
}
const hide = (prop) => { prop.visible = false; };

// ---------------------------------------------------------------------------
// staging per shot: returns the pose; also places props
function stageJDV(s, t) {
  hide(props.mug); hide(props.board); hide(props.disc); hide(props.sleeve);
  J.root.visible = true;
  let p;
  switch (s.id) {
    case "S1": { // skating along the terrace, the ollie, carving in through the glass doors
      const x = num([[3.8, -4.5], [H.pushes[0], -4.2, "lin"], [H.pushes[1], -3.25, "lin"], [H.pushes[2], -2.3, "lin"], [H.ollie, -1.55, "lin"], [H.carve, -0.95, "out"]], t);
      const z = num([[H.carve, -5.15], [11.0, -3.2, "in"]], t);
      const air = t > H.ollie && t < H.land ? Math.sin(Math.PI * (t - H.ollie) / (H.land - H.ollie)) : 0;
      const yaw = num([[H.carve - 0.3, Math.PI], [H.carve + 0.4, Math.PI * 1.5, "inout"]], t);
      p = P({ x, z, y: 0.1 + air * 0.34, yaw, crouch: 0.1, lean: 0.12, hipLz: 0.24, hipRz: -0.24, kneeL: 0.35, kneeR: 0.35, hipLx: 0.18, hipRx: 0.18, shLab: 0.45, shRab: 0.4, elbL: 0.3, elbR: 0.35 });
      for (const pt of H.pushes) { // the back foot drops to the deck and pushes
        const k = pulse(t, pt, 0.2);
        p.hipLz += k * 0.32; p.kneeL -= k * 0.3; p.kneeR += k * 0.45; p.crouch += k * 0.1; p.lean += k * 0.1;
      }
      const pre = pulse(t, H.ollie - 0.12, 0.08);
      p.crouch += pre * 0.18;
      if (air > 0) { // the poster pose: arms flung, knees tucked
        p.kneeL += air * 0.9; p.kneeR += air * 0.9; p.hipLx += air * 0.6; p.hipRx += air * 0.6;
        p.shLab = 0.45 + air * 1.1; p.shRab = 0.4 + air * 0.85; p.shRfl = air * 0.6; p.elbL = 0.3 + air * 0.4; p.lean += air * 0.15;
      }
      const landK = pulse(t, H.land + 0.08, 0.1);
      p.crouch += landK * 0.16; p.kneeL += landK * 0.4; p.kneeR += landK * 0.4;
      // the board under his feet (long axis along travel), tail pops on the ollie
      const byaw = num([[H.carve - 0.3, Math.PI / 2], [H.carve + 0.4, 0, "inout"]], t);
      const pop = t > H.ollie - 0.05 && t < H.land ? Math.sin(Math.PI * clamp((t - H.ollie + 0.05) / 0.3, 0, 1)) * 0.45 : 0;
      atWorld(props.board, V(x, 0.083 + air * 0.3, z), [pop, byaw, 0]);
      break;
    }
    case "S2": { // rolling in, the skid, the board flips up into his hand, a puff, off to the bar
      const z = num([[11.0, -4.9], [H.skid, -2.75, "out"]], t);
      const stepX = num([[12.8, -0.92], [13.1, -0.7, "s"], [H.walkOff[0], -0.7], [16.0, 0.75, "lin"]], t);
      const walking = t > H.walkOff[0];
      const yaw = walking ? Math.PI / 2 : num([[H.skid, Math.PI * 1.5], [H.skid + 0.2, Math.PI * 1.5 + 0.35]], t);
      const onBoard = t < 12.8;
      p = P({ x: onBoard ? -0.92 : stepX, z, y: onBoard ? 0.1 : 0, yaw, crouch: onBoard ? 0.08 : 0, hipLz: onBoard ? 0.22 : 0.05, hipRz: onBoard ? -0.22 : -0.05, kneeL: onBoard ? 0.3 : 0.05, kneeR: onBoard ? 0.3 : 0.05, shLab: 0.4, shRab: 0.4 });
      const skid = pulse(t, H.skid + 0.1, 0.18);
      p.lean -= skid * 0.3; p.shLab += skid * 0.6; p.shRab += skid * 0.6;
      if (walking) legsWalk(p, stepX + 0.7, 0.45);
      // board: rolling → skid sideways → flipped up into his hand
      const kick = t > H.kickTail && t < H.catch ? (t - H.kickTail) / (H.catch - H.kickTail) : t >= H.catch ? 1 : 0;
      if (t < H.kickTail) {
        const by = num([[H.skid, 0], [H.skid + 0.15, Math.PI / 2, "out"]], t);
        atWorld(props.board, V(-0.92, 0.083, Math.min(z, -2.6)), [0, by, 0]);
      } else if (kick < 1) {
        atWorld(props.board, V(-0.85, 0.083 + kick * 0.7, -2.6), [kick * 1.4, Math.PI / 2, 0]);
      } else {
        p.shRab = 0.25; p.shRfl = 0.05; p.elbR = 0.2;
        inHand(props.board, J.wristR, [0.02, -0.08, 0.0], [Math.PI / 2, 0, 0]);
      }
      if (t > H.kickTail - 0.1 && t < H.kickTail + 0.1) { p.hipRx = 0.35; p.kneeR = 0.4; }
      const puff = pulse(t, H.puff, 0.15);
      p.headBob = -puff * 0.025; p.crouch += puff * 0.02;
      if (t >= H.catch && t < H.walkOff[0]) p.headMirror = false;
      break;
    }
    case "S3": { // espresso, the sip, the logo pose
      const yaw = num([[H.mugUp, Math.PI / 2], [H.turnFront, -1.1, "inout"], [H.peekPose[0], -1.1], [H.peekPose[1], -0.91, "inout"]], t);
      p = P({ x: 2.62, z: 2.38, yaw });
      const reach = num([[16.0, 0], [H.reach, 1, "out"], [H.mugUp - 0.2, 1], [H.mugUp, 0]], t);
      p.shLfl = 0.05 + reach * 1.3; p.shRfl = 0.05 + reach * 1.3; p.elbL = 0.25 + reach * 0.3; p.elbR = 0.25 + reach * 0.3; p.lean += reach * 0.12;
      const sip = num([[H.sip[0] - 0.35, 0], [H.sip[0], 1, "out"], [H.sip[1] - 0.15, 1], [H.sip[1] + 0.2, 0]], t);
      if (t > H.mugUp) { p.shRfl = 0.45 + sip * 0.05; p.shRab = 0.2 + sip * 0.1; p.elbR = 1.2 + sip * 0.7; p.headTilt = -sip * 0.1; } // he faces screen-left here: the right hand is on the mouth side
      const ex = pulse(t, H.exhale + 0.1, 0.25);
      p.headBob = -ex * 0.015; p.crouch += ex * 0.02;
      const pk = num([[H.peekPose[0], 0], [H.peekPose[1], 1, "inout"]], t);
      if (pk > 0) {
        // the logo pose: sunk behind the bar, only the head over the counter, looking at us
        const L = (a, b) => a * (1 - pk) + b * pk;
        p.crouch = L(p.crouch, 0.12); p.lean = L(p.lean, 0.75);
        p.shLfl = L(p.shLfl, 0.45); p.shRfl = L(p.shRfl, 0.45); p.shLab = L(p.shLab, 0.25); p.shRab = L(p.shRab, 0.25);
        p.elbL = L(p.elbL, 0.4); p.elbR = L(p.elbR, 0.4);
        p.headBob = L(p.headBob, 0); p.headTilt = L(p.headTilt, 0);
        p.headMirror = pk > 0.5 ? false : null;
      }
      if (t > H.mugUp && t < H.peekPose[0] + 0.3) inHand(props.mug, J.wristR, [0.0, -0.11, 0.05], [0, -1.2, 0]);
      else if (t >= H.peekPose[0] + 0.3) atWorld(props.mug, V(2.2, 1.03, 3.0), [0, 0.5, 0], 1.25); // set down to his left: the logo's mug
      break;
    }
    case "S4": { // crate digging
      p = P({ x: -2.4, z: 1.0, yaw: -Math.PI / 2, lean: 0.2 });
      let flick = 0;
      for (const f of H.flips.concat([H.reveal])) flick = Math.max(flick, pulse(t, f, 0.07));
      const reach = num([[26.6, 0.6], [27.1, 1, "out"], [H.reveal + 0.05, 1], [H.pull[0], 1], [H.pull[1], 0.55]], t);
      p.shRfl = reach * 1.02 + flick * 0.12; p.shRab = 0.2; p.elbR = 0.35 + flick * 0.45; p.lean = 0.12 + reach * 0.16;
      p.shLfl = 0.5; p.elbL = 1.4; p.shLab = 0.18; // mug in the left hand
      inHand(props.mug, J.wristL, [0, -0.11, 0.05], [0, 1.3, 0]);
      const freeze = smooth(H.reveal, H.reveal + 0.08, t) * (1 - smooth(H.doubleTake - 0.04, H.doubleTake, t));
      p.lean -= freeze * 0.08;
      if (t >= H.doubleTake && t < H.backToSleeve) { p.headMirror = false; p.y = pulse(t, H.doubleTake + 0.08, 0.06) * 0.03; }
      // the house sleeve rises into his hand
      const up = smooth(H.pull[0], H.pull[0] + 0.5, t);
      if (up > 0) { p.shRfl = 0.9 + up * 0.35; p.elbR = 0.9; inHand(props.sleeve, J.wristR, [0, -0.12, 0.1], [0, Math.PI / 2, 0]); }
      break;
    }
    case "S5": { // the record goes on; the arm; the silence; the drop
      p = P({ x: -2.6, z: -0.16, yaw: -Math.PI / 2 });
      const place = num([[33.6, 0], [H.placeDisc[0], 1], [H.placeDisc[1], 0, "inout"]], t);
      const discU = smooth(H.placeDisc[0], H.placeDisc[1], t);
      if (t < H.placeDisc[0]) { p.shRfl = 0.9; p.elbR = 0.9; p.shLfl = 0.9; p.elbL = 0.9; inHand(props.disc, J.wristR, [0.03, -0.12, 0.12], [Math.PI / 2, 0, 0]); }
      else if (discU < 1) { const a = V(-2.95, 1.2, -0.25), b = PLAT.clone(); atWorld(props.disc, a.lerp(b, discU).add(V(0, Math.sin(Math.PI * discU) * 0.05, 0)), [(1 - discU) * Math.PI / 2, 0, 0]); p.shRfl = 1.1; p.shLfl = 1.1; p.elbR = 0.5; p.elbL = 0.5; p.lean = 0.3 * Math.sin(Math.PI * discU); }
      atWorld(props.sleeve, V(-3.18, 0.762, 0.24), [Math.PI / 2, 0.2, 0]);
      atWorld(props.mug, V(-3.05, 0.76, 0.48), [0, 0.6, 0], 1.25);
      const arm = smooth(H.grabArm - 0.3, H.grabArm, t) * (1 - smooth(H.release, H.release + 0.3, t));
      p.shRfl = Math.max(p.shRfl, arm * 1.15); p.shRab = 0.14 + arm * 0.25; p.elbR = Math.max(p.elbR, 0.25 + arm * 0.2); p.lean = Math.max(p.lean, arm * 0.33);
      const nudge = pulse(t, H.nudge + 0.08, 0.1);
      p.shRfl = Math.max(p.shRfl, nudge * 0.95); p.lean += nudge * 0.15;
      if (t > H.release + 0.3 && t < H.nudge - 0.2) { p.shLfl = 0.3; p.shRfl = 0.3; p.elbL = 1.6; p.elbR = 1.6; p.shLab = 0.25; p.shRab = 0.25; } // arms folded, waiting
      if (t > H.themeIn + 0.3) { p.headBob = beatBob(t) * 0.012; p.crouch = beatBob(t) * 0.01; }
      void place;
      break;
    }
    case "S6": { // the shop wakes: he is small by the turntable, nodding
      p = P({ x: -2.6, z: -0.16, yaw: -Math.PI / 2, headBob: beatBob(t) * 0.014 });
      atWorld(props.sleeve, V(-3.18, 0.762, 0.24), [Math.PI / 2, 0.2, 0]);
      atWorld(props.mug, V(-3.05, 0.76, 0.48), [0, 0.6, 0], 1.25);
      break;
    }
    case "S7": { // the toy: dances behind his back, freezes when he looks
      p = P({ x: -2.48, z: -0.08, yaw: 2.45, headBob: beatBob(t) * 0.014, crouch: beatBob(t) * 0.012 });
      p.shRfl = 0.55; p.elbR = 1.45; p.shRab = 0.2;
      inHand(props.mug, J.wristR, [0, -0.11, 0.05], [0, -0.5, 0]);
      const looking = H.looks.some(([a, b]) => t >= a && t < b) || t >= H.bothNod[0];
      p.headMirror = !looking; // the drawn head faces screen-right: toward the toy when he looks
      const sh = num([[H.shrug - 0.05, 0], [H.shrug + 0.15, 1, "out"], [H.shrug + 0.45, 1], [H.bothNod[0], 0]], t);
      p.shLab = 0.14 + sh * 0.7; p.elbL = 0.25 + sh * 1.2; p.shLfl = sh * 0.4; p.crouch += sh * -0.02;
      if (t >= H.bothNod[0]) p.headBob = beatBob(t) * 0.025;
      break;
    }
    case "S8": { // the drag, the smoke ring, the salute
      p = P({ x: -2.48, z: -0.08, yaw: 2.21, headMirror: false });
      const drag = num([[H.drag - 0.3, 0], [H.drag, 1, "out"], [H.drag + 0.5, 1], [H.drag + 0.9, 0]], t);
      p.shRfl = 0.05 + drag * 1.25; p.shRab = 0.14 + drag * 0.55; p.elbR = 0.25 + drag * 2.0;
      const ex = pulse(t, H.ring[0] + 0.1, 0.2); p.headBob = ex * 0.012; p.lean -= ex * 0.05;
      const [s0, s1] = H.salute;
      const sal = num([[s0, 0], [s0 + 0.3, 1, "out"], [s1 - 0.25, 1], [s1, 0]], t);
      if (sal > 0) { p.shRab = 0.14 + sal * 2.2; p.shRfl = sal * 0.35; p.elbR = 0.25 + sal * 1.9; }
      break;
    }
    default:
      J.root.visible = false;
      return null;
  }
  return p;
}

function stageToy(s, t) {
  const watched = H.looks.find(([a, b]) => t >= a && t < b);
  const tt2 = watched ? watched[0] : t;               // frozen at the moment he looked
  const dancing = s.id === "S7" && tt2 >= H.toyStart && t < H.bothNod[0];
  const p = { ...REST, x: TOY.x, y: TOY.y, z: TOY.z, yaw: Math.PI / 2 - 0.4 };
  if (dancing) {
    const b = Math.sin(Math.PI * (tt2 - H.themeIn) / 0.5);
    p.sway = b * 0.22; p.hTilt = -b * 0.15; p.hop = Math.abs(b) * 0.014;
    p.aLfl = 0.4 + Math.max(0, b) * 0.9; p.aRfl = 0.4 + Math.max(0, -b) * 0.9; p.aLab = 0.5; p.aRab = 0.5;
    p.legL = Math.max(0, b) * 0.5; p.legR = Math.max(0, -b) * 0.5;
    if (watched && watched === H.looks[2]) { p.legL = 0.7; p.aLab = 1.3; p.sway = 0.25 + Math.sin(t * 9) * 0.03 * Math.max(0, 1 - (t - watched[0])); } // caught mid-kick, wobbling
  }
  if (s.id === "S7" && t >= H.bothNod[0]) { p.hPitch = beatBob(t) * 0.25; p.yaw = Math.PI / 2 + 0.3; }
  applyPose(toy, p);
}

// smoke / steam particles
function emitters(s, t) {
  const list = [];
  if (J.root.visible) {
    const anchor = new THREE.Vector3(); J.head.getWorldPosition(anchor);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const sx = Math.abs(J.head.scale.x), sy = J.head.scale.y;
    const du = (0.965 - 0.62) * sx * (J.mirrored ? -1 : 1), dv = (0.27 - 0.035) * sy;
    const tip = anchor.clone().addScaledVector(right, du).addScaledVector(up, dv);
    list.push({ id: 1, pos: tip, rate: 6, life: 1.8, rise: 0.18, size: [0.02, 0.1], alpha: 0.32 });
    for (const [tp, n] of [[H.puff, 3], [H.exhale, 4], [H.ring[0], 0]]) if (t > tp && t < tp + 2.2 && n) list.push({ id: 10 + tp, pos: tip, rate: 30, life: 1.6, rise: 0.12, size: [0.04, 0.22], alpha: 0.4, t0: tp, t1: tp + 0.35 });
  }
  if (s.id === "S3") {
    for (const z of [2.17, 2.73]) list.push({ id: 100 + z, pos: V(2.86, 1.05, z), rate: 18, life: 1.4, rise: 0.35, size: [0.04, 0.2], alpha: 0.5, t0: H.steam[0], t1: H.steam[1] });
  }
  if (props.mug.visible) { const m = new THREE.Vector3().setFromMatrixPosition(props.mug.matrixWorld); m.y += 0.13; list.push({ id: 200, pos: m, rate: 4, life: 1.5, rise: 0.12, size: [0.02, 0.07], alpha: 0.25 }); }
  return list;
}
function updateParticles(s, t) {
  let k = 0;
  for (const e of emitters(s, t)) {
    const t0 = e.t0 ?? s.t0, t1 = e.t1 ?? 1e9;
    const first = Math.max(Math.ceil((t - e.life - t0) * e.rate), 0), last = Math.floor((Math.min(t, t1) - t0) * e.rate);
    for (let n = first; n <= last && k < pool.length; n++) {
      const born = t0 + n / e.rate, age = t - born;
      if (age < 0 || age > e.life) continue;
      const u = age / e.life, h1 = hash(n * 7.3 + e.id), h2 = hash(n * 3.1 + e.id * 2);
      const sp = pool[k++];
      sp.visible = true;
      sp.position.set(e.pos.x + Math.sin(age * 2.1 + h1 * 6) * 0.04 * u + (h2 - 0.5) * 0.02, e.pos.y + e.rise * age, e.pos.z + Math.cos(age * 1.7 + h2 * 6) * 0.04 * u);
      sp.scale.setScalar(e.size[0] + (e.size[1] - e.size[0]) * u);
      sp.material.opacity = e.alpha * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (0.7 + 0.3 * h1);
    }
  }
  for (; k < pool.length; k++) pool[k].visible = false;
}

// cameras
function cameraAt(s, t, p) {
  switch (s.id) {
    case "S1": { const xc = clamp((p ? p.x : -3) + 0.3, -3.9, -1.0); return { pos: V(xc, 1.35, -8.6), tgt: V(xc + 0.1, 1.0, -5.0), fov: 44 }; }
    case "S2": return { pos: V(-0.4, 1.45, 0.3), tgt: V(-0.7, 1.1, -3.0), fov: 44 };
    case "S3": return { pos: V(0.82, 1.58, 3.78), tgt: V(2.55, 1.38, 2.35), fov: 42 };
    case "S4": return { pos: V(-0.35, 1.65, 2.85), tgt: V(-2.6, 1.28, 1.0), fov: 42 };
    case "S5": { const k = EASE.inout(clamp((t - 33.6) / 7.4, 0, 1)); return { pos: V(-2.2 - 0.03 * k, 1.65, 2.05 - 0.2 * k), tgt: V(-2.8 - 0.02 * k, 1.42 - 0.02 * k, -0.2), fov: 40 - 3 * k }; }
    case "S6": return { pos: V(0.82, 1.62, 3.42), tgt: V(0.82 - Math.sin(0.64) * 4, 1.32, 3.42 - Math.cos(0.64) * 4), fov: 58 };
    case "S7": return { pos: V(-0.55, 1.52, -2.05), tgt: V(-2.85, 1.24, -0.62), fov: 40 };
    case "S8": return { pos: V(-1.2, 1.65, -1.1), tgt: V(-2.48, 1.62, -0.08), fov: 40 };
  }
  return { pos: V(0, 1.6, 3), tgt: V(0, 1.5, 0), fov: 50 };
}

// lights
const LAMP_ORDER = ["lamp", "pendant", "corner", "track", "bar", "terrace"];
function lampLevel(group, t) {
  const ton = H.lamps[LAMP_ORDER.indexOf(group)];
  if (t < ton) return 0;
  const u = t - ton;
  return u > 0.22 ? 1 : [0.6, 0.1, 0.9, 0.3, 1][Math.min(4, Math.floor(u / 0.045))];
}
function setLights(s, t) {
  const outside = s.id === "S1";
  const after = smooth(H.needleDrop, H.needleDrop + 2.2, t);
  for (const l of lights.day) {
    const k = outside ? 1 : l.isHemisphereLight ? 0.55 + 0.25 * after : l.isRectAreaLight ? 0.55 : 0.35 + 0.4 * after;
    l.intensity = l.userData.base * k;
  }
  sun.castShadow = false; // the terrace canopy would put the whole forecourt in shade; the key spot shadows him instead
  for (const [grp, list] of Object.entries(lights.groups)) {
    const k = LAMP_ORDER.includes(grp) ? lampLevel(grp, t) : 0;
    for (const l of list) l.intensity = l.userData.base * k;
    for (const m of emis[grp] || []) m.emissiveIntensity = m.userData.base * (0.03 + 0.97 * k);
  }
  const K = {
    S1: [[J.root.position.x + 0.9, 3.4, J.root.position.z - 2.2], [J.root.position.x, 0.8, J.root.position.z], 7],
    S2: [[-0.2, 2.6, -1.6], [-0.9, 0.9, -3.0], 16],
    S3: [[1.2, 2.6, 3.1], [2.6, 1.2, 2.3], 16],
    S4: [[-1.4, 2.6, 2.2], [-2.6, 1.0, 1.0], 15],
    S5: [[-1.9, 2.7, 1.3], [-2.8, 1.0, -0.2], 15],
    S6: [[-1.6, 2.6, 0.8], [-2.9, 1.0, -0.25], 0],
    S7: [[-1.4, 2.5, -0.6], [-2.8, 1.0, -0.5], 10],
    S8: [[-1.5, 2.5, -0.9], [-2.5, 1.4, -0.1], 9],
  }[s.id];
  key.position.set(...K[0]); key.target.position.set(...K[1]); key.intensity = K[2];
  key.castShadow = K[2] > 0;
  key.target.updateMatrixWorld();
  renderer.toneMappingExposure = { S1: 0.9, S2: 0.95, S3: 1.0, S4: 0.95, S5: 0.95 + 0.25 * after, S6: 0.8 + 0.6 * smooth(41.0, 43.0, t), S7: 1.1, S8: 1.12 }[s.id];
}

function stage(s, t) {
  // records flip in the crate (S4); the house sleeve leaves when he pulls it
  crate.items.forEach((it, k) => {
    const order = NC - 1 - k;
    const tf = order < H.flips.length ? H.flips[order] : order === H.flips.length ? H.reveal : Infinity;
    const lean = 0.16 - k * 0.002, fwd = -0.62 + order * 0.032;
    const tt3 = s.id === "S4" ? t : t < 26.6 ? 0 : 1e9;
    it.angle = tt3 < tf ? lean : lean + (fwd - lean) * EASE.back(clamp((tt3 - tf) / 0.18, 0, 1));
    ctx.lps.write(it);
  });
  if (t >= H.pull[0] + 0.05) { _m.makeScale(0, 0, 0); ctx.lps.mesh.setMatrixAt(houseItem.i, _m); }
  ctx.lps.mesh.instanceMatrix.needsUpdate = true;
  // turntable
  const landed = t >= H.placeDisc[1];
  for (const d of ttDisc) d.visible = landed;
  tt.spin.rotation.y = -platterAngle(t);
  tt.armPivot.rotation.y = t < H.armAcross[0] ? 0 : armAngle(t);
  tt.arm.position.y = -0.016 * (1 - armLift(t)) + 0.004;
  // doors
  const e = doorOpen(t); const ee = e * e * (3 - 2 * e);
  shell.doors.left.rotation.y = ee * 1.42; shell.doors.right.rotation.y = -ee * 1.42;
  // characters
  const p0 = stageJDV(s, t);
  if (p0 && window.__poseOverride?.[s.id]) Object.assign(p0, window.__poseOverride[s.id]); // debug: tools/probe.mjs --pose
  const c = cameraAt(s, t, p0);
  camera.position.copy(c.pos); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(c.tgt); camera.updateMatrixWorld();
  if (p0) applyJDV(J, p0, camera);
  stageToy(s, t);
  setLights(s, t);
  updateParticles(s, t);
}

function toFilm(p) { const v = p.clone().project(camera); return [(v.x * 0.5 + 0.5) * GW, (1 - (v.y * 0.5 + 0.5)) * HH]; }
function headFilm() { const p = new THREE.Vector3(); J.head.getWorldPosition(p); p.y += J.head.scale.y * 0.42; return toFilm(p); }

// the logo cards (no text: the brand's own marks)
const CARD_IMG = { oval: ovalImg, peek: peekImg, sign: signImg };
function logoCard(gg, card, seed) {
  gg.save();
  gg.fillStyle = CARD_BG; gg.fillRect(0, 0, GW, HH);
  const grd = gg.createRadialGradient(GW / 2, HH / 2, 80, GW / 2, HH / 2, GW * 0.7);
  grd.addColorStop(0, "rgba(40,36,30,0.35)"); grd.addColorStop(1, "rgba(0,0,0,0)"); gg.fillStyle = grd; gg.fillRect(0, 0, GW, HH);
  decoBorder(gg, 0, 0, GW, HH, TL.cards[card].level, "#ece5d5", seed);
  const im = CARD_IMG[card];
  const s = Math.min((GW * 0.68) / im.width, (HH * 0.6) / im.height);
  gg.drawImage(im, GW / 2 - (im.width * s) / 2, HH / 2 - (im.height * s) / 2, im.width * s, im.height * s);
  gg.restore();
}

function lookAt(s, t) {
  if (s.card) { const end = s.id === "C3"; return { sepia: end ? 0.34 : 0.16, str: end ? 0.3 + smooth(H.burn - 0.6, H.burn, t) * 0.5 : 0.5, crank: 1 }; }
  let { sepia, str } = s;
  if (s.id === "S5") { const a = smooth(H.needleDrop + 0.1, 41.0, t); sepia = 0.12 + 0.22 * a; str = 0.6 - 0.3 * a; }
  return { sepia, str, crank: s.speed || 1 };
}

let cache = { key: null };
function render(t) {
  const frame = Math.round(t * TL.fps);
  const s = shotAt(t);
  const look = lookAt(s, t);
  if (s.card) {
    logoCard(fg, s.card, { oval: 2, peek: 5, sign: 9 }[s.card]);
  } else {
    const tm = crankT(s, t);
    const k3d = `${s.id}:${tm.toFixed(4)}`;
    if (cache.key !== k3d) { stage(s, tm); renderer.render(scene, camera); cache.key = k3d; cache.boil = null; cache.tm = tm; }
    const boil = Math.floor(frame / 2);
    if (cache.boil !== boil) {
      rd.render(renderer.domElement, { frame, gamma: 0.9, contrast: 1.12, levels: 5, gap: 5.5, sigma: 1.15, p: 16, eps: 0.33, washDark: 0.3 });
      cache.boil = boil;
    }
    fg.drawImage(rd.canvas, 0, 0);
    if (s.id === "S3" && tm > H.irisPeek[0]) { const c = headFilm(); iris(fg, GW, HH, c[0], c[1] + 40, num([[H.irisPeek[0], 1100], [H.irisPeek[1] - 0.15, 0, "in"]], tm)); }
    if (s.id === "S8") smokeRing(fg, tm);
  }
  // print
  const lampOn = t >= H.lampClick && t < H.lampOff;
  const motor = smooth(H.motorUp, H.motorUp + 1.0, t);
  const print = fp.render(filmC, { frame, strength: look.str, sepia: look.sepia, crank: look.crank * (0.5 + 0.5 * motor), exposure: lampOn ? 1 : 0 });
  const spill = lampOn ? fp.mean : 0;
  house(g, W, HH, spill);
  g.save();
  roundRect(g, GATE.x, GATE.y, GATE.w, GATE.h, 22); g.clip();
  if (lampOn) g.drawImage(print, GATE.x, GATE.y); else { g.fillStyle = "#050404"; g.fillRect(GATE.x, GATE.y, GATE.w, GATE.h); }
  if (lampOn) damage(g, GATE.x, GATE.y, GATE.w, GATE.h, frame, look.str * (s.card ? 0.6 : 1));
  const bk = s.id === "C3" ? smooth(H.burn, H.burn + 1.1, t) : 0;
  if (lampOn && bk > 0) burn(g, GATE, bk, frame);
  const rim = g.createLinearGradient(GATE.x, 0, GATE.x + GATE.w, 0);
  rim.addColorStop(0, "rgba(0,0,0,.55)"); rim.addColorStop(0.03, "rgba(0,0,0,0)"); rim.addColorStop(0.97, "rgba(0,0,0,0)"); rim.addColorStop(1, "rgba(0,0,0,.55)");
  g.fillStyle = rim; g.fillRect(GATE.x, 0, GATE.w, HH);
  g.restore();
  const open = num([[H.curtainOpen[0], 0], [H.curtainOpen[1], 1, "inout"], [H.curtainClose[0], 1], [H.curtainClose[1], 0, "inout"]], t);
  curtains(g, W, HH, GATE, bk > 0.6 ? 0.9 : spill, open);
  return frame;
}

// the smoke ring he blows becomes the iris
function smokeRing(gg, t) {
  const [r0, r1] = H.ring;
  if (t < r0) return;
  const head = headFilm();
  const from = [head[0] + (J.mirrored ? -60 : 60), head[1] + 80];
  const u = clamp((t - r0) / (r1 - r0), 0, 1), e = EASE.out(u);
  const cx = from[0] + (head[0] - from[0]) * e, cy = from[1] + (head[1] + 40 - from[1]) * e;
  const shut = num([[H.irisShut[0], 1], [H.irisShut[1], 0, "in"]], t);
  const R = (18 + e * 560) * shut;
  if (u >= 1) iris(gg, GW, HH, cx, cy, R, 10);              // past this point the ring is the iris
  gg.save();
  const thick = 10 + e * 46;
  for (let i = 0; i < 3; i++) {
    gg.strokeStyle = `rgba(236,232,224,${(0.38 - i * 0.1) * (u < 1 ? 1 : 0.9)})`;
    gg.lineWidth = thick * (1 - i * 0.28);
    gg.beginPath();
    for (let k = 0; k <= 64; k++) {
      const a = (k / 64) * Math.PI * 2, wob = 1 + 0.035 * Math.sin(a * 5 + t * 3 + i) + 0.02 * Math.sin(a * 11 - t * 2);
      const x = cx + Math.cos(a) * R * wob, y = cy + Math.sin(a) * R * 0.92 * wob;
      k ? gg.lineTo(x, y) : gg.moveTo(x, y);
    }
    gg.closePath(); gg.stroke();
  }
  gg.restore();
}

function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// review helpers: where is he in the frame; raw 3D render
window.__probe = (t) => {
  const s = shotAt(t); if (s.card) return null;
  stage(s, crankT(s, t)); cache.key = null;
  const top = new THREE.Vector3(); J.head.getWorldPosition(top); top.y += J.head.scale.y;
  const feet = J.root.position.clone();
  const f = (v) => toFilm(v).map((x) => Math.round(x));
  return { shot: s.id, head: f(top), feet: f(feet), toy: f(TOY.clone()), cam: camera.position.toArray().map((x) => +x.toFixed(2)) };
};
window.__raw = (t) => { const s = shotAt(t); stage(s, crankT(s, t)); renderer.render(scene, camera); cache.key = null; return renderer.domElement.toDataURL("image/jpeg", 0.85); };
window.DUR = TL.dur;
window.render = render;
window.frameJPEG = (q = 0.9) => out.toDataURL("image/jpeg", q);
window.READY = true;
if (params.has("t")) render(Number(params.get("t")));
