// The café terrace behind the glass doors, plus sky and the trees around it.
import * as THREE from "three";
import { ROOM, TERRACE, T, GLAZING } from "../layout.js";
import { M } from "../materials.js";
import { bx, cbox, cyl, at, rod, lathe, sph } from "../geo.js";
import { rng } from "../textures.js";
import { pot } from "./props.js";
import { pothos, fiddleLeaf } from "./plants.js";
import { demitasse } from "./coffee.js";

export const SUN_DIR = new THREE.Vector3(-0.42, 0.34, -0.84).normalize(); // toward the sun

export function buildTerrace(ctx) {
  const g = new THREE.Group(); g.name = "terrace";
  ctx.scene.add(g);
  const z1 = TERRACE.z1;

  // deck + surrounding ground
  g.add(bx(TERRACE.x0, -0.08, TERRACE.z0 - 0.6, TERRACE.x1, 0, z1, M.deck, { tile: [2.1, 2.1], cast: false }));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x5b6640, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.09, -20); ground.receiveShadow = true; g.add(ground);

  // neighbour's concrete wall (left) with creeping fig
  g.add(bx(T.wallX - 0.25, 0, TERRACE.z0 - 0.8, T.wallX, 3.4, z1, M.concreteWall, { tile: [2.4, 2.4], grain: "z" }));
  g.add(bx(T.wallX - 0.3, 3.4, TERRACE.z0 - 0.8, T.wallX + 0.03, 3.48, z1, M.concrete, { tile: [2.4, 2.4] }));
  for (const z of [-5.0, -5.75]) fiddleLeaf(g, T.wallX + 0.32, z, { seed: Math.round(-z * 10), h: z > -5.4 ? 1.9 : 1.5 });

  // timber slat fence (right)
  const fx = T.fenceX;
  for (let z = TERRACE.z0 - 0.6; z < z1 - 0.02; z += 0.095) g.add(bx(fx, 0, z, fx + 0.025, 1.95, z + 0.07, M.oak, { tile: [1.2, 0.6], grain: "y" }));
  for (const z of [TERRACE.z0 - 0.6, -7.0, z1 - 0.05]) g.add(bx(fx + 0.025, 0, z, fx + 0.1, 2.0, z + 0.08, M.walnutDark, { uv: false }));
  g.add(bx(fx - 0.01, 1.95, TERRACE.z0 - 0.6, fx + 0.1, 2.0, z1, M.walnutDark, { uv: false }));

  // planters along the back + hedge beyond
  const P = T.planters;
  g.add(bx(TERRACE.x0, 0, P.z0, TERRACE.x1, P.h, P.z1, M.concrete, { tile: [2.4, 2.4] }));
  g.add(bx(TERRACE.x0 + 0.06, P.h - 0.04, P.z0 + 0.06, TERRACE.x1 - 0.06, P.h - 0.02, P.z1 - 0.06, M.soil, { uv: false, cast: false }));
  shrubs(g, P, ctx);
  hedge(g, TERRACE.x0 - 0.5, TERRACE.x1 + 0.5, P.z0 - 0.75, P.z0 - 0.05);

  // facade details: awning, sconces
  awning(g);
  for (const x of [GLAZING.x0 - 0.32, GLAZING.x1 + 0.3]) sconce(g, x, 2.25, z1 - 0.005);

  // furniture
  for (const t of T.tables) cafeSet(g, t.x, t.z, ctx);
  bench(g);
  aBoard(g, ctx);
  for (const p of T.poles) pole(g, p.x, p.z);

  // olive tree in a big pot + potted pothos by the door
  const op = pot("terracotta", 0.34, 0.6); op.position.set(T.olive.x, 0, T.olive.z); g.add(op);
  tree(g, T.olive.x, T.olive.z, { h: 2.2, seed: 77, spread: 0.55, cards: 60, mat: M.olive, trunkR: 0.035, base: 0.55, clusters: 5 });
  pothos(g, new THREE.Vector3(GLAZING.x1 + 0.45, 0, z1 - 0.32), { potKind: "terracotta", potR: 0.18, potH: 0.36, out: new THREE.Vector3(0, 0, -1), vines: 6, len: [0.25, 0.6], seed: 81, upright: 14 });

  // trees: two on the terrace, more beyond
  for (const t of T.trees) tree(g, t.x, t.z, { h: 4.6 * t.s, seed: Math.round(t.x * 10 + 50), spread: 1.2 * t.s, cards: 170 });
  const r = rng(4);
  const far = [[-7.5, -11], [-4, -12.5], [3.5, -12], [7.2, -10.5], [-1.5, -15], [6.5, -6.5], [7.5, -3], [-8, -6], [10, -14], [-10, -15], [1.5, -18], [-6, -19]];
  for (const [x, z] of far) tree(g, x, z, { h: 5 + r() * 2.5, seed: Math.round(r() * 1000), spread: 1.6 + r() * 0.6, cards: 110, trunkR: 0.14 });

  // string lights
  stringLights(g, ctx);

  // sky
  g.add(sky());
  return g;
}

function creepers(g, x, z0, z1) {
  const r = rng(12);
  const cards = [];
  // a few climbing patches rather than a solid mat
  for (const pz of [z1 - 0.9, -6.4, -7.9]) {
    for (let i = 0; i < 26; i++) {
      const z = pz + (r() - 0.5) * 1.1, y = 0.2 + Math.pow(r(), 0.8) * 2.9;
      cards.push({ z, y, s: 0.22 + r() * 0.26, rot: r() * Math.PI * 2 });
    }
  }
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), M.foliage, cards.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  cards.forEach((cd, i) => {
    q.setFromEuler(new THREE.Euler(cd.rot, Math.PI / 2, 0, "YXZ"));
    m.compose(new THREE.Vector3(x + 0.02 + r() * 0.04, cd.y, cd.z), q, new THREE.Vector3(cd.s, cd.s, cd.s));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.setRGB(0.7 + r() * 0.2, 0.8 + r() * 0.15, 0.6 + r() * 0.15));
  });
  mesh.receiveShadow = true; mesh.castShadow = false;
  g.add(mesh);
}

function shrubs(g, P, ctx) {
  const r = rng(22);
  const cards = [];
  for (let x = TERRACE.x0 + 0.3; x < TERRACE.x1 - 0.2; x += 0.45) {
    const cz = (P.z0 + P.z1) / 2, cy = P.h + 0.22 + r() * 0.12;
    for (let k = 0; k < 7; k++) cards.push([x + (r() - 0.5) * 0.4, cy + (r() - 0.5) * 0.3, cz + (r() - 0.5) * 0.3, 0.42 + r() * 0.2]);
  }
  addCards(g, cards, M.foliage, r, 0.95);
  // ornamental grass tufts
  const grassMat = new THREE.MeshStandardMaterial({ color: 0xb7a46a, roughness: 0.9, side: THREE.DoubleSide });
  for (let x = TERRACE.x0 + 0.5; x < TERRACE.x1; x += 1.6) {
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const b = new THREE.Vector3(x, P.h - 0.03, (P.z0 + P.z1) / 2);
      const e = b.clone().add(new THREE.Vector3(Math.cos(a) * 0.2, 0.55 + r() * 0.3, Math.sin(a) * 0.12));
      g.add(rod(b, e, 0.004, grassMat, 3, 0.012));
    }
  }
}

function addCards(g, cards, mat, r, light = 1) {
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, cards.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), e = new THREE.Euler();
  cards.forEach(([x, y, z, s, tint], i) => {
    q.setFromEuler(e.set(r() * Math.PI, r() * Math.PI * 2, r() * Math.PI));
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
    mesh.setMatrixAt(i, m);
    const k = (tint ?? r()) * 0.25;
    mesh.setColorAt(i, c.setRGB((0.72 + k) * light, (0.82 + k) * light, (0.62 + k * 0.6) * light));
  });
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  g.add(mesh);
  return mesh;
}

function hedge(g, x0, x1, z0, z1) {
  g.add(bx(x0, 0, z0 + 0.1, x1, 1.45, z1 - 0.1, new THREE.MeshStandardMaterial({ color: 0x46612f, roughness: 1 }), { uv: false }));
  const r = rng(33), cards = [];
  for (let x = x0; x < x1; x += 0.28) for (let y = 0.3; y < 1.8; y += 0.32) cards.push([x + (r() - 0.5) * 0.2, y + (r() - 0.5) * 0.15, z1 - 0.1 + (r() - 0.5) * 0.2, 0.55 + r() * 0.25]);
  for (let x = x0; x < x1; x += 0.35) cards.push([x, 1.62 + r() * 0.12, (z0 + z1) / 2 + (r() - 0.5) * 0.4, 0.6 + r() * 0.2]);
  addCards(g, cards, M.foliage, r, 0.85);
}

export function tree(g, x, z, { h = 4.6, seed = 1, spread = 1.2, cards = 160, mat = M.foliage, trunkR = 0.11, base = 0, clusters = 7 } = {}) {
  const r = rng(seed);
  const lean = new THREE.Vector3((r() - 0.5) * 0.25, 1, (r() - 0.5) * 0.25).normalize();
  const b = new THREE.Vector3(x, base, z);
  const top = b.clone().addScaledVector(lean, h * 0.55);
  g.add(rod(b, top, trunkR * 0.75, M.bark, 10, trunkR));
  const ends = [];
  for (let i = 0; i < clusters; i++) {
    const a = (i / clusters) * Math.PI * 2 + r() * 0.6;
    const from = b.clone().addScaledVector(lean, h * (0.5 + r() * 0.15));
    const dir = new THREE.Vector3(Math.cos(a) * 0.75, 1.0 + r() * 0.6, Math.sin(a) * 0.75).normalize();
    const to = from.clone().addScaledVector(dir, spread * (0.7 + r() * 0.5));
    g.add(rod(from, to, trunkR * 0.25, M.bark, 6, trunkR * 0.45));
    ends.push(to);
  }
  ends.push(b.clone().addScaledVector(lean, h * 0.82));
  const list = [];
  for (let i = 0; i < cards; i++) {
    const c = ends[i % ends.length];
    const d = new THREE.Vector3(r() - 0.5, (r() - 0.35) * 0.7, r() - 0.5).normalize().multiplyScalar(Math.pow(r(), 0.5) * spread * 0.75);
    const p = c.clone().add(d);
    const hgt = (p.y - base) / (h + 0.5);
    list.push([p.x, p.y, p.z, 0.55 + r() * 0.45 * (spread / 1.2), Math.min(1, hgt * 1.2)]);
  }
  return addCards(g, list, mat, r, 1);
}

function awning(g) {
  const A = T.awning, zf = TERRACE.z1, y0 = A.y, y1 = A.y - 0.38, d = A.depth;
  const w = A.x1 - A.x0;
  const len = Math.hypot(d, y0 - y1);
  const geo = new THREE.PlaneGeometry(w, len, 1, 1);
  const awn = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: M.navyFabric.map, color: 0xffffff, roughness: 0.95, side: THREE.DoubleSide }));
  awn.position.set((A.x0 + A.x1) / 2, (y0 + y1) / 2, zf - d / 2);
  awn.rotation.x = -Math.PI / 2 + Math.atan2(y0 - y1, d);
  awn.castShadow = true; awn.receiveShadow = true; g.add(awn);
  const val = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.2), M.valance);
  val.position.set((A.x0 + A.x1) / 2, y1 - 0.1, zf - d - 0.002); val.rotation.y = Math.PI; val.castShadow = true; g.add(val);
  const valBack = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.2), M.navyFabric); valBack.position.set(val.position.x, val.position.y, zf - d + 0.002); g.add(valBack);
  for (const x of [A.x0 + 0.05, A.x1 - 0.05]) {
    g.add(rod(new THREE.Vector3(x, y0 - 0.55, zf), new THREE.Vector3(x, y1, zf - d), 0.012, M.blackMetal, 8));
    g.add(rod(new THREE.Vector3(x, y0, zf), new THREE.Vector3(x, y1, zf - d), 0.012, M.blackMetal, 8));
  }
}

function sconce(g, x, y, z) {
  g.add(cbox(0.12, 0.2, 0.1, M.brass, x, y, z - 0.05, { uv: false }));
  g.add(cbox(0.09, 0.15, 0.002, M.lampGlass, x, y, z - 0.101, { uv: false, cast: false }));
}

function cafeChair(g, x, z, yaw) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = yaw; g.add(c);
  M.chairWood ??= new THREE.MeshStandardMaterial({ map: M.walnut.map, color: 0xd09060, roughness: 0.5 });
  const W = M.chairWood;
  c.add(lathe([[0, 0.44], [0.2, 0.44], [0.215, 0.455], [0.21, 0.47], [0, 0.47]], W, 32));
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    c.add(rod(new THREE.Vector3(Math.cos(a) * 0.14, 0.44, Math.sin(a) * 0.14), new THREE.Vector3(Math.cos(a) * 0.19, 0, Math.sin(a) * 0.19), 0.015, W, 8, 0.012));
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 6, 32), W); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; c.add(ring);
  // bentwood back (toward -z local)
  for (const s of [-1, 1]) c.add(rod(new THREE.Vector3(s * 0.15, 0.45, -0.13), new THREE.Vector3(s * 0.17, 0.86, -0.2), 0.013, W, 8));
  const back = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.016, 8, 24, Math.PI * 0.62), W);
  back.position.set(0, 0.78, -0.06); back.rotation.set(Math.PI / 2 - 0.2, 0, Math.PI * 0.19 + Math.PI); back.castShadow = true; c.add(back);
  const back2 = back.clone(); back2.position.y = 0.66; c.add(back2);
}

function cafeSet(g, x, z, ctx) {
  // round table, walnut top on a cast iron pedestal; two chairs either side (±x)
  g.add(at(cyl(0.36, 0.36, 0.03, M.walnut, 48), x, 0.74, z));
  g.add(at(cyl(0.035, 0.04, 0.7, M.blackMetal, 16), x, 0.37, z));
  g.add(at(cyl(0.24, 0.27, 0.03, M.blackMetal, 32), x, 0.015, z));
  cafeChair(g, x - 0.6, z, -Math.PI / 2 + 0.15);
  cafeChair(g, x + 0.6, z, Math.PI / 2 - 0.1);
  // a cup and a bud vase
  const c = demitasse(); c.position.set(x + 0.1, 0.755, z + 0.08); g.add(c);
  const s = cyl(0.06, 0.055, 0.008, M.ceramic, 24); s.position.set(x + 0.1, 0.759, z + 0.08); g.add(s);
  g.add(at(lathe([[0, 0], [0.025, 0], [0.03, 0.05], [0.012, 0.11], [0.014, 0.13], [0, 0.13]], M.glassTint, 16), x - 0.1, 0.755, z - 0.05));
  const stem = rod(new THREE.Vector3(x - 0.1, 0.8, z - 0.05), new THREE.Vector3(x - 0.08, 1.0, z - 0.04), 0.002, M.stem, 4); g.add(stem);
  const fl = sph(0.018, new THREE.MeshStandardMaterial({ color: 0xe9a23b, roughness: 0.7 }), 10, 8); fl.position.set(x - 0.08, 1.0, z - 0.04); g.add(fl);
}

function bench(g) {
  const B = T.bench;
  g.add(bx(B.x0, 0.42, B.z0, B.x1, 0.46, B.z1, M.oak, { tile: [1.2, 0.6], grain: "z", round: 0.008 }));
  for (const z of [B.z0 + 0.1, B.z1 - 0.1]) g.add(bx(B.x0 + 0.05, 0, z - 0.04, B.x1 - 0.05, 0.42, z + 0.04, M.concrete, { tile: [2.4, 2.4] }));
  g.add(bx(B.x0 + 0.02, 0.46, B.z0 + 0.1, B.x1 - 0.04, 0.53, B.z1 - 0.1, M.cushion, { tile: [0.5, 0.5], round: 0.025, seg: 3 }));
  for (const z of [B.z0 + 0.45, B.z1 - 0.5]) { const p = cbox(0.12, 0.34, 0.4, z < -7.5 ? M.navyFabric : M.burgundyFabric, B.x0 + 0.09, 0.7, z, { tile: [0.4, 0.4], round: 0.05, seg: 3 }); p.rotation.z = -0.15; g.add(p); }
}

function aBoard(g, ctx) {
  const b = new THREE.Group(); b.position.set(GLAZING.x0 - 0.6, 0, TERRACE.z1 - 0.75); b.rotation.y = Math.PI + 0.5; g.add(b);
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.rotation.x = s * 0.18; b.add(leg);
    leg.add(cbox(0.56, 0.86, 0.025, M.walnut, 0, 0.45, s * 0.0, { tile: [0.6, 0.6], grain: "y" }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.72), M.aBoard); face.position.set(0, 0.46, s * 0.0135); if (s < 0) face.rotation.y = Math.PI; leg.add(face);
    leg.position.z = s * 0.075;
  }
  ctx.interactions.push({
    box: [b.position.x - 0.35, 0, b.position.z - 0.35, b.position.x + 0.35, 0.95, b.position.z + 0.35], name: "Terrace board", verb: "Read", dist: 2.4,
    use: (game) => game.ui.caption("On the board", { title: "Coffee on the terrace", artist: "Hand drip · cold brew · crate digging welcome", year: "", genre: "", grade: "" }),
  });
}

function pole(g, x, z) {
  g.add(at(cyl(0.035, 0.04, 3.0, M.blackMetal, 12), x, 1.5, z));
  g.add(at(cyl(0.12, 0.14, 0.12, M.concrete, 16), x, 0.06, z));
}

function stringLights(g, ctx) {
  const zf = TERRACE.z1 - 0.02;
  const P = T.poles.map((p) => new THREE.Vector3(p.x, 2.95, p.z));
  const F = [-3.9, -1.4, 1.0, 3.6].map((x) => new THREE.Vector3(x, 3.32, zf));
  const strands = [[F[0], P[0]], [F[1], P[1]], [F[1], P[0]], [F[2], P[1]], [F[2], P[2]], [F[3], P[2]], [P[0], P[1]], [P[1], P[2]]];
  const bulbs = [];
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 });
  for (const [a, b] of strands) {
    const sag = a.distanceTo(b) * 0.07;
    const pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(a.clone().lerp(b, t).add(new THREE.Vector3(0, -4 * sag * t * (1 - t), 0))); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.004, 4), wireMat));
    const n = Math.floor(a.distanceTo(b) / 0.45);
    for (let i = 1; i < n; i++) { const t = i / n; bulbs.push(a.clone().lerp(b, t).add(new THREE.Vector3(0, -4 * sag * t * (1 - t) - 0.05, 0))); }
  }
  const bulb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 12, 8), M.bulb, bulbs.length);
  const sock = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 8), M.blackMatte, bulbs.length);
  const m = new THREE.Matrix4();
  bulbs.forEach((p, i) => { m.makeTranslation(p.x, p.y, p.z); bulb.setMatrixAt(i, m); m.makeTranslation(p.x, p.y + 0.035, p.z); sock.setMatrixAt(i, m); });
  g.add(bulb, sock);
  for (const [x, z] of [[-2.0, -6.6], [2.0, -6.6]]) {
    const l = new THREE.PointLight(0xffc27a, 4, 6, 1.6);
    l.position.set(x, 2.6, z); ctx.scene.add(l);
  }
}

function sky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: SUN_DIR } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 sunDir; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 zenith = vec3(0.26, 0.4, 0.66);
        vec3 mid = vec3(0.98, 0.6, 0.36);
        vec3 horizon = vec3(1.2, 0.62, 0.3);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.18, h));
        col = mix(col, zenith, smoothstep(0.12, 0.7, h));
        float s = max(dot(d, sunDir), 0.0);
        col += vec3(1.6, 0.85, 0.4) * pow(s, 8.0) * 0.6 + vec3(4.0, 2.4, 1.2) * pow(s, 900.0) * 6.0 + vec3(1.0, 0.5, 0.2) * pow(s, 2.5) * 0.2;
        col = mix(col, vec3(0.55, 0.5, 0.42), smoothstep(0.0, -0.15, h));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), mat);
  m.position.set(0, 0, -5);
  m.frustumCulled = false;
  m.userData.noMerge = true;
  return m;
}
