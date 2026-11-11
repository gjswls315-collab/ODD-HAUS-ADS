// ODD HAUS: the storefront (brick piers, timber shopfront, painted fascia, frosted glass) and
// the room behind it. The window opening is x[-2.7, 0.5] y[0.7, 2.85]; the door is x[1.0, 2.0].
import { THREE, box, plane, cyl, tube, halo, solid, toon, glowMat } from './kit.js';
import { rng } from '../core/util.js';

export const ROOM = { x0: -3.45, x1: 3.05, z0: -6.2, z1: 0, h: 3.2 };

export function buildStore(ctx) {
  const { scene, T, world } = ctx;
  const r = rng(77);
  const brick = toon({ map: T.brick, wrap: 0.6 });
  const paintWood = toon({ map: T.woodDark, color: '#6f7a78', wrap: 0.5 });   // old shopfront paint, green-black
  const darkWood = toon({ map: T.woodDark, wrap: 0.5 });
  const snowMat = toon({ color: '#cbd6e0', snow: true, wrap: 0.85 });
  const iron = toon({ color: '#1d2126', wrap: 0.4 });
  const Z0 = 0, Z1 = 0.15, zc = 0.075, th = 0.15;

  // ---- facade masonry
  const pier = (x0, x1, y0, y1) => box(x1 - x0, y1 - y0, th, brick, { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: zc, tile: 2, parent: scene });
  pier(-3.6, -2.7, 0, 3.0); pier(0.5, 1.0, 0, 3.0); pier(2.0, 3.2, 0, 3.0);
  solid('front-wall-L', -3.6, 0, Z0 - 0.02, -2.7, 3.2, Z1); solid('front-wall-M', 0.5, 0, Z0 - 0.02, 1.0, 3.2, Z1); solid('front-wall-R', 2.0, 0, Z0 - 0.02, 3.2, 3.2, Z1);
  solid('window-glass', -2.7, 0, 0.02, 0.5, 3.2, 0.13); solid('door', 1.0, 0, 0.0, 2.0, 3.2, 0.12);
  // stall riser: panelled timber under the window
  box(3.2, 0.7, th + 0.04, paintWood, { x: -1.1, y: 0.35, z: zc + 0.02, tile: 1.2, parent: scene });
  for (let i = 0; i < 4; i++) box(0.68, 0.46, 0.03, paintWood, { x: -2.3 + i * 0.8, y: 0.36, z: Z1 + 0.05, tile: 0.9, parent: scene });
  box(3.3, 0.06, 0.26, paintWood, { x: -1.1, y: 0.715, z: zc + 0.05, parent: scene });         // cill
  box(3.3, 0.035, 0.2, snowMat, { x: -1.1, y: 0.765, z: Z1 + 0.06, parent: scene });
  // head / lintel
  box(6.8, 0.15, th + 0.04, paintWood, { x: -0.2, y: 2.925, z: zc + 0.02, tile: 1.5, parent: scene });
  // fascia sign board
  box(6.8, 0.82, 0.12, darkWood, { x: -0.2, y: 3.41, z: Z1 + 0.04, tile: 1.5, parent: scene });
  plane(6.6, 0.74, toon({ map: T.sign, wrap: 0.85 }), { x: -0.2, y: 3.41, z: Z1 + 0.105, parent: scene });
  box(7.0, 0.14, 0.42, paintWood, { x: -0.2, y: 3.89, z: Z1 + 0.13, tile: 1.5, parent: scene });  // cornice
  box(7.0, 0.09, 0.44, snowMat, { x: -0.2, y: 4.0, z: Z1 + 0.13, parent: scene });
  for (const sx of [-3.55, 3.15]) box(0.16, 0.95, 0.3, paintWood, { x: sx, y: 3.42, z: Z1 + 0.1, parent: scene }); // console brackets
  // upper storey
  plane(6.8, 4.1, toon({ map: T.upper, wrap: 0.75 }), { x: -0.2, y: 6.0, z: Z1, parent: scene });
  box(6.8, 4.2, 6.3, toon({ color: '#0e1218' }), { x: -0.2, y: 6.05, z: -3.0, parent: scene });
  box(6.9, 0.22, 0.4, toon({ color: '#34363a' }), { x: -0.2, y: 8.1, z: Z1 + 0.12, parent: scene });
  box(6.9, 0.1, 0.42, snowMat, { x: -0.2, y: 8.25, z: Z1 + 0.12, parent: scene });
  for (let i = 0; i < 3; i++) { const sx = -0.2 - 6.8 / 2 + 6.8 * (i + 0.5) / 3; box(1.2, 0.07, 0.18, toon({ color: '#3b352f' }), { x: sx, y: 5.02, z: Z1 + 0.07, parent: scene }); box(1.2, 0.05, 0.19, snowMat, { x: sx, y: 5.08, z: Z1 + 0.07, parent: scene }); }
  solid('upper', -3.6, 3.0, -7, 3.2, 12, 0.5);

  // ---- shop window: timber frame, two mullions, a transom, one sheet of old glass with gilt lettering
  const wx0 = -2.7, wx1 = 0.5, wy0 = 0.74, wy1 = 2.85, wz = 0.09;
  const fr = (w, h, x, y) => box(w, h, 0.09, paintWood, { x, y, z: wz, parent: scene });
  fr(0.07, wy1 - wy0, wx0 + 0.035, (wy0 + wy1) / 2); fr(0.07, wy1 - wy0, wx1 - 0.035, (wy0 + wy1) / 2);
  fr(wx1 - wx0, 0.07, (wx0 + wx1) / 2, wy1 - 0.035); fr(wx1 - wx0, 0.05, (wx0 + wx1) / 2, wy0 + 0.025);
  fr(wx1 - wx0, 0.05, (wx0 + wx1) / 2, 2.34);                           // transom bar
  for (const mx of [wx0 + 3.2 / 3, wx0 + 6.4 / 3]) fr(0.045, 0.5, mx, 2.6); // lights above the transom only
  const glass = toon({ map: T.windowDecal, transparent: true, depthWrite: false, wrap: 1, glow: 0.3, color: '#d9dde2' });
  plane(wx1 - wx0, wy1 - wy0, glass, { x: (wx0 + wx1) / 2, y: (wy0 + wy1) / 2, z: wz, parent: scene, order: 3 }).material.side = THREE.DoubleSide;
  world.glows.push({ u: glass.uniforms.uGlow, group: 'storeAll', base: 0.3 });
  world.anchors.window = { x0: wx0, x1: wx1, y0: wy0, y1: wy1, z: wz };

  // ---- door: recessed, half glazed
  const dz = 0.06;
  box(0.07, 2.42, 0.12, paintWood, { x: 1.035, y: 1.21, z: dz, parent: scene }); box(0.07, 2.42, 0.12, paintWood, { x: 1.965, y: 1.21, z: dz, parent: scene });
  box(1.0, 0.07, 0.12, paintWood, { x: 1.5, y: 2.42, z: dz, parent: scene });
  const leaf = new THREE.Group(); leaf.position.set(1.5, 0, dz);
  box(0.1, 2.3, 0.05, paintWood, { x: -0.38, y: 1.2, parent: leaf }); box(0.1, 2.3, 0.05, paintWood, { x: 0.38, y: 1.2, parent: leaf });
  box(0.86, 0.12, 0.05, paintWood, { y: 2.29, parent: leaf }); box(0.86, 0.72, 0.05, paintWood, { y: 0.41, tile: 0.9, parent: leaf });
  box(0.56, 0.44, 0.02, paintWood, { y: 0.4, z: 0.03, tile: 0.7, parent: leaf });
  const dglass = toon({ map: T.doorDecal, transparent: true, depthWrite: false, wrap: 1, glow: 0.3, color: '#d9dde2', side: THREE.DoubleSide });
  plane(0.66, 1.46, dglass, { y: 1.5, parent: leaf, order: 3 });
  world.glows.push({ u: dglass.uniforms.uGlow, group: 'storeAll', base: 0.3 });
  cyl(0.014, 0.014, 0.5, toon({ color: '#b08a4a', wrap: 0.3 }), { x: 0.3, y: 1.1, z: 0.05, parent: leaf, seg: 8 });
  box(0.76, 0.16, 0.012, toon({ color: '#8a6e3e', wrap: 0.3 }), { y: 0.12, z: 0.03, parent: leaf });
  scene.add(leaf);
  const transom = toon({ map: T.doorDecal, transparent: true, depthWrite: false, wrap: 1, glow: 0.25, color: '#b9bfc6', uv: [1, 0.2, 0, 0], side: THREE.DoubleSide });
  plane(0.86, 0.36, transom, { x: 1.5, y: 2.65, z: dz, parent: scene, order: 3 });
  world.glows.push({ u: transom.uniforms.uGlow, group: 'storeAll', base: 0.25 });
  box(1.0, 0.07, 0.3, toon({ color: '#45474b' }), { x: 1.5, y: 0.0, z: 0.2, parent: scene });   // stone step
  box(0.8, 0.02, 0.36, toon({ color: '#3a2a20', wrap: 0.7 }), { x: 1.5, y: 0.045, z: 0.3, parent: scene }); // mat

  // ---- hanging blade sign on an iron bracket
  const bx = -3.35, by = 3.05;
  tube([[bx, by + 0.42, Z1], [bx, by + 0.44, 0.6], [bx, by + 0.42, 1.0]], 0.018, iron, { parent: scene, rs: 5 });
  tube([[bx, by - 0.1, Z1], [bx, by + 0.2, 0.5], [bx, by + 0.42, 0.85]], 0.012, iron, { parent: scene, rs: 5 });
  const blade = toon({ map: T.blade, alphaTest: 0.5, wrap: 0.9, side: THREE.DoubleSide });
  plane(0.62, 0.62, blade, { x: bx, y: by + 0.05, z: 0.62, ry: Math.PI / 2, parent: scene });
  cyl(0.31, 0.31, 0.03, iron, { x: bx, y: by + 0.05, z: 0.62, rz: Math.PI / 2, parent: scene, seg: 28 }).scale.set(1, 0.6, 1);
  for (const dzz of [0.47, 0.77]) cyl(0.006, 0.006, 0.12, iron, { x: bx, y: by + 0.39, z: dzz, parent: scene, seg: 5 });

  // ---- three swan-neck lamps washing the fascia
  for (const lx of [-2.2, -0.2, 1.8]) {
    tube([[lx, 3.98, Z1 + 0.1], [lx, 4.3, Z1 + 0.2], [lx, 4.36, Z1 + 0.55], [lx, 4.2, Z1 + 0.7]], 0.014, iron, { parent: scene, rs: 5 });
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.13, 14, 1, true), toon({ color: '#20262b', side: THREE.DoubleSide, wrap: 0.4 })); shade.position.set(lx, 4.17, Z1 + 0.72); shade.rotation.x = -0.9; scene.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), glowMat('#ffc98a', 3, { additive: false })); bulb.position.set(lx, 4.13, Z1 + 0.69); scene.add(bulb);
    const h = halo(T.glow, '#ffb060', 0.9, 0.55, { x: lx, y: 4.12, z: Z1 + 0.7, parent: scene });
    world.glows.push({ m: bulb.material, group: 'sign', seed: lx }, { m: h.material, group: 'sign', seed: lx });
  }
  world.lights.push({ p: [-0.2, 4.15, 1.25], c: '#ffb46a', i: 1.5, r: 5.2, zone: 0, group: 'sign', seed: 5 });

  // ---- icicle lights along the cornice: cool white, the only "decoration" outside
  const bulbs = [];
  const x0 = -3.6, x1 = 3.2, n = 46;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n + (r() - 0.5) * 0.05, sag = Math.sin((i / n) * Math.PI * 4) * 0.04;
    const drop = r() < 0.35 ? 0 : r.int(1, 5);                 // uneven icicle drops, some bulbs dead
    for (let k = 0; k <= drop; k++) if (r() > 0.12) bulbs.push([x + (r() - 0.5) * 0.03, 3.8 + sag - k * r.range(0.05, 0.085), Z1 + 0.36 + (r() - 0.5) * 0.02, (i + k) % 3]);
  }
  tube(Array.from({ length: 12 }, (_, i) => [x0 + ((x1 - x0) * i) / 11, 3.81 + Math.sin((i / 11) * Math.PI * 4) * 0.04, Z1 + 0.36]), 0.005, iron, { parent: scene, rs: 4, seg: 60 });
  for (let grp = 0; grp < 3; grp++) {
    const list = bulbs.filter((b) => b[3] === grp);
    const mat = glowMat('#cfe6ff', 1.7, { additive: false });
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.011, 6, 5), mat, list.length);
    const m4 = new THREE.Matrix4();
    list.forEach((b, i) => { m4.makeTranslation(b[0], b[1], b[2]); im.setMatrixAt(i, m4); });
    scene.add(im);
    world.glows.push({ m: mat, group: 'sign', twinkle: grp + 1 });
  }
  const ih = halo(T.glow, '#9cc4ff', 5.5, 0.07, { x: -0.2, y: 3.7, z: 0.6, parent: scene }); ih.scale.set(9, 1.6, 1);
  world.glows.push({ m: ih.material, group: 'sign' });
  world.lights.push({ p: [-0.2, 3.5, 0.9], c: '#8fb4e6', i: 0.5, r: 4.5, zone: 0, group: 'sign', seed: 9 });

  // ---- the room
  const wallMat = toon({ map: T.wall, wrap: 0.7, color: '#aaa598' });
  const wallPlane = (w, x, z, ry) => { const p = plane(w, ROOM.h, wallMat, { x, y: ROOM.h / 2, z, ry, parent: scene }); const uv = p.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * w) / 4); return p; };
  const rw = ROOM.x1 - ROOM.x0, rd = ROOM.z1 - ROOM.z0, rcx = (ROOM.x0 + ROOM.x1) / 2, rcz = (ROOM.z0 + ROOM.z1) / 2;
  wallPlane(rd, ROOM.x0, rcz, Math.PI / 2); wallPlane(rd, ROOM.x1, rcz, -Math.PI / 2); wallPlane(rw, rcx, ROOM.z0, 0);
  plane(rw, rd, toon({ map: T.floor, wrap: 0.75 }), { x: rcx, y: 0.001, z: rcz, rx: -Math.PI / 2, tile: 2.6, parent: scene });
  plane(rw, rd, toon({ map: T.woodDark, wrap: 0.7, color: '#8a7a68' }), { x: rcx, y: ROOM.h, z: rcz, rx: Math.PI / 2, tile: 2, parent: scene });
  for (let i = 0; i < 4; i++) box(rw, 0.16, 0.14, darkWood, { x: rcx, y: ROOM.h - 0.08, z: ROOM.z0 + 0.9 + i * 1.5, tile: 1.5, parent: scene });
  // inside face of the front wall above the window head
  box(rw, ROOM.h - 2.85, 0.04, wallMat, { x: rcx, y: (ROOM.h + 2.85) / 2, z: -0.02, parent: scene });
  solid('wall-L', ROOM.x0 - 1, 0, ROOM.z0, ROOM.x0, 4, 0); solid('wall-R', ROOM.x1, 0, ROOM.z0, ROOM.x1 + 1, 4, 0);
  solid('wall-back', ROOM.x0, 0, ROOM.z0 - 1, ROOM.x1, 4, ROOM.z0); solid('ceiling', ROOM.x0, ROOM.h - 0.2, ROOM.z0, ROOM.x1, 4, 0);
  solid('floor', -40, -2, -12, 40, 0.02, 0); solid('street-ground', -40, -2, 0, 40, -0.02, 14);
}
