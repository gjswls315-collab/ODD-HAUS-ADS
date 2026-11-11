// Small modelling kit: world-scaled UV boxes, planes, tubes, plus the collider list the camera
// planner checks its paths against.
import * as THREE from 'three';
import { toon, glowMat } from '../core/toon.js';

export const colliders = []; // { name, box: THREE.Box3 }

export function solid(name, x0, y0, z0, x1, y1, z1) {
  colliders.push({ name, box: new THREE.Box3(new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1))) });
}

// Box whose texture tiles in metres (`tile` = metres per UV unit) instead of stretching per face.
export function box(w, h, d, mat, { tile = 0, x = 0, y = 0, z = 0, ry = 0, name = '', collide = false, parent = null } = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (tile) {
    const uv = geo.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, (uv.getX(k) * dims[f][0]) / tile, (uv.getY(k) * dims[f][1]) / tile);
    }
  }
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.y = ry; m.name = name;
  if (collide) solid(name || 'box', x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2);
  if (parent) parent.add(m);
  return m;
}

export function plane(w, h, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, tile = 0, seg = [1, 1], parent = null, name = '', order = 0 } = {}) {
  const geo = new THREE.PlaneGeometry(w, h, seg[0], seg[1]);
  if (tile) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile); }
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.name = name; m.renderOrder = order;
  if (parent) parent.add(m);
  return m;
}

export function cyl(rt, rb, h, mat, { x = 0, y = 0, z = 0, rx = 0, rz = 0, seg = 20, parent = null, open = false } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat);
  m.position.set(x, y, z); m.rotation.set(rx, 0, rz);
  if (parent) parent.add(m);
  return m;
}

export function tube(points, radius, mat, { seg = 24, rs = 6, parent = null } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, radius, rs, false), mat);
  if (parent) parent.add(m);
  return m;
}

export function lathe(profile, mat, { seg = 28, x = 0, y = 0, z = 0, parent = null } = {}) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), seg), mat);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}

// Soft contact shadow painted onto a surface (there are no shadow maps; this grounds the props).
let shadowTex = null;
export function contact(w, d, { x = 0, y = 0, z = 0, opacity = 0.55, parent = null, ry = 0, wall = false } = {}) {
  if (!shadowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const mat = new THREE.MeshBasicMaterial({ map: shadowTex, color: 0x05060a, transparent: true, opacity, depthWrite: false, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  if (wall) m.rotation.y = ry; else { m.rotation.x = -Math.PI / 2; m.rotation.z = ry; }
  m.position.set(x, y, z); m.renderOrder = 1;
  if (parent) parent.add(m);
  return m;
}

// Camera-facing glow card for bulbs and lamp heads.
export function halo(tex, color, size, intensity, { x = 0, y = 0, z = 0, parent = null } = {}) {
  const mat = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
  mat.userData.base = mat.color.clone();
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1); s.position.set(x, y, z); s.renderOrder = 5;
  if (parent) parent.add(s);
  return s;
}

export { toon, glowMat, THREE };
