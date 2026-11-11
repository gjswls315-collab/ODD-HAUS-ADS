// Inside ODD HAUS after closing: counter and hi-fi, record wall and bins, the garment wall,
// the wrapping table, the window display and the poster.
import { THREE, box, plane, cyl, tube, lathe, halo, contact, solid, toon, glowMat } from './kit.js';
import { rng } from '../core/util.js';
import { makeRecordMaterial } from './fx.js';
import { ROOM } from './store.js';

const HP = Math.PI / 2;

function pendant(ctx, x, y, z, group, { size = 1, light = null } = {}) {
  const { scene, T, world } = ctx;
  const g = new THREE.Group(); g.position.set(x, y, z);
  cyl(0.006, 0.006, ROOM.h - y, toon({ color: '#0d0d0d' }), { y: (ROOM.h - y) / 2, parent: g, seg: 5 });
  const enamel = toon({ color: '#27322f', wrap: 0.5, side: THREE.DoubleSide });
  lathe([[0.03, 0.0], [0.05, -0.05], [0.09, -0.09], [0.24 * size, -0.2], [0.25 * size, -0.215]], enamel, { parent: g });
  const inner = glowMat('#ffd9a0', 0.9, { additive: false }); inner.side = THREE.BackSide;
  lathe([[0.045, -0.055], [0.085, -0.092], [0.235 * size, -0.2]], inner, { parent: g });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), glowMat('#ffd9a0', 3.2, { additive: false })); bulb.position.y = -0.17; g.add(bulb);
  scene.add(g);
  const h = halo(T.glow, '#ffb060', 1.5 * size, 0.5, { x, y: y - 0.18, z, parent: scene });
  world.glows.push({ m: inner, group, seed: x }, { m: bulb.material, group, seed: x }, { m: h.material, group, seed: x });
  if (light) world.lights.push({ p: [x, y - 0.25, z], ...light, zone: 1, group, seed: x * 3 + z });
  solid('pendant', x - 0.27, y - 0.3, z - 0.27, x + 0.27, ROOM.h, z + 0.27);
}

function hanger(parent, mat, hookMat, w = 0.21) {
  tube([[-w, -0.075, 0], [-w * 0.5, -0.03, 0], [0, 0, 0], [w * 0.5, -0.03, 0], [w, -0.075, 0]], 0.011, mat, { parent, rs: 6, seg: 16 });
  tube([[0, 0, 0], [0, 0.05, 0], [0.022, 0.085, 0], [0, 0.11, 0], [-0.022, 0.09, 0]], 0.0035, hookMat, { parent, rs: 5, seg: 14 });
}

// a garment plane that curves gently round an invisible body
function garmentPlane(w, h, mat, bend = 0.05) {
  const geo = new THREE.PlaneGeometry(w, h, 28, 20);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2); p.setZ(i, -bend * x * x); }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

function buildTurntable(ctx, x, y, z) {
  const { scene, T, world } = ctx;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = -HP; // front faces the room (-x)
  const veneer = toon({ map: T.wood, wrap: 0.5 });
  box(0.46, 0.075, 0.36, veneer, { y: 0.0525, tile: 0.5, parent: g });
  for (const [fx, fz] of [[-0.19, -0.14], [0.19, -0.14], [-0.19, 0.14], [0.19, 0.14]]) cyl(0.025, 0.022, 0.016, toon({ color: '#101010' }), { x: fx, y: 0.008, z: fz, parent: g, seg: 10 });
  plane(0.46, 0.36, toon({ map: T.ttTop, wrap: 0.8 }), { y: 0.0905, rx: -HP, parent: g });
  const C = [-0.0503, 0];                                    // platter centre (matches the painted top)
  const steel = toon({ color: '#8f8b82', wrap: 0.35 });
  cyl(0.160, 0.160, 0.02, steel, { x: C[0], y: 0.102, z: C[1], parent: g, seg: 48 });
  // strobe dots round the platter rim
  const dots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0022, 0.0034, 0.0012), toon({ color: '#1a1a1a' }), 120);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const spin = new THREE.Group(); spin.position.set(C[0], 0, C[1]); g.add(spin);
  for (let i = 0; i < 120; i++) { const a = (i / 120) * 6.283; q.setFromEuler(new THREE.Euler(0, -a + HP, 0)); m4.compose(new THREE.Vector3(Math.cos(a) * 0.1605, 0.102, Math.sin(a) * 0.1605), q, new THREE.Vector3(1, 1, 1)); dots.setMatrixAt(i, m4); }
  spin.add(dots);
  cyl(0.152, 0.152, 0.004, toon({ color: '#121212', wrap: 0.6 }), { y: 0.114, parent: spin, seg: 40 });   // rubber mat
  const recMat = makeRecordMaterial(T.label, world);
  const rec = plane(0.302, 0.302, recMat, { y: 0.1178, rx: -HP, parent: spin });
  cyl(0.0035, 0.0035, 0.02, steel, { y: 0.125, parent: spin, seg: 8 });
  // warm strobe glow leaking from under the platter
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.159, 0.171, 48), glowMat('#ff9a3c', 0.22)); ring.rotation.x = -HP; ring.position.set(C[0], 0.0915, C[1]); g.add(ring);
  world.glows.push({ m: ring.material, group: 'storeC' });

  // tonearm
  const P = [0.165, -0.09];                                   // pivot
  cyl(0.03, 0.034, 0.03, steel, { x: P[0], y: 0.105, z: P[1], parent: g, seg: 16 });
  cyl(0.012, 0.012, 0.04, steel, { x: P[0], y: 0.135, z: P[1], parent: g, seg: 10 });
  const arm = new THREE.Group(); arm.position.set(P[0], 0.15, P[1]); g.add(arm);
  const L = 0.226;
  const armTilt = new THREE.Group(); arm.add(armTilt);
  cyl(0.0042, 0.0042, L + 0.02, steel, { z: (L - 0.02) / 2 - 0.0, rx: HP, parent: armTilt, seg: 8 }).position.z = L / 2 - 0.01;
  cyl(0.017, 0.017, 0.04, toon({ color: '#2a2a2a', wrap: 0.4 }), { rx: HP, parent: armTilt, seg: 14 }).position.z = -0.045;
  cyl(0.004, 0.004, 0.05, steel, { rx: HP, parent: armTilt, seg: 6 }).position.z = -0.02;
  const head = new THREE.Group(); head.position.z = L; head.rotation.y = 0.38; armTilt.add(head);
  box(0.013, 0.003, 0.034, toon({ color: '#1b1b1b', wrap: 0.4 }), { z: 0.012, parent: head });
  box(0.0105, 0.009, 0.015, toon({ color: '#c9bfa6', wrap: 0.4 }), { y: -0.0065, z: 0.018, parent: head });
  box(0.0108, 0.003, 0.0152, toon({ color: '#7a2f1c', wrap: 0.4 }), { y: -0.0035, z: 0.018, parent: head });
  cyl(0.0009, 0.0003, 0.008, steel, { y: -0.015, z: 0.022, parent: head, seg: 5 });
  box(0.003, 0.003, 0.03, steel, { x: 0.014, y: 0.002, z: 0.03, parent: head }).rotation.y = -0.5; // finger lift
  cyl(0.005, 0.005, 0.03, steel, { x: P[0] + 0.045, y: 0.12, z: P[1] + 0.02, parent: g, seg: 6 });   // cue lever
  // arm rest post
  cyl(0.005, 0.005, 0.05, steel, { x: P[0] + 0.012, y: 0.115, z: P[1] + 0.15, parent: g, seg: 6 });
  scene.add(g);
  contact(0.7, 0.6, { x, y: y + 0.002, z, parent: scene, opacity: 0.6 });

  const D = Math.hypot(P[0] - C[0], P[1] - C[1]);
  world.tick.push((t) => {
    const ang = -t * (33.333 / 60) * Math.PI * 2;             // clockwise, 33 1/3 rpm
    spin.rotation.y = ang;
    recMat.uniforms.uAngle.value = ang;
    // slight warp: the disc rides up and down once a revolution, and the arm follows it
    const warp = Math.sin(ang * 1.0 + 1.0);
    rec.position.y = 0.1178 + 0.0004 * warp;
    spin.rotation.z = 0.0035 * Math.sin(ang); spin.rotation.x = 0.0035 * Math.cos(ang);
    // stylus tracks slowly inward: find the arm angle that puts it at radius rr from the spindle
    const rr = 0.121 - 0.0045 * (t / 40);
    const a = (L * L - rr * rr + D * D) / (2 * D * L);
    const base = Math.atan2(C[0] - P[0], C[1] - P[1]);       // direction pivot -> spindle (about +y, from +z)
    arm.rotation.y = base + Math.acos(Math.min(1, Math.max(-1, a))) * 1.0;
    armTilt.rotation.x = 0.058 - 0.0022 * warp;
  });
  world.anchors.turntable = new THREE.Vector3(x, y + 0.118, z);
  // where the stylus meets the groove (for the macro set-up)
  world.tick[world.tick.length - 1](12);
  g.updateMatrixWorld(true);
  world.anchors.stylus = head.localToWorld(new THREE.Vector3(0, -0.019, 0.022));
  return g;
}

function buildSpeaker(ctx, x, y, z, ry, phase) {
  const { scene, T, world } = ctx;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
  const W = 0.32, H = 0.512, D = 0.27, BF = 0.036;
  const cab = toon({ map: T.wood, wrap: 0.5, color: '#b08e6a' });
  box(W, H, D, cab, { y: H / 2, tile: 0.5, parent: g });
  for (const sx of [-1, 1]) box(0.016, H, BF, cab, { x: sx * (W / 2 - 0.008), y: H / 2, z: D / 2 + BF / 2, parent: g });
  for (const sy of [0.008, H - 0.008]) box(W, 0.016, BF, cab, { y: sy, z: D / 2 + BF / 2, parent: g });
  plane(W, H, toon({ color: '#0b0b0b' }), { y: H / 2, z: D / 2 + 0.001, parent: g });
  plane(W, H, toon({ map: T.speaker, wrap: 0.8, alphaTest: 0.5 }), { y: H / 2, z: D / 2 + BF, parent: g });
  // woofer: real cone, surround and dust cap behind the cut-out
  const wy = H * (1 - 500 / 820), R = W * (190 / 512);
  const drv = new THREE.Group(); drv.position.set(0, wy, D / 2 + BF - 0.002); drv.rotation.x = HP; g.add(drv);
  lathe([[R * 1.02, 0.0], [R * 0.97, 0.006], [R * 0.9, 0.008], [R * 0.84, 0.003], [R * 0.82, -0.002]], toon({ color: '#1c1c1c', wrap: 0.6, side: THREE.DoubleSide }), { parent: drv, seg: 40 });
  const cone = new THREE.Group(); drv.add(cone);
  lathe([[R * 0.82, -0.002], [R * 0.6, -0.014], [R * 0.3, -0.028]], toon({ color: '#4a463d', wrap: 0.7, side: THREE.DoubleSide }), { parent: cone, seg: 40 });
  lathe([[R * 0.3, -0.028], [R * 0.24, -0.018], [R * 0.12, -0.012], [0.0005, -0.01]], toon({ color: '#26241f', wrap: 0.7, side: THREE.DoubleSide }), { parent: cone, seg: 28 });
  const rr = new THREE.Mesh(new THREE.TorusGeometry(R * 0.6, 0.0012, 5, 40), toon({ color: '#141414' })); rr.rotation.x = HP; rr.position.y = -0.014; cone.add(rr);
  scene.add(g);
  world.tick.push((t, s) => {
    const k = s.kick, b = s.bass;
    cone.position.y = (k * 0.0048 + b * 0.0016 * Math.sin(t * 55 + phase)) * s.levels.music;
    g.scale.setScalar(1 + k * 0.0018 * s.levels.music);
  });
  return g;
}

export function buildInterior(ctx) {
  const { scene, T, world } = ctx;
  const r = rng(321);
  const wood = toon({ map: T.wood, wrap: 0.55 });
  const darkWood = toon({ map: T.woodDark, wrap: 0.55 });
  const pale = toon({ map: T.woodPale, wrap: 0.6, color: '#b8a184' });
  const iron = toon({ color: '#1d2126', wrap: 0.4 });
  const sleeveMats = T.sleeves.map((m) => toon({ map: m, wrap: 0.85 }));
  const spineMats = T.spines.map((m) => toon({ map: m, wrap: 0.8 }));
  const cardboard = toon({ color: '#b9ad92', wrap: 0.7 });

  // ---------------- lights that hang in the room
  pendant(ctx, -1.3, 2.12, -1.72, 'storeA', { light: { c: '#ffca92', i: 0.92, r: 4.6 } });
  pendant(ctx, 0.25, 2.2, -3.55, 'storeB', { light: { c: '#ffca92', i: 0.9, r: 4.8 } });
  pendant(ctx, 2.25, 2.0, -4.3, 'storeC', { size: 0.85, light: { c: '#ffcf9c', i: 0.95, r: 3.8 } });
  pendant(ctx, -1.95, 2.42, -5.25, 'storeC', { size: 1.1, light: { c: '#ffc88c', i: 1.0, r: 4.2 } });
  world.lights.push({ p: [-0.6, 2.2, -4.9], c: '#ffd2a0', i: 0.6, r: 3.4, zone: 1, group: 'storeC', seed: 31 });   // poster fill
  world.lights.push({ p: [-2.6, 2.35, -3.3], c: '#ffca92', i: 0.95, r: 3.8, zone: 1, group: 'storeB', seed: 32 });  // garment wall
  world.lights.push({ p: [-1.1, 2.4, -0.55], c: '#ffc080', i: 0.8, r: 3.4, zone: 1, group: 'storeA', seed: 33 });  // window bay

  // warm string lights looping under the ceiling and along the window head
  const strings = [
    [[-3.3, 3.05, -0.4], [-1.6, 2.72, -1.6], [0.2, 3.0, -2.6], [1.6, 2.74, -3.9], [2.9, 3.02, -5.6]],
    [[2.9, 3.05, -0.5], [1.2, 2.76, -1.7], [-0.4, 3.0, -3.0], [-2.0, 2.78, -4.4], [-3.3, 3.02, -5.9]],
    [[-2.62, 2.78, -0.07], [-1.9, 2.7, -0.07], [-1.1, 2.78, -0.07], [-0.3, 2.7, -0.07], [0.42, 2.78, -0.07]],
  ];
  const cordMat = toon({ color: '#0d0d0d' });
  strings.forEach((pts, si) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.004, 4), cordMat));
    const n = si === 2 ? 15 : 22;
    for (let grp = 0; grp < 2; grp++) {
      const mat = glowMat('#ffc47a', 2.6, { additive: false });
      const list = []; for (let i = grp; i < n; i += 2) list.push(curve.getPoint((i + 0.5) / n));
      const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.017, 7, 5), mat, list.length);
      const m4 = new THREE.Matrix4(); list.forEach((p, i) => { m4.makeTranslation(p.x, p.y - 0.022, p.z); im.setMatrixAt(i, m4); });
      scene.add(im);
      world.glows.push({ m: mat, group: si === 2 ? 'storeA' : 'storeB', twinkle: 4 + si * 2 + grp });
      if (si === 2 && grp === 0) list.forEach((p) => { const h = halo(T.glow, '#ffb060', 0.3, 0.3, { x: p.x, y: p.y - 0.02, z: p.z, parent: scene }); world.glows.push({ m: h.material, group: 'storeA', twinkle: 8 }); });
    }
  });

  // ---------------- counter + hi-fi (right wall)
  const cx0 = 1.55, cx1 = 2.98, cz0 = -5.4, cz1 = -3.2, ch = 0.92;
  box(cx1 - cx0, ch - 0.04, cz1 - cz0, darkWood, { x: (cx0 + cx1) / 2, y: (ch - 0.04) / 2, z: (cz0 + cz1) / 2, tile: 1.2, parent: scene });
  box(cx1 - cx0 + 0.08, 0.045, cz1 - cz0 + 0.08, wood, { x: (cx0 + cx1) / 2 - 0.02, y: ch - 0.0225, z: (cz0 + cz1) / 2, tile: 1.1, parent: scene });
  plane(cz1 - cz0, ch - 0.06, toon({ map: T.counter, wrap: 0.8 }), { x: cx0 - 0.002, y: (ch - 0.06) / 2, z: (cz0 + cz1) / 2, ry: -HP, parent: scene });
  solid('counter', cx0 - 0.06, 0, cz0 - 0.04, cx1, ch + 0.02, cz1 + 0.04);
  contact(2.0, 2.9, { x: cx0 + 0.3, y: 0.004, z: (cz0 + cz1) / 2, parent: scene, opacity: 0.55 });
  buildTurntable(ctx, 2.24, ch, -4.28);
  solid('turntable', 2.0, ch, -4.55, 2.5, ch + 0.2, -4.0);
  // receiver
  const amp = new THREE.Group(); amp.position.set(2.32, ch, -4.92); amp.rotation.y = -HP;
  box(0.46, 0.12, 0.3, toon({ map: T.wood, wrap: 0.5, color: '#8f7458' }), { y: 0.072, tile: 0.5, parent: amp });
  plane(0.46, 0.115, toon({ map: T.amp, wrap: 0.85, glow: 0.12 }), { y: 0.072, z: 0.1505, parent: amp });
  const vu = [];
  for (const vx of [-0.1446, -0.0369]) { // meters: a glowing window and a needle each
    const gl = plane(0.088, 0.048, glowMat('#ffb050', 0.75), { x: vx, y: 0.082, z: 0.152, parent: amp });
    world.glows.push({ m: gl.material, group: 'storeC' });
    const nd = new THREE.Group(); nd.position.set(vx, 0.052, 0.1535); amp.add(nd);
    box(0.0012, 0.044, 0.0006, toon({ color: '#151515' }), { y: 0.022, parent: nd });
    vu.push(nd);
  }
  scene.add(amp);
  world.tick.push((t, s) => { vu.forEach((n, i) => { n.rotation.z = 0.75 - (0.35 + 0.9 * s.level * (0.9 + 0.1 * Math.sin(t * 31 + i * 2))) * s.levels.music; }); });
  // "now playing" easel with the hero sleeve
  const np = new THREE.Group(); np.position.set(2.2, ch, -3.58); np.rotation.y = -HP + 0.32;
  plane(0.315, 0.315, toon({ map: T.heroSleeve, wrap: 0.9 }), { y: 0.172, z: 0.012, rx: -0.2, parent: np });
  box(0.317, 0.317, 0.006, cardboard, { y: 0.172, z: 0.008, parent: np }).rotation.x = -0.2;
  box(0.34, 0.016, 0.06, wood, { y: 0.008, z: 0.03, parent: np }); box(0.02, 0.3, 0.012, wood, { y: 0.15, z: -0.03, parent: np }).rotation.x = -0.32;
  plane(0.13, 0.05, toon({ map: T.dividers[3], wrap: 0.9 }), { x: -0.08, y: 0.034, z: 0.064, rx: -0.3, parent: np });
  scene.add(np);
  world.anchors.heroSleeve = new THREE.Vector3(2.2, ch + 0.17, -3.58);
  // a loose stack of 45s and sleeves
  for (let i = 0; i < 5; i++) { const s = box(0.315, 0.005, 0.315, sleeveMats[i % 6], { x: 2.68, y: ch + 0.004 + i * 0.006, z: -3.52, ry: r.range(-0.3, 0.3), parent: scene }); s.material = [cardboard, cardboard, sleeveMats[(i + 2) % 6], cardboard, cardboard, cardboard]; }
  // speakers on a wall shelf above the counter
  box(0.34, 0.04, 2.3, wood, { x: 2.86, y: 1.72, z: -4.3, tile: 1, parent: scene });
  for (const bz of [-5.2, -3.4]) box(0.3, 0.26, 0.03, iron, { x: 2.89, y: 1.58, z: bz, parent: scene });
  buildSpeaker(ctx, 2.84, 1.74, -3.62, -HP + 0.22, 0);
  buildSpeaker(ctx, 2.84, 1.74, -5.0, -HP - 0.22, 2);
  solid('speakers', 2.55, 1.6, -5.3, 3.05, 2.35, -3.3);
  // a few records filed between the speakers
  plane(0.9, 0.31, spineMats[0], { x: 2.72, y: 1.9, z: -4.3, ry: -HP, parent: scene }).material.uniforms.uUv.value.set(0.5, 1, 0.2, 0);
  box(0.3, 0.31, 0.9, toon({ color: '#1a1714' }), { x: 2.875, y: 1.895, z: -4.3, parent: scene });
  // stool
  cyl(0.17, 0.17, 0.04, wood, { x: 1.2, y: 0.66, z: -4.5, parent: scene, seg: 18 });
  for (let k = 0; k < 4; k++) { const a = k * HP + 0.4; tube([[1.2 + Math.cos(a) * 0.1, 0.64, -4.5 + Math.sin(a) * 0.1], [1.2 + Math.cos(a) * 0.19, 0, -4.5 + Math.sin(a) * 0.19]], 0.014, iron, { parent: scene, seg: 2, rs: 5 }); }
  solid('stool', 1.0, 0, -4.7, 1.4, 0.7, -4.3);

  // ---------------- back wall: THE POSTER, flyers, record shelves
  const PW = 1.16, PH = PW * (2048 / 1448), px = -0.72, py = 1.72, pz = ROOM.z0 + 0.012;
  contact(PW * 1.25, PH * 1.15, { x: px + 0.03, y: py - 0.04, z: pz - 0.006, parent: scene, opacity: 0.5, wall: true });
  // older bills pasted underneath and around it
  const fl = (i, x, y, w, rz) => plane(w, w * 1.406, toon({ map: T.flyers[i], wrap: 0.95, color: '#d8d0c0' }), { x, y, z: ROOM.z0 + 0.006, rz, parent: scene });
  fl(0, -1.62, 2.18, 0.36, 0.03); fl(1, -1.6, 1.62, 0.34, -0.04); fl(2, -1.62, 1.08, 0.36, 0.02); fl(3, -2.42, 1.75, 0.5, -0.02); fl(1, 0.12, 2.3, 0.3, 0.05); fl(0, -2.44, 1.02, 0.34, 0.03);
  const posterMat = toon({ map: T.poster, alphaTest: 0.5, wrap: 1 });
  const poster = plane(PW, PH, posterMat, { x: px, y: py, z: pz, parent: scene, seg: [10, 14] });
  // the sheet is not perfectly flat: corners lift a few millimetres off the wall
  { const p = poster.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (PW / 2), v = p.getY(i) / (PH / 2); p.setZ(i, 0.006 * Math.pow(Math.abs(u * v), 2.2) + 0.0025 * Math.sin(v * 5.0) * Math.sin(u * 3.0)); } poster.geometry.computeVertexNormals(); }
  world.anchors.poster = { x: px, y: py, z: pz, w: PW, h: PH, tip: new THREE.Vector3(px + (T.posterTip.u - 0.5) * PW, py + (T.posterTip.v - 0.5) * PH, pz + 0.012) };

  // record shelves to the right of the poster
  const sx0 = 0.5, sx1 = 2.95, sw = sx1 - sx0, sz = ROOM.z0 + 0.17;
  for (const sy of [0.42, 0.86, 1.3, 1.74, 2.2]) box(sw, 0.03, 0.34, wood, { x: (sx0 + sx1) / 2, y: sy, z: sz, tile: 1, parent: scene });
  for (const vx of [sx0, (sx0 + sx1) / 2, sx1 - 0.02]) box(0.035, 2.2 - 0.0, 0.34, wood, { x: vx, y: 1.1 + 0.02, z: sz, tile: 1, parent: scene });
  box(sw, 2.2, 0.02, toon({ color: '#17120e' }), { x: (sx0 + sx1) / 2, y: 1.1, z: ROOM.z0 + 0.012, parent: scene });
  [0.44, 0.88].forEach((sy, j) => { const p = plane(sw - 0.06, 0.33, spineMats[j % 2], { x: (sx0 + sx1) / 2, y: sy + 0.18, z: sz + 0.12, parent: scene }); p.material = toon({ map: T.spines[j % 2], wrap: 0.8, uv: [1.6, 1, j * 0.37, 0] }); });
  { const p = plane(sw - 0.06, 0.33, toon({ map: T.spines[1], wrap: 0.8, uv: [1.6, 1, 0.61, 0] }), { x: (sx0 + sx1) / 2, y: 0.02 + 0.2, z: sz + 0.12, parent: scene }); p.position.y = 0.21; }
  // face-out sleeves on the top two shelves
  let k = 0;
  for (const sy of [1.315, 1.755]) for (let i = 0; i < 7; i++) {
    const x = sx0 + 0.2 + i * 0.335;
    const s = plane(0.305, 0.305, sleeveMats[(k * 5 + 1) % 6], { x, y: sy + 0.16, z: sz + 0.1, rx: -0.14, parent: scene });
    box(0.307, 0.307, 0.012, cardboard, { x, y: sy + 0.16, z: sz + 0.09, parent: scene }).rotation.x = -0.14;
    s.rotation.z = r.range(-0.012, 0.012); k++;
  }
  solid('record-shelves', sx0 - 0.03, 0, ROOM.z0, sx1, 2.3, ROOM.z0 + 0.36);

  // ---------------- browsing bins in the middle of the floor
  const bin = (bx, bz, ry, labels) => {
    const g = new THREE.Group(); g.position.set(bx, 0, bz); g.rotation.y = ry;
    const BW = 1.5, BD = 0.82;
    box(BW, 0.5, BD, pale, { y: 0.47, tile: 0.9, parent: g });
    for (const [lx, lz] of [[-0.68, -0.34], [0.68, -0.34], [-0.68, 0.34], [0.68, 0.34]]) box(0.06, 0.24, 0.06, pale, { x: lx, y: 0.12, z: lz, parent: g });
    for (const lz of [-0.4, 0.0, 0.4]) box(BW, 0.2, 0.018, pale, { y: 0.8, z: lz, tile: 0.9, parent: g });
    for (const lx of [-0.75, -0.25, 0.25, 0.75]) box(0.018, 0.2, BD, pale, { x: lx, y: 0.8, parent: g, tile: 0.9 });
    let q = 0;
    for (const row of [-1, 1]) for (let col = 0; col < 3; col++) {
      const x = -0.5 + col * 0.5, z0 = row * 0.2;
      // a block of filed records leaning back; the front sleeve shows its cover
      const blk = new THREE.Group(); blk.position.set(x, 0.72, z0); blk.rotation.x = -0.2 * row; blk.rotation.y = row > 0 ? 0 : Math.PI; g.add(blk);
      box(0.31, 0.31, 0.3, toon({ color: '#16130f' }), { y: 0.155, parent: blk });
      plane(0.31, 0.3, toon({ map: T.spines[q % 2], wrap: 0.8, uv: [0.3, 1, q * 0.13, 0] }), { y: 0.312, rx: -HP, parent: blk }).rotation.z = HP;
      plane(0.31, 0.31, sleeveMats[(q * 2 + col) % 6], { y: 0.155, z: 0.152, parent: blk });
      const card = plane(0.12, 0.045, toon({ map: T.dividers[(q + labels) % 6], wrap: 0.9, side: THREE.DoubleSide }), { x: r.range(-0.06, 0.06), y: 0.335, z: r.range(-0.08, 0.08), parent: blk });
      card.rotation.x = 0.12; q++;
    }
    scene.add(g);
    contact(BW * 1.3, BD * 1.5, { x: bx, y: 0.004, z: bz, parent: scene, opacity: 0.6, ry });
  };
  bin(0.2, -3.5, 0, 0);
  solid('bin', -0.6, 0, -3.95, 1.0, 1.1, -3.05);
  plane(2.8, 1.75, toon({ map: T.rug, wrap: 0.8 }), { x: 0.0, y: 0.004, z: -2.5, rx: -HP, rz: 0.03, parent: scene });
  // crates of unsorted records on the floor by the window bay
  for (const [x, z, ry, si] of [[-3.05, -1.0, 0.1, 0], [-3.02, -1.45, -0.06, 2]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = HP + ry;
    box(0.36, 0.3, 0.5, pale, { y: 0.15, tile: 0.6, parent: g }); plane(0.31, 0.44, toon({ map: T.spines[si % 2], wrap: 0.8, uv: [0.45, 1, si * 0.2, 0] }), { y: 0.33, rx: -HP, parent: g });
    plane(0.31, 0.31, sleeveMats[si + 1], { y: 0.19, z: 0.256, rx: -0.05, parent: g }); scene.add(g);
  }
  solid('crates-in', -3.45, 0, -1.75, -2.8, 0.55, -0.75);

  // ---------------- garment wall (left)
  const railX = ROOM.x0 + 0.26, railY = 1.98;
  tube([[railX, railY, -2.1], [railX, railY, -5.2]], 0.014, toon({ color: '#6e5a3c', wrap: 0.3 }), { parent: scene, seg: 2, rs: 8 });
  for (const bz of [-2.15, -3.65, -5.15]) { tube([[ROOM.x0, railY + 0.16, bz], [railX, railY + 0.13, bz], [railX, railY, bz]], 0.01, iron, { parent: scene, seg: 10, rs: 5 }); }
  box(0.34, 0.03, 3.2, wood, { x: ROOM.x0 + 0.17, y: 2.36, z: -3.65, tile: 1, parent: scene });
  // folded stock on the shelf above
  for (let i = 0; i < 9; i++) { const col = ['#27364f', '#d0c6aa', '#5c4634', '#1d1c1b', '#7a553d'][i % 5]; const n = 2 + (i % 3); for (let j = 0; j < n; j++) box(0.28, 0.045, 0.3, toon({ color: col, wrap: 0.7 }), { x: ROOM.x0 + 0.17, y: 2.4 + j * 0.047, z: -2.25 - i * 0.34, ry: r.range(-0.05, 0.05), parent: scene }); }
  const hangMat = toon({ map: T.woodPale, wrap: 0.5 }), hookMat = toon({ color: '#8a7a5a', wrap: 0.3 });
  // hero: navy work jacket, face-out
  const jz = -2.82, tz = -3.86, gx = ROOM.x0 + 0.27;
  const jacket = new THREE.Group(); jacket.position.set(gx, railY - 0.115, jz); jacket.rotation.y = HP;
  hanger(jacket, hangMat, hookMat, 0.225);
  const jTop = 0.07 + 0.025; // canvas top sits this far above the shoulders
  const jBack = garmentPlane(1.024, 0.85, toon({ map: T.jacket, alphaTest: 0.5, wrap: 0.9, color: '#3a3f4a', sway: 0.006, swayPhase: 1.3 }), 0.02); jBack.position.set(0, jTop - 0.425, -0.035); jacket.add(jBack);
  const jFront = garmentPlane(1.024, 0.85, toon({ map: T.jacket, alphaTest: 0.5, wrap: 0.9, sway: 0.007, swayPhase: 1.3, side: THREE.DoubleSide }), 0.05); jFront.position.set(0, jTop - 0.425, 0.034); jacket.add(jFront);
  // 4x repaint of the chest pocket laid exactly over the same spot, for the close-up
  const jd = plane(0.23, 0.23, toon({ map: T.jacketDetail, transparent: true, depthWrite: false, wrap: 0.9, sway: 0.007, swayPhase: 1.3 }), { x: 0.145, y: jTop - 0.025 - 0.305, z: 0.0325, parent: jacket, order: 2 });
  jd.userData.note = 'detail';
  const lab = plane(0.062, 0.031, toon({ map: T.wovenLabel, wrap: 1 }), { x: 0, y: jTop - 0.025 - 0.05, z: 0.038, parent: jacket });
  lab.rotation.x = -0.12;
  scene.add(jacket);
  world.anchors.jacket = new THREE.Vector3(gx + 0.03, railY - 0.115 + jTop - 0.425, jz);
  world.anchors.pocket = new THREE.Vector3(gx + 0.02, railY - 0.115 + jTop - 0.025 - 0.305, jz - 0.145);
  world.anchors.label = new THREE.Vector3(gx + 0.01, railY - 0.115 + jTop - 0.025 - 0.048, jz);
  // hero: cream tee with the character print
  const tee = new THREE.Group(); tee.position.set(gx, railY - 0.115, tz); tee.rotation.y = HP;
  hanger(tee, hangMat, hookMat, 0.215);
  const tTop = 0.06 + 0.03;
  const tBack = garmentPlane(0.896, 0.896, toon({ map: T.tee, alphaTest: 0.5, wrap: 0.9, color: '#6f6657', sway: 0.008, swayPhase: 4.1 }), 0.02); tBack.position.set(0, tTop - 0.448, -0.03); tee.add(tBack);
  const tFront = garmentPlane(0.896, 0.896, toon({ map: T.tee, alphaTest: 0.5, wrap: 0.9, sway: 0.009, swayPhase: 4.1, side: THREE.DoubleSide }), 0.05); tFront.position.set(0, tTop - 0.448, 0.034); tee.add(tFront);
  scene.add(tee);
  world.anchors.tee = new THREE.Vector3(gx + 0.03, railY - 0.115 + tTop - 0.4, tz);
  // the rest of the rail, side-on
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(); g.position.set(gx, railY - 0.115, -4.42 - i * 0.085); g.rotation.y = r.range(-0.1, 0.1);
    hanger(g, hangMat, hookMat, 0.2);
    const sg = plane(0.3, 1.05, toon({ map: T.sideGarments[i % 6], alphaTest: 0.5, wrap: 0.9, side: THREE.DoubleSide, sway: 0.004, swayPhase: i * 1.7 }), { x: 0.02, y: -0.5, parent: g }); sg.rotation.y = HP;
    const sg2 = plane(0.5, 1.02, toon({ map: T.sideGarments[(i + 3) % 6], alphaTest: 0.5, wrap: 0.9, side: THREE.DoubleSide, sway: 0.004, swayPhase: i * 1.7 }), { x: 0.02, y: -0.49, parent: g });
    scene.add(g);
  }
  solid('garments', ROOM.x0, 0.9, -5.3, ROOM.x0 + 0.42, 2.7, -2.1);

  // ---------------- the wrapping table
  const tx = -1.3, tz0 = -1.72, th = 0.78;
  box(1.5, 0.04, 0.86, wood, { x: tx, y: th - 0.02, z: tz0, tile: 0.9, parent: scene });
  box(1.36, 0.09, 0.72, darkWood, { x: tx, y: th - 0.085, z: tz0, tile: 0.9, parent: scene });
  for (const [lx, lz] of [[-0.66, -0.34], [0.66, -0.34], [-0.66, 0.34], [0.66, 0.34]]) box(0.06, th - 0.04, 0.06, darkWood, { x: tx + lx, y: (th - 0.04) / 2, z: tz0 + lz, parent: scene });
  contact(2.1, 1.4, { x: tx, y: 0.004, z: tz0, parent: scene, opacity: 0.6 });
  solid('table', tx - 0.78, 0, tz0 - 0.46, tx + 0.78, th + 0.02, tz0 + 0.46);
  const Y = th + 0.001;
  // a cut sheet of ODD HAUS paper and the roll it came from
  plane(0.74, 0.5, toon({ map: T.wrap, wrap: 0.9, uv: [1.4, 0.95, 0.1, 0.2] }), { x: tx - 0.3, y: Y + 0.001, z: tz0 - 0.02, rx: -HP, rz: Math.PI + 0.12, parent: scene });
  const roll = cyl(0.036, 0.036, 0.78, toon({ map: T.wrap, wrap: 0.8, uv: [1, 3, 0, 0] }), { x: tx - 0.25, y: Y + 0.036, z: tz0 - 0.33, rz: HP, parent: scene, seg: 18 }); roll.rotation.y = 0.06;
  cyl(0.03, 0.03, 0.782, toon({ color: '#6b563b' }), { x: tx - 0.25, y: Y + 0.036, z: tz0 - 0.33, rz: HP, parent: scene, seg: 12 }).rotation.y = 0.06;
  // the gift: wrapped box, twine, tag
  const gift = new THREE.Group(); gift.position.set(tx + 0.2, Y, tz0 - 0.02); gift.rotation.y = 0.28;
  const GW = 0.25, GH = 0.105, GD = 0.19;
  box(GW, GH, GD, toon({ map: T.gift, wrap: 0.85 }), { y: GH / 2, tile: 0.3, parent: gift });
  const twine = toon({ color: '#7d5a3f', wrap: 0.6 });
  box(GW + 0.004, GH + 0.004, 0.012, twine, { y: GH / 2, parent: gift }); box(0.012, GH + 0.004, GD + 0.004, twine, { y: GH / 2, parent: gift });
  for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.004, 6, 16), twine); t.position.set(s * 0.024, GH + 0.012, 0); t.rotation.set(HP * 0.7, 0, s * 0.5); t.scale.set(1.2, 0.8, 1); gift.add(t); }
  tube([[0, GH + 0.005, 0], [0.04, GH + 0.004, 0.05], [0.07, GH + 0.003, 0.085]], 0.003, twine, { parent: gift, rs: 5 }); tube([[0, GH + 0.005, 0], [-0.05, GH + 0.004, 0.04], [-0.085, GH + 0.003, 0.06]], 0.003, twine, { parent: gift, rs: 5 });
  plane(0.075, 0.047, toon({ map: T.tag, wrap: 0.95, side: THREE.DoubleSide }), { x: 0.085, y: GH + 0.004, z: 0.03, rx: -HP, rz: -0.5, parent: gift });
  scene.add(gift); contact(0.42, 0.34, { x: tx + 0.2, y: Y + 0.002, z: tz0 - 0.02, parent: scene, opacity: 0.55 });
  world.anchors.gift = new THREE.Vector3(tx + 0.2, Y + 0.06, tz0 - 0.02);
  // paper carrier bag
  const bag = new THREE.Group(); bag.position.set(tx + 0.52, Y, tz0 - 0.24); bag.rotation.y = -0.28;
  const kraft = toon({ color: '#b8946a', wrap: 0.8 }), bagFace = toon({ map: T.bag, wrap: 0.9 });
  const bb = box(0.25, 0.31, 0.105, kraft, { y: 0.155, parent: bag }); bb.material = [kraft, kraft, toon({ color: '#3d2c1c' }), kraft, bagFace, bagFace];
  for (const sz2 of [-0.03, 0.03]) tube([[-0.06, 0.305, sz2], [-0.045, 0.37, sz2], [0, 0.39, sz2], [0.045, 0.37, sz2], [0.06, 0.305, sz2]], 0.0035, twine, { parent: bag, rs: 5 });
  scene.add(bag); contact(0.4, 0.26, { x: tx + 0.52, y: Y + 0.002, z: tz0 - 0.24, parent: scene, opacity: 0.5 });
  world.anchors.bag = new THREE.Vector3(tx + 0.52, Y + 0.17, tz0 - 0.24);
  // enamel mug of coffee
  const mug = new THREE.Group(); mug.position.set(tx - 0.02, Y, tz0 + 0.22);
  const enamel = toon({ color: '#d9d0b8', wrap: 0.6, side: THREE.DoubleSide });
  lathe([[0.0, 0.0], [0.036, 0.0], [0.038, 0.004], [0.04, 0.082], [0.0415, 0.085]], enamel, { parent: mug });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0408, 0.0022, 6, 28), toon({ color: '#1c2a3f' })); rim.rotation.x = HP; rim.position.y = 0.085; mug.add(rim);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 16, Math.PI * 1.1), enamel); hd.position.set(0.043, 0.044, 0); hd.rotation.z = -HP * 1.1; mug.add(hd);
  cyl(0.0385, 0.0385, 0.002, toon({ color: '#1b0f08', wrap: 0.3 }), { y: 0.074, parent: mug, seg: 24 });
  mug.rotation.y = 2.3; scene.add(mug); contact(0.16, 0.16, { x: tx - 0.02, y: Y + 0.002, z: tz0 + 0.22, parent: scene, opacity: 0.6 });
  // a ring the mug left earlier
  const ringM = new THREE.Mesh(new THREE.RingGeometry(0.034, 0.038, 24), new THREE.MeshBasicMaterial({ color: 0x120a05, transparent: true, opacity: 0.35, depthWrite: false })); ringM.rotation.x = -HP; ringM.position.set(tx + 0.1, Y + 0.0015, tz0 + 0.3); scene.add(ringM);
  // cassette and its case
  const tape = box(0.102, 0.012, 0.064, toon({ color: '#1c1b1a' }), { x: tx + 0.26, y: Y + 0.006, z: tz0 + 0.26, ry: 0.5, parent: scene });
  tape.material = [tape.material, tape.material, toon({ map: T.cassette, wrap: 0.9 }), tape.material, tape.material, tape.material];
  box(0.108, 0.016, 0.07, toon({ color: '#b9b2a2', wrap: 0.6 }), { x: tx + 0.42, y: Y + 0.008, z: tz0 + 0.2, ry: -0.3, parent: scene });
  world.anchors.cassette = new THREE.Vector3(tx + 0.26, Y + 0.012, tz0 + 0.26);
  // an LP half out of its sleeve
  const lp = new THREE.Group(); lp.position.set(tx - 0.42, Y + 0.004, tz0 + 0.2); lp.rotation.y = -0.22;
  box(0.315, 0.004, 0.315, cardboard, { parent: lp }).material = [cardboard, cardboard, sleeveMats[3], cardboard, cardboard, cardboard];
  const lpRec = plane(0.302, 0.302, makeRecordMaterial(T.label, world), { x: 0.11, y: -0.0005, rx: -HP, parent: lp }); lpRec.renderOrder = 0;
  lp.children[0].position.y = 0.002;
  scene.add(lp);
  // twine, scissors-less: a ball of string and a pencil
  cyl(0.03, 0.03, 0.05, twine, { x: tx + 0.62, y: Y + 0.025, z: tz0 + 0.3, parent: scene, seg: 14 });
  cyl(0.0035, 0.0035, 0.17, toon({ color: '#c79a3a' }), { x: tx - 0.62, y: Y + 0.004, z: tz0 + 0.33, rz: HP, parent: scene, seg: 6 }).rotation.y = 0.4;

  // ---------------- window display (seen from the street)
  const dy = 0.62;
  box(3.1, dy, 0.66, darkWood, { x: -1.1, y: dy / 2, z: -0.38, tile: 1.2, parent: scene });
  plane(3.1, 0.66, toon({ color: '#3b2c24', wrap: 0.8 }), { x: -1.1, y: dy + 0.002, z: -0.38, rx: -HP, parent: scene });
  solid('window-display', -2.68, 0, -0.74, 0.48, dy + 0.75, -0.02);
  const easel = (x, z, w, h, mat, ry = 0, tilt = -0.16) => {
    const g = new THREE.Group(); g.position.set(x, dy, z); g.rotation.y = ry;
    plane(w, h, mat, { y: h / 2 + 0.012, z: 0.01, rx: tilt, parent: g }); box(w + 0.004, h + 0.004, 0.006, toon({ color: '#4d4336', wrap: 0.6 }), { y: h / 2 + 0.012, z: 0.004, parent: g }).rotation.x = tilt;
    box(w * 0.7, 0.014, 0.07, wood, { y: 0.007, z: 0.03, parent: g });
    scene.add(g); contact(w * 1.3, 0.3, { x, y: dy + 0.004, z, parent: scene, opacity: 0.5 });
  };
  easel(-1.92, -0.36, 0.5, 0.703, toon({ map: T.windowCard, wrap: 0.95 }), 0.14);
  easel(-1.25, -0.4, 0.315, 0.315, toon({ map: T.heroSleeve, wrap: 0.95 }), -0.05);
  easel(-0.82, -0.34, 0.315, 0.315, sleeveMats[3], 0.1);
  easel(-0.4, -0.42, 0.315, 0.315, sleeveMats[0], -0.12);
  // folded tees and a small lightbox
  for (let j = 0; j < 4; j++) box(0.3, 0.035, 0.26, toon({ color: j % 2 ? '#d0c6aa' : '#27364f', wrap: 0.7 }), { x: -2.4, y: dy + 0.018 + j * 0.036, z: -0.36, ry: 0.2 + j * 0.03, parent: scene });
  const lb = new THREE.Group(); lb.position.set(0.06, dy, -0.3); lb.rotation.y = -0.2;
  box(0.52, 0.22, 0.08, toon({ color: '#141414' }), { y: 0.13, parent: lb });
  const lbFace = plane(0.5, 0.195, glowMat('#ffffff', 1.5, { map: T.openLate, additive: false }), { y: 0.13, z: 0.041, parent: lb });
  scene.add(lb);
  world.glows.push({ m: lbFace.material, group: 'open' });
  const lh = halo(T.glow, '#ff9d3c', 1.3, 0.22, { x: 0.06, y: dy + 0.13, z: -0.22, parent: scene }); world.glows.push({ m: lh.material, group: 'open' });
}
