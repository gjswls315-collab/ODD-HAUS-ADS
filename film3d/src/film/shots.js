// Shot library for the first review: model lineup, story staging for the free camera,
// and three test shots (A: walk with Buddy, B: Bully helps, C: Mr. ODD towers).
// Every shot is a pure function of shot-local time t.
import * as THREE from "three";
import { Path, travel, smooth, smoother, remap, clamp, lerp, track, fbm1, easeInOut, easeOut, window01, bump } from "../core/util.js";
import { roundedBox, mesh } from "../core/geo.js";
import { mat } from "../core/mats.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TINY = ["vin", "picker", "aa", "locke", "rex"];

// ------------------------------------------------------------------ helpers
function show(world, ids) { for (const id of ids) world.cast[id].visible = true; }

/** Move a character along a path between t0..t1 with eased speed; sets pos, yaw, dist, moving. */
function walk(ch, path, t, t0, t1, o = {}) {
  const len = path.length * (o.portion ?? 1);
  const s = travel(t, t0, t1, len, o.accel ?? 0.25);
  const sPrev = travel(t - 0.05, t0, t1, len, o.accel ?? 0.25);
  const v = (s - sPrev) / 0.05;
  const st = ch.state;
  path.at(s, st.pos);
  st.yaw = path.heading(Math.max(0.01, Math.min(path.length - 0.01, s)));
  if (o.yawOffset) st.yaw += o.yawOffset;
  st.dist = s + (o.distOffset ?? 0);
  st.moving = clamp(v / (o.nominal ?? 0.3));
  return { s, v };
}

/** Shot-specific lights (key/rim/fill) that every shot reconfigures. */
function rig(world) {
  if (world.rig) return world.rig;
  const key = new THREE.SpotLight("#ffc48a", 0, 8, 0.5, 0.65, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.015;
  key.shadow.camera.near = 0.1;
  const rim = new THREE.SpotLight("#86a6ff", 0, 8, 0.6, 0.7, 1.6);
  const fill = new THREE.PointLight("#ffb070", 0, 3, 2);
  world.scene.add(key, key.target, rim, rim.target, fill);
  world.rig = { key, rim, fill };
  return world.rig;
}
function lightsOff(world) {
  const r = rig(world);
  r.key.intensity = 0; r.rim.intensity = 0; r.fill.intensity = 0;
}
function setSpot(sp, pos, target, intensity, angle) {
  sp.position.copy(pos); sp.target.position.copy(target); sp.intensity = intensity;
  if (angle) sp.angle = angle;
}

/** Camera with subtle handheld drift. */
function cam(world, pos, target, fov, t, shake = 0.004) {
  const c = world.camera;
  c.position.copy(pos).add(V(fbm1(t * 0.6, 3) * shake, fbm1(t * 0.55, 7) * shake, fbm1(t * 0.5, 11) * shake));
  const tg = target.clone().add(V(fbm1(t * 0.45, 13) * shake * 0.6, fbm1(t * 0.5, 17) * shake * 0.6, 0));
  c.lookAt(tg);
  if (fov && Math.abs(c.fov - fov) > 1e-3) { c.fov = fov; c.updateProjectionMatrix(); }
}
function focusOn(world, point, aperture, maxblur = 0.012) {
  world.stage.setDOF(world.camera.position.distanceTo(point), aperture, maxblur);
}
function centroid(world, ids) {
  const c = V(0, 0, 0);
  for (const id of ids) c.add(world.cast[id].state.pos);
  return c.multiplyScalar(1 / ids.length);
}
function resetStates(world) {
  for (const ch of Object.values(world.cast)) {
    const s = ch.state;
    s.moving = 0; s.run = 0; s.freeze = 0; s.crouch = 0; s.lean = 0; s.tremble = 0;
    s.look = null; s.lookAmt = 0; s.blink = null; s.lid = null; s.custom = {};
  }
}

// ------------------------------------------------------------------ shot props
function clearProps(world) {
  const L = world.lights;
  if (!world.lightBase) world.lightBase = { hall: L.hall.map((l) => l.intensity), lamp: L.lamp.intensity, fill: L.lampFill.intensity };
  L.hall.forEach((l, i) => { l.intensity = world.lightBase.hall[i]; });
  L.lamp.intensity = world.lightBase.lamp; L.lampFill.intensity = world.lightBase.fill;
  if (world.props) world.scene.remove(world.props);
  world.props = new THREE.Group();
  world.props.name = "ShotProps";
  world.scene.add(world.props);
  const bs = world.house.userData.bookStack;
  bs.visible = true;
  bs.position.set(0.95, 0, 0.55);
}

// ------------------------------------------------------------------ LINEUP (review)
export const LINEUP = {
  camera: { pos: [-0.85, 1.05, 1.0], target: [-0.9, 0.72, -2.65], fov: 38 },
  order: ["picker", "vin", "aa", "locke", "rex", "buddy", "bully", "mrodd"],
  xs: [-2.35, -2.12, -1.88, -1.63, -1.36, -0.92, -0.25, 0.55],
  setup(world) {
    clearProps(world);
    resetStates(world);
    lightsOff(world);
    for (const ch of Object.values(world.cast)) ch.visible = true;
    this.order.forEach((id, i) => {
      const ch = world.cast[id];
      ch.state.pos.set(this.xs[i], 0, -2.65 + (id === "buddy" ? 0.05 : 0));
      ch.state.yaw = id === "buddy" ? 0.55 : 0.0;
      if (id === "bully") ch.state.custom.guitar = "back";
    });
    world.stage.setLook({ letterbox: 0 });
  },
  update(t, world) {
    const r = rig(world);
    setSpot(r.key, V(-0.2, 2.3, -0.4), V(-0.9, 0.4, -2.6), 26, 0.85);
    setSpot(r.rim, V(1.2, 1.9, -3.7), V(-1.0, 0.6, -2.5), 10, 0.9);
    r.fill.position.set(-1.8, 0.5, -1.6); r.fill.intensity = 1.2;
    const camPos = world.camera.position;
    for (const id of this.order) {
      const ch = world.cast[id];
      ch.state.look = camPos.clone();
      ch.state.lookAmt = id === "mrodd" ? 0.5 : 0.75;
      ch.state.moving = 0;
    }
    world.cast.buddy.state.custom.tailWag = 0.5;
    world.cast.bully.state.custom.grin = 0.8;
    world.cast.mrodd.state.custom.armR = { x: 0.12, z: -0.1, elbow: 1.45, curl: 0.75 };
  },
  // free-camera staging: characters at story positions around the house
  setupStory(world) {
    clearProps(world);
    resetStates(world);
    lightsOff(world);
    for (const ch of Object.values(world.cast)) ch.visible = true;
    const P = {
      vin: [-1.45, -3.25, 0.3], picker: [1.3, -1.25, -2.6], aa: [-3.0, 1.45, 2.4], locke: [1.05, 2.55, 3.14],
      rex: [-3.45, -1.1, 1.57], buddy: [0.2, -1.0, 0.9], bully: [2.4, 0.4, -2.2], mrodd: [2.15, 3.5, Math.PI],
    };
    for (const [id, [x, z, yaw]] of Object.entries(P)) { const ch = world.cast[id]; ch.state.pos.set(x, 0, z); ch.state.yaw = yaw; }
  },
  updateStory(t, world) {
    const r = rig(world);
    r.key.intensity = 0; r.rim.intensity = 0;
    world.cast.buddy.state.custom.tailWag = 0.3;
    world.cast.buddy.state.custom.sniff = smooth(Math.sin(t * 0.7) * 0.5 + 0.5);
    world.cast.locke.state.look = V(1.1, 1.6, 2.97); world.cast.locke.state.lookAmt = 1;
    world.cast.rex.state.look = V(-3.75, 1.15, -1.5); world.cast.rex.state.lookAmt = 1;
    world.cast.mrodd.state.custom.armR = { x: 0.12, z: -0.1, elbow: 1.45, curl: 0.75 };
  },
};

// ------------------------------------------------------------------ SHOT A
// Tiny friends cross the floor at night with Buddy; floor-level tracking, rug fringe + guitar case parallax.
const A_PATHS = {
  vin: new Path([[1.55, 0, -2.25], [0.9, 0, -2.3], [0.1, 0, -2.22], [-0.85, 0, -2.3]]),
  picker: new Path([[1.75, 0, -2.4], [1.0, 0, -2.45], [0.3, 0, -2.38], [-0.6, 0, -2.42]]),
  locke: new Path([[1.95, 0, -2.2], [1.2, 0, -2.18], [0.4, 0, -2.12], [-0.45, 0, -2.15]]),
  aa: new Path([[2.15, 0, -2.36], [1.45, 0, -2.34], [0.7, 0, -2.3], [-0.2, 0, -2.3]]),
  rex: new Path([[2.4, 0, -2.25], [1.7, 0, -2.25], [1.0, 0, -2.2], [0.25, 0, -2.22]]),
  buddy: new Path([[2.6, 0, -2.75], [1.8, 0, -2.78], [0.9, 0, -2.72], [-0.3, 0, -2.75]]),
};
const A_TIMING = { vin: [0.0, 7.2, 0.34], picker: [0.15, 7.0, 0.36], locke: [0.3, 7.2, 0.3], aa: [0.5, 7.3, 0.28], rex: [0.7, 7.4, 0.24], buddy: [0.2, 7.4, 0.42] };

export const SHOT_A = {
  id: "A", name: "Tiny friends + Buddy cross the house", scene: "02 · NO PLACE / THEY FIND EACH OTHER (test)", duration: 7.0,
  setup(world) {
    clearProps(world);
    resetStates(world);
    show(world, [...TINY, "buddy"]);
    world.stage.setLook({ letterbox: 0, exposure: 1.0 });
  },
  update(t, world) {
    const C = world.cast;
    for (const id of [...TINY, "buddy"]) {
      const [t0, t1, nom] = A_TIMING[id];
      const ch = C[id];
      const portion = id === "rex" ? 0.85 : 1;
      walk(ch, A_PATHS[id], t, t0, t1 + 1.5, { nominal: nom, portion, accel: 0.15 });
    }
    // performances
    C.picker.state.run = 0.35;
    C.picker.state.look = C.vin.state.pos.clone().add(V(0, 0.15, 0)); C.picker.state.lookAmt = window01(t, 1.5, 3.2, 0.4);
    C.locke.state.look = V(1.1, 1.6, 2.97); C.locke.state.lookAmt = window01(t, 2.6, 4.6, 0.5) * 0.9;
    C.aa.state.lid = 0.15;
    C.rex.state.custom.crownTilt = Math.sin(t * 2.3) * 0.03;
    const bd = C.buddy.state;
    bd.custom.sniff = window01(t, 1.2, 2.6, 0.4) + window01(t, 4.6, 5.8, 0.3) * 0.7;
    bd.custom.tailWag = 0.45;
    bd.look = C.rex.state.pos.clone().add(V(0, 0.2, 0));
    bd.lookAmt = window01(t, 3.0, 4.4, 0.5);
    bd.custom.earPerk = window01(t, 5.9, 7.0, 0.3);
    // camera: floor-level dolly tracking the group from the rug side
    const g = centroid(world, ["vin", "picker", "locke", "aa"]);
    const camPos = V(g.x + 0.45, 0.09 + 0.02 * smooth(remap(t, 0, 7)), -1.3);
    const camTgt = V(g.x - 0.05, 0.17, -2.4);
    cam(world, camPos, camTgt, 34, t, 0.003);
    focusOn(world, C.vin.state.pos.clone().add(V(0, 0.12, 0)), 0.035, 0.014);
    // lighting: low warm key from the lamp side, cool moon rim from the window
    const r = rig(world);
    setSpot(r.key, V(g.x - 0.9, 0.9, -0.7), V(g.x, 0.1, -2.3), 9, 0.7);
    setSpot(r.rim, V(g.x + 1.4, 1.2, -3.6), V(g.x, 0.12, -2.3), 14, 0.6);
    r.fill.position.set(g.x + 0.3, 0.25, -1.6); r.fill.intensity = 0.25;
    world.stage.setLook({ letterbox: 0.24 });
  },
};

// ------------------------------------------------------------------ SHOT B
// A fallen book blocks the gap between coffee table and sofa. A hand comes down, lifts it:
// tilt up to Bully (crouched, backward cap, guitar). He checks the hallway, then signals GO.
const B_PATHS = {
  vin: new Path([[-1.55, 0, 0.94], [-0.8, 0, 0.92], [0.0, 0, 0.94], [0.45, 0, 0.95], [0.9, 0, 1.0], [1.7, 0, 0.98]]),
  picker: new Path([[-1.65, 0, 0.84], [-0.9, 0, 0.82], [-0.05, 0, 0.85], [0.42, 0, 0.87], [0.95, 0, 0.92], [1.75, 0, 0.88]]),
  locke: new Path([[-1.8, 0, 0.8], [-1.05, 0, 0.8], [-0.12, 0, 0.8], [0.36, 0, 0.82], [0.85, 0, 0.88], [1.6, 0, 0.9]]),
  aa: new Path([[-1.95, 0, 0.9], [-1.2, 0, 0.9], [-0.2, 0, 0.9], [0.3, 0, 0.92], [0.8, 0, 0.98], [1.55, 0, 0.98]]),
  rex: new Path([[-2.1, 0, 1.06], [-1.35, 0, 1.06], [-0.3, 0, 1.06], [0.22, 0, 1.06], [0.72, 0, 1.06], [1.45, 0, 1.05]]),
};
// distance along each path where they halt in front of the book (book face at x≈0.475)
const B_STOP = { vin: 1.97, picker: 2.0, locke: 2.02, aa: 2.06, rex: 2.1 };
const BOOK_AT = V(0.5, 0.165, 0.95);

export const SHOT_B = {
  id: "B", name: "Bully lifts the book, signals GO", scene: "04 · BULLY (test)", duration: 7.6,
  setup(world) {
    clearProps(world);
    resetStates(world);
    show(world, [...TINY, "buddy", "bully"]);
    // the blocking book: a big hardcover standing on its edge across the gap
    const cover = mat({ color: "#5b1f1c", roughness: 0.55, clearcoat: 0.3 });
    const book = new THREE.Group();
    book.name = "BlockingBook";
    book.add(roundedBox(0.05, 0.32, 0.25, 0.006, cover, 3));
    const pages = roundedBox(0.044, 0.3, 0.012, 0.002, mat({ color: "#e9dfc6", roughness: 0.9 }), 1);
    pages.position.z = 0.121;
    book.add(pages);
    const band = roundedBox(0.052, 0.02, 0.252, 0.003, mat({ color: "#b8893e", roughness: 0.35, metalness: 0.7 }), 1);
    band.position.y = 0.11;
    const band2 = band.clone(); band2.position.y = -0.11;
    book.add(band, band2);
    book.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    world.props.add(book);
    this.book = book;
    world.house.userData.bookStack.position.set(0.58, 0, 0.6);
    world.house.userData.bookStack.rotation.y = 0.4;
    world.stage.setLook({ letterbox: 0.24 });
  },
  update(t, world) {
    const C = world.cast;
    // tiny friends: walk in, halt at the book, freeze when the hand appears, then scurry past
    for (const id of TINY) {
      const ch = C[id];
      const p = B_PATHS[id];
      const stop = B_STOP[id];
      const delay = { vin: 0, picker: 0.1, locke: 0.25, aa: 0.4, rex: 0.55 }[id];
      const s1 = travel(t, delay, 2.1 + delay * 0.4, stop, 0.25);
      const s2 = travel(t, 5.95 + delay * 0.35, 7.6 + delay * 0.4, p.length - stop, 0.25);
      const s = s1 + s2;
      const sp = s1 + s2 - (travel(t - 0.05, delay, 2.1 + delay * 0.4, stop, 0.25) + travel(t - 0.05, 5.95 + delay * 0.35, 7.6 + delay * 0.4, p.length - stop, 0.25));
      p.at(s, ch.state.pos);
      ch.state.yaw = p.heading(Math.max(0.01, s));
      ch.state.dist = s;
      ch.state.moving = clamp(sp / 0.05 / 0.3);
      ch.state.run = smooth(remap(t, 5.9, 6.3)) * 0.8;
      const fr = smooth(remap(t, 2.05, 2.35)) * (1 - smooth(remap(t, 5.4, 5.9)));
      ch.state.freeze = fr;
      ch.state.tremble = fr * (id === "aa" ? 1 : 0.5);
      // look up at the hand, then at Bully, then forward
      ch.state.look = t < 4.5 ? V(0.52, 0.6, 0.95) : V(0.92, 0.95, 0.66);
      ch.state.lookAmt = smooth(remap(t, 2.0, 2.5)) * (1 - smooth(remap(t, 6.0, 6.5)));
    }
    C.aa.state.custom.charge = 0.1;
    C.aa.state.custom.ledOn = window01(t, 2.1, 5.8, 0.1) * (0.5 + 0.5 * Math.sin(t * 18));
    // Buddy waits behind, then trots past
    const bd = C.buddy.state;
    const bpath = new Path([[-2.5, 0, 0.82], [-1.6, 0, 0.8], [-0.4, 0, 0.78], [0.6, 0, 0.78], [1.8, 0, 0.82]]);
    const bs = travel(t, 0.2, 2.4, 1.15, 0.4) + travel(t, 6.2, 7.6, bpath.length - 1.15, 0.3);
    bpath.at(bs, bd.pos);
    bd.yaw = bpath.heading(Math.max(0.01, bs));
    bd.dist = bs;
    bd.moving = clamp(window01(t, 0.3, 2.3, 0.6) + window01(t, 6.2, 7.6, 0.4));
    bd.custom.trot = smooth(remap(t, 6.2, 6.6));
    bd.custom.earPerk = window01(t, 2.0, 4.4, 0.3);
    bd.custom.tailWag = 0.2 + window01(t, 4.4, 7.6, 0.5) * 0.6;
    bd.look = t < 4.4 ? V(0.5, 0.5, 0.95) : V(0.92, 0.95, 0.66);
    bd.lookAmt = smooth(remap(t, 2.1, 2.6));
    // Bully: crouched behind the book; reaches, lifts, checks hallway, signals GO
    const by = C.bully.state;
    by.pos.set(0.95, 0, 0.6);
    by.yaw = -Math.PI / 2 + 0.55;
    by.custom.crouch = 0.68;
    by.custom.spineBend = 0.25;
    by.custom.guitar = "back";
    const bookTop = V(0.5, 0.335, 0.95);
    const lift = smoother(remap(t, 2.75, 3.7));
    const handR = new THREE.Vector3().lerpVectors(V(0.6, 0.85, 0.85), bookTop, smooth(remap(t, 1.85, 2.55)));
    handR.lerp(V(0.68, 0.72, 0.82), lift);
    by.custom.ikR = { target: handR, w: smooth(remap(t, 1.7, 2.0)), twist: -0.3 };
    by.custom.armR = { curl: lerp(0.2, 0.75, smooth(remap(t, 2.45, 2.7))) };
    // GO gesture with the left hand (two flicks toward +x)
    const go = window01(t, 5.15, 6.6, 0.25);
    const flick = Math.sin(remap(t, 5.25, 6.55) * Math.PI * 2) * 0.5 + 0.5;
    const handL = V(lerp(0.74, 1.08, flick), lerp(0.66, 0.54, flick), lerp(0.96, 1.2, flick));
    by.custom.ikL = { target: handL, w: go, twist: 0.4 };
    by.custom.armL = { curl: 0.1, spread: 0.6 };
    // head: book -> hallway (sound) -> friends
    by.look = t < 3.9 ? bookTop.clone().lerp(V(0.68, 0.62, 0.82), lift) : t < 5.0 ? V(2.15, 1.3, 3.2) : V(0.35, 0.05, 0.95);
    by.lookAmt = 1;
    by.custom.grin = t < 3.9 ? 0.25 : t < 5.0 ? 0.0 : smooth(remap(t, 5.2, 5.6)) * 0.9;
    by.custom.browUp = t > 3.9 && t < 5.0 ? 1 : 0;
    // camera: low behind the group -> tilt/crane up to reveal Bully -> settle as they pass
    const reveal = smoother(remap(t, 2.6, 4.3));
    const settle = smooth(remap(t, 5.9, 7.2));
    const p0 = V(-0.72, 0.1, 0.95), p1 = V(-0.2, 0.44, 1.12), p2 = V(-0.05, 0.3, 1.18);
    const camPos = p0.clone().lerp(p1, reveal).lerp(p2, settle);
    const trail = Math.min(...TINY.map((id) => C[id].state.pos.x)) - 0.55;
    camPos.x = lerp(Math.min(trail, camPos.x), camPos.x, smooth(remap(t, 1.6, 2.6)));
    const tg0 = V(0.5, 0.16, 0.95), tg1 = V(0.86, 0.86, 0.72), tg2 = V(0.95, 0.45, 0.92);
    const camTgt = tg0.clone().lerp(tg1, reveal).lerp(tg2, settle);
    cam(world, camPos, camTgt, lerp(36, 40, reveal), t, 0.003);
    const fpt = t < 2.6 ? V(0.5, 0.2, 0.95) : t < 6.0 ? V(0.86, 0.92, 0.68) : C.vin.state.pos.clone().add(V(0, 0.12, 0));
    focusOn(world, fpt, lerp(0.03, 0.016, reveal), 0.012);
    // lighting: warm practical spill from the floor lamp + cool rim
    const r = rig(world);
    setSpot(r.key, V(-0.4, 1.6, 2.0), V(0.75, 0.5, 0.8), 8, 0.6);
    setSpot(r.rim, V(1.9, 1.4, -0.3), V(0.8, 0.6, 0.8), 7, 0.7);
    r.fill.position.set(0.2, 0.35, 1.25); r.fill.intensity = 0.25;
  },
  post(t, world) {
    // the book rides in Bully's right hand once gripped
    const hand = world.cast.bully.rig.all.get("righthand");
    const book = this.book;
    const grip = smooth(remap(t, 2.5, 2.7));
    const rest = BOOK_AT.clone();
    if (grip <= 0 || !hand) { book.position.copy(rest); book.rotation.set(0, 0, 0); return; }
    hand.updateWorldMatrix(true, false);
    const hp = new THREE.Vector3(0, -0.06, 0).applyMatrix4(hand.matrixWorld);
    const target = hp.clone().add(V(0, -0.15, 0));
    book.position.lerpVectors(rest, target, grip);
    book.rotation.set(0, smooth(remap(t, 2.8, 3.8)) * -0.6, smooth(remap(t, 2.8, 3.8)) * 0.35);
  },
};

// ------------------------------------------------------------------ SHOT C
// Mr. ODD arrives from the hallway. Tiny POV tilt: slipper -> robe -> mug -> moustache -> eyes.
// Then the reverse: from his eye-line, everyone frozen. Long silence.
export const SHOT_C = {
  id: "C", name: "Mr. ODD towers over them", scene: "05 · CAUGHT (test)", duration: 8.4,
  setup(world) {
    clearProps(world);
    resetStates(world);
    show(world, [...TINY, "buddy", "bully", "mrodd"]);
    world.stage.setLook({ letterbox: 0.24 });
    this.base = world.lightBase;
  },
  update(t, world) {
    const C = world.cast;
    const cut = 5.0;
    // group positions (they were heading for the stairs, now caught in the open)
    const place = { vin: [1.72, 1.52, 0.35], picker: [2.24, 1.44, -0.3], aa: [2.42, 1.64, -0.45], locke: [1.5, 1.7, 0.5], rex: [1.66, 1.24, 0.6] };
    for (const [id, [x, z, yaw]] of Object.entries(place)) {
      const s = C[id].state;
      s.pos.set(x, 0, z); s.yaw = yaw + Math.PI * 0;
      s.moving = 0;
      const fr = smooth(remap(t, 1.4, 1.9));
      s.freeze = fr; s.tremble = fr * 0.35;
      s.look = C.mrodd.state.pos.clone().add(V(0, 1.55, 0)); s.lookAmt = smooth(remap(t, 1.8, 3.5));
    }
    C.aa.state.custom.ledOn = window01(t, 2.0, 8.4, 0.2) * (0.5 + 0.5 * Math.sin(t * 16));
    C.aa.state.custom.charge = 0.05;
    const bd = C.buddy.state;
    bd.pos.set(1.35, 0, 1.75); bd.yaw = 0.55;
    bd.custom.earsDown = smooth(remap(t, 2.4, 3.2));
    bd.custom.tailWag = 0.25 * (1 - smooth(remap(t, 1.5, 2.5)));
    bd.custom.headTilt = -0.1;
    bd.look = V(2.12, 1.5, 2.55); bd.lookAmt = smooth(remap(t, 1.6, 2.4));
    const by = C.bully.state;
    by.pos.set(0.95, 0, 1.25); by.yaw = 0.85;
    by.custom.guitar = "back";
    by.custom.grin = 0.0;
    by.custom.browUp = 0.3;
    by.custom.weightShift = -0.4;
    by.look = V(2.12, 1.6, 2.55); by.lookAmt = smooth(remap(t, 1.4, 2.2));
    by.custom.armL = { x: -0.15, z: -0.05, elbow: 0.25, curl: 0.6 };
    by.custom.armR = { x: -0.1, z: -0.05, elbow: 0.25, curl: 0.6 };
    // Mr. ODD: heavy walk from the hallway, stops in the doorway, looks down. No smile.
    const od = C.mrodd.state;
    const path = new Path([[2.13, 0, 5.4], [2.14, 0, 4.2], [2.12, 0, 3.1], [2.1, 0, 2.55]]);
    const { v } = walk(C.mrodd, path, t, 0.0, 2.35, { nominal: 0.95, accel: 0.12 });
    od.moving = clamp(v / 1.15) * (1 - smooth(remap(t, 2.0, 2.5)));
    od.custom.mug = true;
    od.custom.armR = { x: 0.12, z: -0.1, elbow: 1.45, curl: 0.75 };
    od.look = centroid(world, TINY).add(V(0, 0.1, 0)); od.lookAmt = smooth(remap(t, 2.4, 4.0));
    od.custom.spineBend = smooth(remap(t, 3.0, 5.0)) * 0.12;
    od.custom.twitch = window01(t, 4.0, 4.6, 0.1);
    od.blink = t > 5.6 && t < 5.8 ? Math.sin(remap(t, 5.6, 5.8) * Math.PI) : 0;
    // light: hallway glow gets blocked; overall the darkest moment
    const dim = smooth(remap(t, 1.5, 3.0));
    world.lights.hall.forEach((l, i) => { l.intensity = this.base.hall[i] * (1 + 0.15 * (1 - dim)); });
    world.lights.lamp.intensity = this.base.lamp * (1 - 0.5 * dim);
    world.lights.lampFill.intensity = this.base.fill * (1 - 0.5 * dim);
    const r = rig(world);
    if (t < cut) {
      // tiny POV: slipper -> robe -> mug -> moustache -> eyes
      const tilt = smoother(remap(t, 2.2, 4.9));
      const camPos = V(1.86, 0.08, 1.05).add(V(0, 0.03 * tilt, 0.05 * tilt));
      const ty = track([[0, 0.06], [2.2, 0.08], [2.9, 0.42], [3.5, 0.95], [4.2, 1.52], [4.9, 1.68]], t, smooth);
      const camTgt = V(2.11, ty, 2.55);
      cam(world, camPos, camTgt, lerp(38, 30, tilt), t, 0.0025);
      focusOn(world, V(2.11, Math.min(ty, 1.6), 2.55), 0.018, 0.012);
      setSpot(r.key, V(1.95, 0.3, 1.4), V(2.1, 1.4, 2.55), 1.0 + 1.4 * tilt, 0.6); // faint under-light from below (their POV)
      setSpot(r.rim, V(2.1, 1.9, 4.2), V(2.1, 1.3, 2.55), 12, 0.6);
      r.fill.intensity = 0;
    } else {
      // reverse: from his eye-line, looking down at the frozen group
      const k = smooth(remap(t, cut, 8.4));
      const camPos = V(2.78, 2.42, 3.12).lerp(V(2.72, 2.33, 3.02), k);
      const camTgt = V(1.68, 0.15, 1.5);
      cam(world, camPos, camTgt, lerp(42, 38, k), t, 0.0015);
      focusOn(world, C.vin.state.pos.clone().add(V(0, 0.12, 0)), 0.02, 0.012);
      setSpot(r.key, V(2.1, 2.3, 2.9), V(1.6, 0.1, 1.5), 11, 0.6);
      setSpot(r.rim, V(0.4, 1.0, 0.6), V(1.8, 0.2, 1.5), 4, 0.7);
      r.fill.intensity = 0;
    }
  },
};

export const SHOTS = { A: SHOT_A, B: SHOT_B, C: SHOT_C };
export const REEL = ["A", "B", "C"];
