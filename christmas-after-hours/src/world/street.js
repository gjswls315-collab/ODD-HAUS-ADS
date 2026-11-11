// The winter street: an old brick lane at night. Real geometry for everything the camera gets
// close to, painted 2.5D facades for the sleeping neighbours.
import { THREE, box, plane, cyl, tube, halo, solid, toon, glowMat } from './kit.js';
import { rng } from '../core/util.js';

export const STREET = { x0: -18, x1: 18, pavZ: 2.2, roadY: -0.14, farZ: 8.0, farWall: 9.8 };

const SKY_FRAG = /* glsl */ `
varying vec3 vDir; uniform float uTime;
float h21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 top = vec3(0.012, 0.020, 0.036), hor = vec3(0.060, 0.085, 0.125);
  vec3 col = mix(hor, top, pow(h, 0.55));
  vec2 p = d.xz / (d.y + 0.35) * 2.2 + vec2(uTime * 0.012, 0.0);
  float cl = vn(p) * 0.6 + vn(p * 2.3) * 0.3 + vn(p * 5.1) * 0.1;
  col += vec3(0.05, 0.065, 0.09) * smoothstep(0.45, 0.85, cl) * (1.0 - h * 0.6);
  col += vec3(0.10, 0.06, 0.03) * pow(1.0 - h, 6.0); // the town's sodium glow on the cloud base
  gl_FragColor = vec4(col, 1.0);
}`;

function lampPost(ctx, x, z, lightDef) {
  const { scene, T, world } = ctx;
  const iron = toon({ color: '#1d2126', wrap: 0.4 });
  const g = new THREE.Group(); g.position.set(x, z < 4 ? 0 : 0, z);
  cyl(0.11, 0.15, 0.9, iron, { y: 0.45, parent: g, seg: 10 });
  cyl(0.16, 0.18, 0.1, iron, { y: 0.05, parent: g, seg: 10 });
  cyl(0.055, 0.075, 2.7, iron, { y: 2.25, parent: g, seg: 10 });
  cyl(0.09, 0.06, 0.12, iron, { y: 3.62, parent: g, seg: 10 });
  box(0.5, 0.035, 0.035, iron, { y: 3.25, parent: g }); // ladder bar
  // lantern: tapered four-sided glass with an iron cap
  const glass = glowMat('#ffc477', 2.6, { additive: false });
  const lant = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.42, 4, 1), glass); lant.position.y = 3.92; lant.rotation.y = Math.PI / 4; g.add(lant);
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.13, 0.44, 4, 1), toon({ color: '#14171b' })); cage.material.wireframe = true; cage.position.y = 3.92; cage.rotation.y = Math.PI / 4; g.add(cage);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.2, 4), iron); cap.position.y = 4.23; cap.rotation.y = Math.PI / 4; g.add(cap);
  const capSnow = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.14, 4), toon({ color: '#cdd8e2', snow: true, wrap: 0.8 })); capSnow.position.y = 4.29; capSnow.rotation.y = Math.PI / 4; g.add(capSnow);
  cyl(0.02, 0.02, 0.1, iron, { y: 4.4, parent: g, seg: 6 });
  scene.add(g);
  const h = halo(T.glow, '#ffb866', 2.6, 0.9, { x, y: 3.92, z, parent: scene });
  const h2 = halo(T.glow, '#ffb866', 7.5, 0.16, { x, y: 3.7, z, parent: scene });
  world.glows.push({ m: glass, group: 'street', seed: x }, { m: h.material, group: 'street', seed: x }, { m: h2.material, group: 'street', seed: x });
  world.lights.push({ p: [x, 3.9, z], ...lightDef, zone: 0, group: 'street', seed: x });
  solid('lamp', x - 0.2, 0, z - 0.2, x + 0.2, 4.5, z + 0.2);
}

export function buildStreet(ctx) {
  const { scene, T, world } = ctx;
  const r = rng(808);
  const snowMat = toon({ color: '#cbd6e0', snow: true, wrap: 0.85 });

  // sky
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 12), new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: SKY_FRAG, uniforms: { uTime: world.uTime }, side: THREE.BackSide, depthWrite: false,
  }));
  sky.renderOrder = -10; scene.add(sky);
  world.follow.push(sky);

  // ground
  const len = STREET.x1 - STREET.x0 + 8, cx = 0;
  plane(len, STREET.farZ - STREET.pavZ, toon({ map: T.road, wrap: 0.7, snow: true }), { x: cx, y: STREET.roadY, z: (STREET.pavZ + STREET.farZ) / 2, rx: -Math.PI / 2, tile: 5.8, parent: scene });
  const pavMat = toon({ map: T.pavement, wrap: 0.7, snow: true });
  box(len, 0.16, STREET.pavZ - 0.1, pavMat, { x: cx, y: -0.08, z: (STREET.pavZ + 0.1) / 2 + 0.05, tile: 2.6, parent: scene });
  box(len, 0.16, 2.0, pavMat, { x: cx, y: -0.08, z: STREET.farZ + 1.0, tile: 2.6, parent: scene });
  const kerb = toon({ color: '#4a4c50', wrap: 0.5 });
  box(len, 0.17, 0.16, kerb, { x: cx, y: -0.085, z: STREET.pavZ + 0.03, parent: scene });
  box(len, 0.17, 0.16, kerb, { x: cx, y: -0.085, z: STREET.farZ - 0.03, parent: scene });
  // ploughed snow lying along both kerbs
  const bankGeo = new THREE.IcosahedronGeometry(1, 2);
  const banks = new THREE.InstancedMesh(bankGeo, snowMat, 70);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 70; i++) {
    const far = i % 2 === 1;
    const x = STREET.x0 - 3 + r() * (len - 2), z = far ? STREET.farZ - 0.25 - r() * 0.3 : STREET.pavZ + 0.25 + r() * 0.3;
    e.set(0, r() * 6.28, 0); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, STREET.roadY - 0.02, z), q, new THREE.Vector3(r.range(0.5, 1.3), r.range(0.1, 0.26), r.range(0.24, 0.42)));
    banks.setMatrixAt(i, m4);
  }
  scene.add(banks);

  // neighbours, near side (flush with the shop front at z = 0.15) and far side
  const near = [[-18, -10.4, 7.6, 1], [-10.4, -3.6, 9.6, 0], [3.2, 10.0, 9.0, 4], [10.0, 18.0, 7.2, 2]];
  const far = [[-18, -11, 8.4, 3], [-11, -4.5, 10, 2], [-4.5, 2.5, 8.8, 0], [2.5, 9.5, 9.8, 4], [9.5, 18, 7.8, 1]];
  const mass = toon({ color: '#0e1218', wrap: 0.3 });
  const stone = toon({ color: '#34363a', wrap: 0.5 });
  const build = (x0, x1, h, ti, isFar) => {
    const w = x1 - x0, z = isFar ? STREET.farWall : 0.15;
    const fm = toon({ map: T.facades[ti], wrap: 0.75 }); fm.uniforms.uColor.value.multiplyScalar(isFar ? 2.3 : 1.5); // night-adapted eye: lift the sleeping fronts
    plane(w, h, fm, { x: (x0 + x1) / 2, y: h / 2, z, ry: isFar ? Math.PI : 0, parent: scene });
    box(w, h, 7, mass, { x: (x0 + x1) / 2, y: h / 2 - 0.02, z: isFar ? z + 3.52 : z - 3.52, parent: scene });
    // cornice and the snow on it
    box(w + 0.1, 0.22, 0.42, stone, { x: (x0 + x1) / 2, y: h - 0.02, z: z + (isFar ? -0.16 : 0.16), parent: scene });
    box(w + 0.1, 0.1, 0.44, snowMat, { x: (x0 + x1) / 2, y: h + 0.13, z: z + (isFar ? -0.16 : 0.16), parent: scene });
    // string course ledge at the top of the ground floor
    const gy = h * 0.3;
    box(w, 0.1, 0.16, stone, { x: (x0 + x1) / 2, y: gy, z: z + (isFar ? -0.07 : 0.07), parent: scene });
    box(w, 0.05, 0.17, snowMat, { x: (x0 + x1) / 2, y: gy + 0.07, z: z + (isFar ? -0.07 : 0.07), parent: scene });
    // chimney stacks break the roofline
    for (let k = 0; k < 2; k++) {
      const cxp = x0 + w * (0.25 + 0.5 * k) + r.range(-0.6, 0.6);
      box(0.7, 1.3, 0.6, toon({ map: T.brickDark, wrap: 0.5 }), { x: cxp, y: h + 0.6, z: isFar ? z + 2 : z - 2, tile: 2, parent: scene });
      box(0.78, 0.09, 0.68, snowMat, { x: cxp, y: h + 1.29, z: isFar ? z + 2 : z - 2, parent: scene });
    }
  };
  // somebody is still up: a few dim windows across the street
  const litWin = (x, y, w, h, z, k) => {
    const m = glowMat('#e2a25c', 0.55 * k, { additive: false });
    plane(w, h, m, { x, y, z, ry: Math.PI, parent: scene });
    const hl = halo(T.glow, '#e2a25c', 2.2, 0.1 * k, { x, y, z: z - 0.1, parent: scene });
    box(w + 0.12, 0.05, 0.02, toon({ color: '#0d0f12' }), { x, y, z: z - 0.01, parent: scene }); box(0.05, h, 0.02, toon({ color: '#0d0f12' }), { x, y, z: z - 0.01, parent: scene });
    world.glows.push({ m, group: 'street', seed: x }, { m: hl.material, group: 'street', seed: x });
  };
  litWin(-7.75, 7.6, 0.9, 1.3, STREET.farWall - 0.03, 1); litWin(4.2, 5.1, 0.85, 1.2, STREET.farWall - 0.03, 0.8); litWin(13.7, 5.6, 1.0, 1.1, STREET.farWall - 0.03, 0.7); litWin(-14.5, 3.9, 0.8, 1.2, STREET.farWall - 0.03, 0.6);
  near.forEach(([a, b, h, ti]) => build(a, b, h, ti, false));
  far.forEach(([a, b, h, ti]) => build(a, b, h, ti, true));
  solid('near-buildings-L', -30, 0, -10, -3.6, 12, 0.2); solid('near-buildings-R', 3.2, 0, -10, 30, 12, 0.2);
  solid('far-buildings', -30, 0, STREET.farWall - 0.2, 30, 12, 20);

  // the far end of the lane dissolves into the town
  // the lane ends at a cross street: a tall dark block closes the view, the town's roofs behind it
  for (const sx of [-1, 1]) {
    plane(13, 11.5, toon({ map: T.facades[sx > 0 ? 2 : 3], wrap: 0.8, color: '#9aa3ae' }), { x: sx * 22, y: 5.75, z: 4.9, ry: -sx * Math.PI / 2, parent: scene });
    plane(30, 9, toon({ map: T.skyline, transparent: true, alphaTest: 0.5, wrap: 1, color: '#707d8e' }), { x: sx * 34, y: 9, z: 4.9, ry: -sx * Math.PI / 2, parent: scene });
  }

  // awnings on two sleeping shops
  const canvasMat = toon({ color: '#3d2f28', wrap: 0.6, side: THREE.DoubleSide });
  for (const [x, w, isFar] of [[-7, 4.6, false], [6.6, 4.2, false], [-1, 4.4, true]]) {
    const z = isFar ? STREET.farWall - 0.5 : 0.65, s = isFar ? -1 : 1;
    const a = plane(w, 1.15, canvasMat, { x, y: 2.86, z, rx: -Math.PI / 2 + s * 0.5, parent: scene }); a.rotation.z = isFar ? Math.PI : 0;
    plane(w, 1.05, snowMat, { x, y: 2.9, z: z - s * 0.06, rx: -Math.PI / 2 + s * 0.5, parent: scene });
    box(w, 0.2, 0.02, canvasMat, { x, y: 2.5, z: z + s * 0.5, parent: scene });
  }

  // lamp posts
  lampPost(ctx, -6.2, 1.85, { c: '#ffb260', i: 1.35, r: 10 });
  lampPost(ctx, 2.0, STREET.farZ + 0.35, { c: '#ffb260', i: 1.2, r: 10 });
  lampPost(ctx, -15.5, STREET.farZ + 0.35, { c: '#ffb260', i: 1.0, r: 9 });

  // utility pole with a tangle of wires
  const wood = toon({ map: T.woodDark, wrap: 0.5 });
  const px = -9.6, pz = 1.95;
  cyl(0.11, 0.14, 8.6, wood, { x: px, y: 4.3, z: pz, parent: scene, seg: 9 });
  box(0.1, 0.1, 1.9, wood, { x: px, y: 7.9, z: pz, parent: scene }); box(0.1, 0.1, 1.5, wood, { x: px, y: 7.3, z: pz, parent: scene });
  box(0.09, 0.04, 2.0, snowMat, { x: px, y: 7.97, z: pz, parent: scene });
  cyl(0.24, 0.24, 0.62, toon({ color: '#2b2f35', wrap: 0.5 }), { x: px + 0.32, y: 6.4, z: pz, parent: scene, seg: 12 });
  cyl(0.25, 0.25, 0.05, snowMat, { x: px + 0.32, y: 6.73, z: pz, parent: scene, seg: 12 });
  solid('pole', px - 0.3, 0, pz - 0.3, px + 0.6, 9, pz + 0.3);
  const wire = toon({ color: '#0c0e12', wrap: 0.2 });
  const sag = (a, b, drop) => [a, [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - drop, (a[2] + b[2]) / 2], b];
  for (const dz of [-0.85, -0.3, 0.3, 0.85]) { tube(sag([px, 7.95, pz + dz], [-26, 7.6, pz + dz], 0.7), 0.012, wire, { parent: scene, rs: 4 }); tube(sag([px, 7.95, pz + dz], [9, 8.4, 0.4 + dz * 0.2], 1.0), 0.012, wire, { parent: scene, rs: 4 }); }
  tube(sag([px, 7.3, pz + 0.6], [-4, 8.6, STREET.farWall - 0.2], 0.9), 0.012, wire, { parent: scene, rs: 4 });
  tube(sag([px, 7.3, pz - 0.6], [-3.0, 6.2, 0.3], 0.5), 0.012, wire, { parent: scene, rs: 4 });

  // street furniture
  const iron = toon({ color: '#1d2126', wrap: 0.4 });
  // bench under the neighbour's window
  const bench = new THREE.Group(); bench.position.set(-5.0, 0, 0.55);
  for (let i = 0; i < 4; i++) box(1.7, 0.035, 0.09, wood, { y: 0.45, z: -0.16 + i * 0.105, parent: bench });
  for (let i = 0; i < 3; i++) box(1.7, 0.09, 0.03, wood, { y: 0.6 + i * 0.13, z: -0.24, parent: bench });
  for (const sx of [-0.78, 0.78]) { box(0.05, 0.9, 0.05, iron, { x: sx, y: 0.45, z: -0.25, parent: bench }); box(0.05, 0.45, 0.05, iron, { x: sx, y: 0.225, z: 0.17, parent: bench }); box(0.05, 0.05, 0.47, iron, { x: sx, y: 0.43, z: -0.04, parent: bench }); }
  box(1.7, 0.05, 0.4, snowMat, { y: 0.495, z: -0.02, parent: bench });
  scene.add(bench);
  // litter bin, crates, a drain
  cyl(0.24, 0.2, 0.75, iron, { x: 4.4, y: 0.375, z: 0.6, parent: scene, seg: 10 }); cyl(0.25, 0.25, 0.07, snowMat, { x: 4.4, y: 0.78, z: 0.6, parent: scene, seg: 10 });
  const crate = toon({ map: T.woodPale, wrap: 0.5, color: '#9a8468' });
  box(0.5, 0.32, 0.36, crate, { x: -3.15, y: 0.16, z: 0.5, ry: 0.1, tile: 0.6, parent: scene }); box(0.5, 0.32, 0.36, crate, { x: -3.12, y: 0.48, z: 0.52, ry: -0.12, tile: 0.6, parent: scene });
  box(0.52, 0.05, 0.38, snowMat, { x: -3.12, y: 0.665, z: 0.52, ry: -0.12, parent: scene });
  solid('crates', -3.5, 0, 0.2, -2.8, 0.8, 0.8);
  // A-board on the pavement
  const ab = new THREE.Group(); ab.position.set(2.75, 0, 1.25); ab.rotation.y = -0.35;
  const abMat = toon({ map: T.aframe, wrap: 0.7 });
  const f1 = plane(0.56, 0.9, abMat, { y: 0.47, z: 0.13, rx: -0.26, parent: ab }); f1.material.side = THREE.DoubleSide;
  plane(0.56, 0.9, abMat, { y: 0.47, z: -0.13, rx: 0.26, ry: Math.PI, parent: ab });
  box(0.6, 0.035, 0.1, snowMat, { y: 0.925, parent: ab });
  scene.add(ab); solid('a-board', 2.4, 0, 0.95, 3.1, 1.0, 1.55);
}
