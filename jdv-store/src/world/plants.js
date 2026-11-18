// Plants: trailing pothos (instanced leaves on tube stems), a fiddle-leaf fig,
// a hanging planter by the glazing.
import * as THREE from "three";
import { M } from "../materials.js";
import { pot } from "./props.js";
import { cyl, at, rod } from "../geo.js";
import { rng } from "../textures.js";
import { ROOM } from "../layout.js";

let leafGeo = null;
function leafGeometry() {
  if (leafGeo) return leafGeo;
  const g = new THREE.PlaneGeometry(1, 1, 2, 3);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, -Math.abs(x) * 0.35 + Math.sin(y * Math.PI) * 0.08); // fold along the midrib + arch
  }
  g.computeVertexNormals();
  return (leafGeo = g);
}

class LeafSet {
  constructor(mat) { this.mat = mat; this.items = []; }
  add(pos, tip, normal, size, tint) { this.items.push({ pos: pos.clone(), tip: tip.clone().normalize(), normal: normal.clone(), size, tint }); }
  build() {
    const mesh = new THREE.InstancedMesh(leafGeometry(), this.mat, this.items.length);
    const m = new THREE.Matrix4(), x = new THREE.Vector3(), z = new THREE.Vector3(), c = new THREE.Color();
    this.items.forEach((it, i) => {
      const y = it.tip;
      z.copy(it.normal).addScaledVector(y, -it.normal.dot(y)).normalize();
      if (z.lengthSq() < 1e-4) z.set(0, 0, 1);
      x.crossVectors(y, z).normalize();
      m.makeBasis(x.multiplyScalar(it.size * 0.82), y.clone().multiplyScalar(it.size), z.clone().multiplyScalar(it.size));
      m.setPosition(it.pos);
      mesh.setMatrixAt(i, m);
      c.setRGB(0.84 + it.tint * 0.16, 0.9 + it.tint * 0.1, 0.78 + it.tint * 0.12);
      mesh.setColorAt(i, c);
    });
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    return mesh;
  }
}

/**
 * Pothos in a pot at `at`. out: preferred outward direction (away from wall/shelf).
 * hang: vines fall under gravity; lengths in metres.
 */
export function pothos(parent, origin, { out = new THREE.Vector3(1, 0, 0), vines = 5, len = [0.5, 1.1], seed = 1, potKind = "cream", potR = 0.08, potH = 0.12, noPot = false, upright = 7, floorY = 0.05 } = {}) {
  const r = rng(seed);
  const g = new THREE.Group();
  parent.add(g);
  if (!noPot) { const p = pot(potKind, potR, potH); p.position.copy(origin); g.add(p); }
  const leaves = new LeafSet(M.pothos);
  const top = origin.clone(); top.y += potH * 0.92;
  const outN = out.clone().setY(0).normalize();
  const side = new THREE.Vector3(-outN.z, 0, outN.x);
  // short upright shoots
  for (let i = 0; i < upright; i++) {
    const a = r() * Math.PI * 2, rr = r() * potR * 0.7;
    const base = top.clone().add(new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr));
    const dir = new THREE.Vector3(Math.cos(a) * 0.6, 0.7 + r() * 0.5, Math.sin(a) * 0.6).normalize();
    const L = 0.06 + r() * 0.1;
    const end = base.clone().addScaledVector(dir, L);
    parent.add(rod(base, end, 0.003, M.stem, 4));
    const tip = dir.clone().add(new THREE.Vector3(Math.cos(a), -0.2, Math.sin(a)).multiplyScalar(0.8));
    leaves.add(end, tip, new THREE.Vector3(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3), 0.08 + r() * 0.04, r());
  }
  // trailing vines
  for (let v = 0; v < vines; v++) {
    const ang = (v / vines - 0.5) * 2.2 + (r() - 0.5) * 0.4;
    const horiz = outN.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side, Math.sin(ang)).normalize();
    const p = top.clone().addScaledVector(horiz, potR * 0.85);
    let dir = horiz.clone().multiplyScalar(0.8).setY(0.35).normalize();
    const L = len[0] + r() * (len[1] - len[0]);
    const pts = [p.clone()];
    const step = 0.03;
    let s = 0, k = 0;
    while (s < L) {
      dir.y -= 0.16 + r() * 0.05; // gravity
      dir.addScaledVector(horiz, 0.03).add(new THREE.Vector3((r() - 0.5) * 0.12, 0, (r() - 0.5) * 0.12));
      dir.normalize();
      if (dir.y < -0.97) dir.y = -0.97;
      p.addScaledVector(dir, step);
      if (p.y < floorY) break;
      s += step; k++;
      pts.push(p.clone());
      if (k % 2 === 0) {
        const t = s / L;
        const sideSign = (k / 2) % 2 ? 1 : -1;
        const sideV = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(sideSign);
        if (sideV.lengthSq() < 0.01) sideV.copy(side).multiplyScalar(sideSign);
        const tipDir = sideV.clone().multiplyScalar(0.7).addScaledVector(dir, 0.55).addScaledVector(horiz, 0.35).add(new THREE.Vector3(0, -0.15, 0));
        const nrm = horiz.clone().add(new THREE.Vector3(0, 0.6, 0)).addScaledVector(sideV, 0.3);
        const size = (0.105 - t * 0.05) * (0.85 + r() * 0.3);
        leaves.add(p.clone().addScaledVector(sideV, 0.005), tipDir, nrm, size, r());
      }
    }
    if (pts.length > 2) {
      const curve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 2, 0.0028, 4, false), M.stem);
      tube.castShadow = true; parent.add(tube);
    }
  }
  const mesh = leaves.build();
  g.add(mesh);
  return g;
}

export function fiddleLeaf(parent, x, z, { seed = 3, h = 1.7 } = {}) {
  const r = rng(seed);
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const p = pot("concrete", 0.2, 0.36); g.add(p);
  const leaves = new LeafSet(M.broadLeaf);
  const trunkTop = new THREE.Vector3(0.03, h, -0.02);
  g.add(rod(new THREE.Vector3(0, 0.3, 0), trunkTop, 0.022, M.bark, 8, 0.03));
  const n = 34;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const y = 0.75 + t * (h - 0.7);
    const a = i * 2.4 + r() * 0.4;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const base = new THREE.Vector3(0.015 * t, y, -0.01 * t).addScaledVector(out, 0.03);
    const tip = out.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, 0.55 + t * 0.4, 0));
    const nrm = out.clone().multiplyScalar(0.35).add(new THREE.Vector3(0, 1, 0));
    const size = 0.24 + (1 - Math.abs(t - 0.5) * 2) * 0.1 + r() * 0.05;
    g.add(rod(base, base.clone().addScaledVector(out, 0.05).add(new THREE.Vector3(0, 0.02, 0)), 0.004, M.stem, 4));
    leaves.add(base.clone().addScaledVector(out, 0.05).add(new THREE.Vector3(0, 0.02, 0)), tip, nrm, size, r());
  }
  g.add(leaves.build());
  return g;
}

export function hangingPlanter(parent, x, z, y = 2.15, seed = 9) {
  const g = new THREE.Group(); parent.add(g);
  const potR = 0.11;
  const hp = pot("terracotta", potR, 0.14); hp.position.set(x, y, z); g.add(hp);
  // macramé cords to a ceiling hook
  const hook = new THREE.Vector3(x, ROOM.h, z);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + 0.4;
    const pt = new THREE.Vector3(x + Math.cos(a) * potR * 1.02, y + 0.06, z + Math.sin(a) * potR * 1.02);
    g.add(rod(pt, hook, 0.0035, M.kraft, 4));
    g.add(rod(pt, new THREE.Vector3(x, y - 0.03, z), 0.0035, M.kraft, 4));
  }
  pothos(parent, new THREE.Vector3(x, y, z), { noPot: true, potR, potH: 0.14, out: new THREE.Vector3(0, 0, 1), vines: 7, len: [0.5, 1.2], seed, upright: 6 });
  return g;
}

export function buildPlants(ctx) {
  const g = new THREE.Group(); g.name = "plants";
  ctx.scene.add(g);
  const V = (v) => v.clone();
  if (ctx.shelfPotSpot) pothos(g, V(ctx.shelfPotSpot), { out: new THREE.Vector3(1, 0, -0.3), vines: 6, len: [0.7, 1.5], seed: 11, potKind: "cream", potR: 0.085, potH: 0.12 });
  if (ctx.shelfPotSpot2) pothos(g, V(ctx.shelfPotSpot2), { out: new THREE.Vector3(-0.6, 0, 1), vines: 6, len: [0.6, 1.4], seed: 21, potKind: "terracotta", potR: 0.08, potH: 0.12 });
  if (ctx.tablePotSpot) pothos(g, V(ctx.tablePotSpot), { out: new THREE.Vector3(0.6, 0, 1), vines: 5, len: [0.25, 0.65], seed: 31, potKind: "concrete", potR: 0.1, potH: 0.13, floorY: 0.06, upright: 10 });
  if (ctx.barPotSpot) pothos(g, V(ctx.barPotSpot), { out: new THREE.Vector3(-1, 0, 0), vines: 4, len: [0.4, 0.9], seed: 41, potKind: "navy", potR: 0.07, potH: 0.1 });
  pothos(g, new THREE.Vector3(3.27, 1.96, -2.62), { out: new THREE.Vector3(-1, 0, 0.2), vines: 4, len: [0.4, 1.0], seed: 51, potKind: "cream", potR: 0.07, potH: 0.1 });
  hangingPlanter(g, 0.42, -3.62, 2.2, 61);
  fiddleLeaf(g, -0.1, 3.7, { seed: 7, h: 1.75 });
  return g;
}
