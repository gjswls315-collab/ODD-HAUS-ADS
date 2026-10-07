// Shared parts for the small object characters:
//  - sculpted glove + sneaker from assets/kit_tiny.glb (tools/model/kit_tiny.py), recoloured per character
//  - HoseLimb: one continuous, smoothly bending tube from hip to ankle / shoulder to wrist,
//    rebuilt every frame from the joint positions (no segments, no ball joints).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { M, mat } from "../core/mats.js";
import { fabric } from "../core/textures.js";

let KIT = null;

export async function loadTinyKit(assetBase = "./assets/") {
  if (KIT !== null) return KIT;
  KIT = false;
  try {
    const res = await fetch(`${assetBase}kit_tiny.glb`);
    const type = res.headers.get("content-type") || "";
    if (!res.ok || type.includes("text/html")) return KIT;
    const gltf = await new GLTFLoader().parseAsync(await res.arrayBuffer(), assetBase);
    const get = (n) => gltf.scene.getObjectByName(n);
    KIT = {
      palm: get("Glove_Palm"),
      shoe: ["Shoe_Sole", "Shoe_Stripe", "Shoe_Upper", "Shoe_Laces", "Shoe_Patch"].map(get).filter(Boolean),
    };
    if (!KIT.palm || KIT.shoe.length < 3) KIT = false;
  } catch (e) { KIT = false; }
  return KIT;
}

export const hasKit = () => !!KIT;

function canvasMat(color, rough = 0.85) {
  const t = fabric(color, 3, 2).clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.needsUpdate = true;
  return new THREE.MeshPhysicalMaterial({ map: t, color: "#ffffff", roughness: rough, sheen: 0.5, sheenColor: new THREE.Color(color).multiplyScalar(1.6), sheenRoughness: 0.7, vertexColors: true });
}

/** Sculpted cartoon glove. Origin at the wrist, fingers -Y, thumb +X, palm +Z. side -1 mirrors it. */
export function makeKitGlove(s = 0.03, side = 1, color = "#e2dccf") {
  const g = new THREE.Group();
  g.name = "Glove";
  const palm = KIT.palm.clone(true);
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.72, sheen: 0.25, sheenColor: new THREE.Color("#fff6ea"), sheenRoughness: 0.6, vertexColors: true });
  palm.traverse((o) => { if (o.isMesh) { o.material = m; o.castShadow = true; o.receiveShadow = true; } });
  palm.position.set(0, 0, 0);
  palm.scale.set(s * side, s, s);
  g.add(palm);
  const fingers = ["Glove_F0", "Glove_F1", "Glove_F2"].map((n) => palm.getObjectByName(n));
  const thumb = palm.getObjectByName("Glove_Thumb");
  const rest = [...fingers, thumb].map((f) => f?.quaternion.clone());
  g.setCurl = (v) => {
    fingers.forEach((f, i) => { if (!f) return; f.quaternion.copy(rest[i]); f.rotation.x = -v * 1.55 - 0.05; f.rotation.z = (i - 1) * 0.06 * (1 - v); });
    if (thumb) { thumb.quaternion.copy(rest[3]); thumb.rotation.y = -v * 0.9; thumb.rotation.x = -v * 0.3; }
  };
  g.setCurl(0.15);
  return g;
}

/** Sculpted chunky sneaker. Origin at the ankle, toe +Z, ground at y = -0.44 s. */
export function makeKitSneaker({ s = 0.06, upper = "#c8262c", sole = "#f1ede4", lace = "#f6f4ee", stripe = null, worn = 0, canvas = true } = {}) {
  const g = new THREE.Group();
  g.name = "Sneaker";
  const mats = {
    Shoe_Upper: canvas ? canvasMat(upper) : new THREE.MeshPhysicalMaterial({ color: upper, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3, vertexColors: true }),
    Shoe_Sole: new THREE.MeshPhysicalMaterial({ color: sole, roughness: 0.6 + worn * 0.2, vertexColors: true }),
    Shoe_Stripe: new THREE.MeshPhysicalMaterial({ color: stripe ?? (worn ? "#7b7368" : "#2a2a2a"), roughness: 0.6, vertexColors: true }),
    Shoe_Laces: new THREE.MeshPhysicalMaterial({ color: lace, roughness: 0.85, sheen: 0.4, sheenColor: new THREE.Color("#ffffff"), vertexColors: true }),
    Shoe_Patch: new THREE.MeshPhysicalMaterial({ color: sole, roughness: 0.5, vertexColors: true }),
  };
  for (const src of KIT.shoe) {
    const c = src.clone();
    c.material = mats[src.name] || mats.Shoe_Sole;
    c.castShadow = true; c.receiveShadow = true;
    c.position.multiplyScalar(s);
    c.scale.setScalar(s);
    g.add(c);
  }
  return g;
}

// ---------------------------------------------------------------- rubber-hose limbs
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _t = new THREE.Vector3(), _n = new THREE.Vector3(), _bn = new THREE.Vector3(), _p = new THREE.Vector3();
const _m = new THREE.Matrix4();

export class HoseLimb {
  /** joints: [Object3D root, Object3D mid, Object3D end]; r0/r1 radii; space = Object3D the mesh lives in */
  constructor(joints, r0, r1, material, space, { radial = 9, segs = 14, extendStart = 0, extendEnd = 0 } = {}) {
    this.j = joints; this.r0 = r0; this.r1 = r1; this.space = space;
    this.radial = radial; this.segs = segs; this.ext0 = extendStart; this.ext1 = extendEnd;
    const nv = (segs + 1) * radial + 2;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nv * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(nv * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < segs; i++) for (let k = 0; k < radial; k++) {
      const a = i * radial + k, b = i * radial + (k + 1) % radial, c = a + radial, d = b + radial;
      idx.push(a, c, b, b, c, d);
    }
    const cap0 = (segs + 1) * radial, cap1 = cap0 + 1;
    for (let k = 0; k < radial; k++) {
      idx.push(cap0, k, (k + 1) % radial);
      idx.push(cap1, segs * radial + (k + 1) % radial, segs * radial + k);
    }
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.name = "HoseLimb";
    space.add(this.mesh);
  }

  update() {
    const [J0, J1, J2] = this.j;
    this.space.updateWorldMatrix(true, false);
    _m.copy(this.space.matrixWorld).invert();
    J0.getWorldPosition(_a).applyMatrix4(_m);
    J1.getWorldPosition(_b).applyMatrix4(_m);
    J2.getWorldPosition(_c).applyMatrix4(_m);
    // quadratic Bezier through the middle joint at t = 0.5
    const ctrl = _b.clone().multiplyScalar(2).sub(_a.clone().add(_c).multiplyScalar(0.5));
    const P0 = _a.clone(), P2 = _c.clone();
    if (this.ext0) P0.add(P0.clone().sub(ctrl).normalize().multiplyScalar(this.ext0));
    if (this.ext1) P2.add(P2.clone().sub(ctrl).normalize().multiplyScalar(this.ext1));
    const pos = this.mesh.geometry.attributes.position, nor = this.mesh.geometry.attributes.normal;
    const R = this.radial, S = this.segs;
    // reference normal: perpendicular to the limb plane (stable, no twisting)
    const ref = new THREE.Vector3().subVectors(P0, ctrl).cross(new THREE.Vector3().subVectors(P2, ctrl));
    if (ref.lengthSq() < 1e-12) ref.set(1, 0, 0); else ref.normalize();
    for (let i = 0; i <= S; i++) {
      const t = i / S, u = 1 - t;
      _p.set(0, 0, 0).addScaledVector(P0, u * u).addScaledVector(ctrl, 2 * u * t).addScaledVector(P2, t * t);
      _t.set(0, 0, 0).addScaledVector(ctrl.clone().sub(P0), 2 * u).addScaledVector(P2.clone().sub(ctrl), 2 * t).normalize();
      _n.copy(ref).addScaledVector(_t, -ref.dot(_t)).normalize();
      _bn.crossVectors(_t, _n);
      const r = this.r0 + (this.r1 - this.r0) * t;
      for (let k = 0; k < R; k++) {
        const a = (k / R) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const nx = _n.x * ca + _bn.x * sa, ny = _n.y * ca + _bn.y * sa, nz = _n.z * ca + _bn.z * sa;
        const vi = i * R + k;
        pos.setXYZ(vi, _p.x + nx * r, _p.y + ny * r, _p.z + nz * r);
        nor.setXYZ(vi, nx, ny, nz);
      }
      if (i === 0) { pos.setXYZ(S * R + R, _p.x, _p.y, _p.z); nor.setXYZ(S * R + R, -_t.x, -_t.y, -_t.z); }
      if (i === S) { pos.setXYZ(S * R + R + 1, _p.x, _p.y, _p.z); nor.setXYZ(S * R + R + 1, _t.x, _t.y, _t.z); }
    }
    pos.needsUpdate = true; nor.needsUpdate = true;
  }
}
