// Geometry helpers: world-projected UVs, layout-coordinate boxes, static merging.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const AX = { x: 0, y: 1, z: 2 };

/**
 * Box-projected UVs from vertex positions (+ offset), so textures keep a real-world
 * scale and line up across neighbouring boxes. `grain` picks the world axis that maps
 * to u where possible (wood grain direction). tile = metres per texture repeat [u, v].
 */
export function worldUV(geo, { tile = [1, 1], offset = [0, 0, 0], grain = "x" } = {}) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  const g = AX[grain];
  for (let i = 0; i < pos.count; i++) {
    const p = [pos.getX(i) + offset[0], pos.getY(i) + offset[1], pos.getZ(i) + offset[2]];
    const n = [Math.abs(nor.getX(i)), Math.abs(nor.getY(i)), Math.abs(nor.getZ(i))];
    const na = n[0] > n[1] && n[0] > n[2] ? 0 : n[1] > n[2] ? 1 : 2;
    const a0 = na === 0 ? 1 : 0, a1 = na === 2 ? 1 : 2; // the two in-plane axes
    let ua, va;
    if (g === a0 || g === a1) { ua = g; va = g === a0 ? a1 : a0; } // grain lies in this face
    else if (a0 === 1 || a1 === 1) { va = 1; ua = a0 === 1 ? a1 : a0; } // end grain: keep y vertical
    else { ua = a0; va = a1; }
    uv[i * 2] = p[ua] / tile[0];
    uv[i * 2 + 1] = p[va] / tile[1];
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** Box from layout coordinates (min/max corners). opts: tile, grain, round, cast, receive */
export function bx(x0, y0, z0, x1, y1, z1, mat, opts = {}) {
  const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  const geo = opts.round
    ? new RoundedBoxGeometry(w, h, d, opts.seg ?? 2, Math.min(opts.round, w / 2.01, h / 2.01, d / 2.01))
    : new THREE.BoxGeometry(w, h, d);
  if (opts.uv !== false) worldUV(geo, { tile: opts.tile || [1, 1], offset: [cx, cy, cz], grain: opts.grain || "x" });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(cx, cy, cz);
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  return m;
}

/** Box centred at (x,y,z) with size (w,h,d). */
export function cbox(w, h, d, mat, x = 0, y = 0, z = 0, opts = {}) {
  return bx(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2, mat, opts);
}

export function cyl(rt, rb, h, mat, seg = 24, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, opts.open || false), mat);
  m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true;
  return m;
}

export function sph(r, mat, ws = 24, hs = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function at(obj, x, y, z, ry = 0, rx = 0, rz = 0) {
  obj.position.set(x, y, z);
  obj.rotation.set(rx, ry, rz);
  return obj;
}

/** Lathe from [r, y] pairs. */
export function lathe(points, mat, seg = 32) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Cylinder between two points (for rods, rails, branches). */
export function rod(a, b, r, mat, seg = 10, rb = r) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, rb, len, seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/**
 * Bake every static mesh under `root` into one mesh per (material, shadow flags).
 * Subtrees whose userData.dynamic is true are left alone (animated / interactive).
 */
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  const mtx = new THREE.Matrix4();
  const groups = new Map();
  const remove = [];
  const visit = (o) => {
    if (o.userData.dynamic) return;
    if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) && o.visible && !o.userData.noMerge) {
      const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${o.renderOrder}`;
      if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, order: o.renderOrder, geos: [] });
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
      if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.attributes.normal) g.computeVertexNormals();
      g.applyMatrix4(mtx.multiplyMatrices(toRoot, o.matrixWorld));
      g.morphAttributes = {};
      groups.get(key).geos.push(g);
      remove.push(o);
    }
    for (const c of o.children) visit(c);
  };
  visit(root);
  for (const o of remove) {
    o.parent.remove(o);
    // keep children (rare) by reparenting to root
    for (const c of [...o.children]) { root.attach(c); }
  }
  const merged = new THREE.Group();
  merged.name = "merged-static";
  for (const g of groups.values()) {
    const geo = mergeGeometries(g.geos, false);
    if (!geo) continue;
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, g.mat);
    m.castShadow = g.cast; m.receiveShadow = g.recv; m.renderOrder = g.order;
    m.matrixAutoUpdate = false;
    merged.add(m);
  }
  root.add(merged);
  return merged;
}
