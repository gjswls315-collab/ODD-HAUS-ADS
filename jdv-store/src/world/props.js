// Shared props: instanced LP sleeves and books, plus small reusable objects.
import * as THREE from "three";
import { M, recordMaterial, bookMaterial } from "../materials.js";
import { bx, cbox, cyl, at, lathe } from "../geo.js";
import { rng } from "../textures.js";

const LP = 0.315;

/** All LP sleeves in the shop live in one InstancedMesh (one draw call). */
export class LPSet {
  constructor() { this.items = []; }
  /** pivot = bottom-centre of the sleeve; yaw: facing (+x at 0); lean: + tilts back. */
  add(x, y, z, yaw, lean, cover, extra = {}) {
    const it = { pos: new THREE.Vector3(x, y, z), yaw, lean, cover, angle: lean, target: lean, ...extra };
    this.items.push(it);
    return it;
  }
  build() {
    const geo = new THREE.BoxGeometry(0.0045, LP, LP);
    geo.translate(0, LP / 2, 0);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const face = Math.floor(i / 4); // px, nx, py, ny, pz, nz
      if (face === 1) uv.setX(i, uv.getX(i) + 2);
      else if (face !== 0) uv.setX(i, -1);
    }
    const n = this.items.length;
    const mesh = new THREE.InstancedMesh(geo, recordMaterial(), n);
    const idx = new Float32Array(n);
    this.items.forEach((it, i) => { idx[i] = it.cover; it.i = i; });
    geo.setAttribute("coverIdx", new THREE.InstancedBufferAttribute(idx, 1));
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.dynamic = true;
    this.mesh = mesh;
    for (const it of this.items) this.write(it);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  }
  write(it) {
    _q.setFromEuler(_e.set(0, it.yaw, it.angle, "YZX"));
    _m.compose(it.pos, _q, _one);
    this.mesh.setMatrixAt(it.i, _m);
  }
  /** Ease animated sleeves toward their targets. Returns true if anything moved. */
  update(dt) {
    let moved = false;
    for (const it of this.items) {
      if (it.angle === it.target) continue;
      const k = 1 - Math.exp(-dt * (it.speed || 14));
      it.angle += (it.target - it.angle) * k;
      if (Math.abs(it.target - it.angle) < 0.002) it.angle = it.target;
      this.write(it); moved = true;
    }
    if (moved) this.mesh.instanceMatrix.needsUpdate = true;
    return moved;
  }
}
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _m = new THREE.Matrix4(), _one = new THREE.Vector3(1, 1, 1);

/** All books in one InstancedMesh. Local book: x = thickness, y = height, z = depth, spine faces +z. */
export class BookSet {
  constructor() { this.items = []; this.r = rng(77); }
  add(x, y, z, t, h, d, yaw = 0, roll = 0, spine = null) {
    this.items.push({ x, y, z, t, h, d, yaw, roll, spine: spine ?? Math.floor(this.r() * 127) });
  }
  /** A row of standing books along local +x from (x,y,z), spines facing direction `yaw`. Returns end offset. */
  row(x, y, z, yaw, length, { hMin = 0.18, hMax = 0.27, dMin = 0.13, dMax = 0.18, lean = true } = {}) {
    const r = this.r;
    const dir = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); // local +x after yaw
    let s = 0;
    while (s < length - 0.03) {
      const t = 0.018 + r() * 0.03, h = hMin + r() * (hMax - hMin), d = dMin + r() * (dMax - dMin);
      if (s + t > length) break;
      this.add(x + dir.x * (s + t / 2), y, z + dir.z * (s + t / 2), t, h, d, yaw, 0);
      s += t + 0.001;
    }
    if (lean && s < length - 0.06) {
      const t = 0.025, h = hMin + 0.03;
      this.add(x + dir.x * (s + 0.06), y, z + dir.z * (s + 0.06), t, h, dMin + 0.02, yaw, -0.32);
    }
    return s;
  }
  stack(x, y, z, n, yaw = 0) {
    let yy = y;
    for (let i = 0; i < n; i++) {
      const t = 0.025 + this.r() * 0.025, h = 0.2 + this.r() * 0.08, d = 0.15 + this.r() * 0.05;
      this.items.push({ x, y: yy, z, t, h, d, yaw: yaw + (this.r() - 0.5) * 0.25, roll: Math.PI / 2, spine: Math.floor(this.r() * 127), flat: true });
      yy += t;
    }
    return yy;
  }
  build() {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const face = Math.floor(i / 4); // px nx py ny pz nz ; pz = spine
      if (face === 2 || face === 3 || face === 5) uv.setX(i, -1);
    }
    const n = this.items.length;
    const mesh = new THREE.InstancedMesh(geo, bookMaterial(), n);
    const idx = new Float32Array(n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
    this.items.forEach((b, i) => {
      idx[i] = b.spine;
      if (b.flat) {
        // lying flat: rotate so the book's height runs horizontally, spine still visible
        e.set(0, b.yaw, b.roll, "YXZ");
        q.setFromEuler(e);
        p.set(b.x, b.y + b.t / 2, b.z);
      } else {
        e.set(0, b.yaw, b.roll, "YXZ");
        q.setFromEuler(e);
        // pivot at bottom: offset centre up by h/2 rotated by roll
        const off = new THREE.Vector3(0, b.h / 2, 0).applyQuaternion(q);
        p.set(b.x, b.y, b.z).add(off);
        if (b.roll) p.y = b.y + Math.cos(b.roll) * b.h / 2 + Math.abs(Math.sin(b.roll)) * b.t / 2;
      }
      s.set(b.t, b.h, b.d);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    geo.setAttribute("spineIdx", new THREE.InstancedBufferAttribute(idx, 1));
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    return mesh;
  }
}

// ---------------------------------------------------------------------------
export function galvBox(w, h, d) {
  const g = new THREE.Group();
  g.add(cbox(w, h, d, M.galv, 0, h / 2, 0, { tile: [0.5, 0.5], round: 0.006 }));
  g.add(cbox(w + 0.012, 0.025, d + 0.012, M.galv, 0, h - 0.0125, 0, { tile: [0.5, 0.5], round: 0.004 }));
  // front label holder + handle
  g.add(cbox(w * 0.32, 0.05, 0.004, M.steel, 0, h * 0.62, d / 2 + 0.003, { uv: false }));
  g.add(cbox(w * 0.22, 0.035, 0.003, M.paper, 0, h * 0.62, d / 2 + 0.006, { uv: false, cast: false }));
  const handle = cyl(0.006, 0.006, w * 0.3, M.steel, 8);
  handle.rotation.z = Math.PI / 2; handle.position.set(0, h * 0.35, d / 2 + 0.016); g.add(handle);
  return g;
}

export function mug(mat = M.mug) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.04, 0.095, 32, 1, true), mat);
  body.position.y = 0.0475; body.castShadow = true; body.rotation.y = -Math.PI / 2; g.add(body);
  M.ceramicIn ??= new THREE.MeshPhysicalMaterial({ color: 0xf3eee3, roughness: 0.22, clearcoat: 0.8, side: THREE.BackSide });
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.036, 0.09, 24, 1, true), M.ceramicIn);
  inner.position.y = 0.05; g.add(inner);
  const bottom = cyl(0.04, 0.04, 0.006, M.ceramic, 24); bottom.position.y = 0.006; g.add(bottom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.041, 0.0025, 6, 32), M.ceramic); rim.rotation.x = Math.PI / 2; rim.position.y = 0.095; g.add(rim);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0065, 8, 20, Math.PI * 1.25), M.ceramic);
  handle.position.set(0.048, 0.05, 0); handle.rotation.z = -Math.PI * 0.62; handle.castShadow = true; g.add(handle);
  return g;
}

export function pot(kind = "cream", r = 0.09, h = 0.13) {
  const mat = kind === "terracotta" ? M.terracotta : kind === "concrete" ? M.potConcrete : kind === "navy" ? M.ceramicNavy : M.potCream;
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [r * 0.78, 0], [r * 0.86, 0.01], [r, h * 0.9], [r * 1.04, h], [r * 0.94, h], [r * 0.9, h * 0.92]], mat, 28));
  const soil = cyl(r * 0.9, r * 0.9, 0.01, M.soil, 20); soil.position.y = h * 0.86; g.add(soil);
  return g;
}

export function candle() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 24, 1, true), M.glassTint);
  glass.position.y = 0.04; g.add(glass);
  const wax = cyl(0.041, 0.041, 0.05, M.candle, 24); wax.position.y = 0.026; g.add(wax);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), M.flame); flame.scale.set(1, 2.2, 1); flame.position.y = 0.068; g.add(flame);
  flame.userData.flame = true;
  return g;
}

export function frame(w, h, mat, border = 0.02, depth = 0.025) {
  const g = new THREE.Group();
  g.add(cbox(w, h, depth, M.walnutDark, 0, 0, 0, { tile: [0.6, 0.6], round: 0.004 }));
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w - border * 2, h - border * 2), mat);
  art.position.z = depth / 2 + 0.001; g.add(art);
  return g;
}
