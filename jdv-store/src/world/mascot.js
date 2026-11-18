// The JDV mascot as a vinyl designer-toy figure: cap with JDV, sleepy eyes,
// round nose, big moustache, shirt and tie. Built from primitives, then baked
// to a handful of meshes. Unit height ≈ 1 (top of cap).
import * as THREE from "three";
import { M } from "../materials.js";
import { mergeStatic } from "../geo.js";
import { capFront } from "../brand.js";
import { PAL, tex } from "../textures.js";

export const VARIANTS = {
  classic: { name: "Classic", crown: "#efe5cf", jdv: PAL.navy, brim: PAL.navy, shirt: "#efe5cf", tie: PAL.navy, pants: PAL.navy, shoes: "#5a3320", base: PAL.navy, swatch: "#efe5cf" },
  midnight: { name: "Midnight", crown: PAL.navy, jdv: PAL.cream, brim: "#121a2b", shirt: "#26355a", tie: PAL.red, pants: "#22252c", shoes: "#1b1b1b", base: "#121a2b", swatch: "#26355a" },
  burgundy: { name: "Burgundy", crown: PAL.burgundy, jdv: PAL.cream, brim: PAL.navy, shirt: "#efe5cf", tie: PAL.burgundy, pants: PAL.burgundy, shoes: "#3a2418", base: PAL.burgundy, swatch: PAL.burgundy },
  forest: { name: "Forest", crown: "#2c4a33", jdv: PAL.cream, brim: "#efe5cf", shirt: "#a9b89a", tie: "#2c4a33", pants: "#2c4a33", shoes: "#4a3020", base: "#2c4a33", swatch: "#3f6b48" },
  gold: { name: "Gold", gold: true, base: "#7a5a22", swatch: "#d4a64a" },
};

const cache = {};
function mats(key) {
  if (cache[key]) return cache[key];
  const v = VARIANTS[key];
  const paint = (hex, o = {}) => new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.35, ...o });
  let m;
  if (v.gold) {
    const g = new THREE.MeshStandardMaterial({ color: 0xd8aa52, metalness: 1, roughness: 0.22 });
    const gd = new THREE.MeshStandardMaterial({ color: 0x8a6424, metalness: 1, roughness: 0.35 });
    const capT = tex(capFront("#6e4f1a", "#d8aa52"), { wrap: false });
    m = { crown: new THREE.MeshStandardMaterial({ map: capT, metalness: 1, roughness: 0.25 }), brim: g, shirt: g, tie: gd, pants: g, shoes: gd, skin: g, hair: gd, eye: g, pupil: gd, lid: g, nose: g, base: new THREE.MeshStandardMaterial({ color: 0x2a2219, metalness: 0.4, roughness: 0.4 }) };
  } else {
    const capT = tex(capFront(v.jdv, v.crown), { wrap: false });
    m = {
      crown: new THREE.MeshPhysicalMaterial({ map: capT, roughness: 0.55, clearcoat: 0.25 }),
      brim: paint(v.brim), shirt: paint(v.shirt), tie: paint(v.tie), pants: paint(v.pants), shoes: paint(v.shoes),
      skin: M.skin, hair: M.hair, eye: M.eyeWhite, pupil: M.ink, lid: paint(0xe2b48c), nose: paint(0xf0b892),
      base: paint(v.base, { roughness: 0.3 }),
    };
  }
  return (cache[key] = m);
}

function ell(r, sx, sy, sz, mat, x, y, z, ws = 20, hs = 14) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function caps(r, len, mat, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, dir.length()), 6, 12), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Returns a Group, feet at y=0, facing +z, total height ≈ 1 × scale. */
export function buildMascot(variant = "classic", { scale = 1, base = false } = {}) {
  const m = mats(variant);
  const g = new THREE.Group();
  const y0 = base ? 0.045 : 0;

  if (base) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.215, 0.045, 32), m.base);
    b.position.y = 0.0225; b.castShadow = b.receiveShadow = true; g.add(b);
  }
  const body = new THREE.Group(); body.position.y = y0; g.add(body);
  // shoes + legs
  for (const s of [-1, 1]) {
    body.add(ell(0.075, 1, 0.55, 1.45, m.shoes, s * 0.075, 0.035, 0.03));
    body.add(caps(0.062, 0, m.pants, V(s * 0.072, 0.07, 0), V(s * 0.08, 0.19, 0)));
  }
  // torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.12, 8, 20), m.shirt);
  torso.position.set(0, 0.32, 0); torso.scale.set(1.05, 1, 0.82); torso.castShadow = true; body.add(torso);
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.14, 0.09, 24), m.pants);
  hips.position.set(0, 0.215, 0); hips.scale.set(1.05, 1, 0.82); hips.castShadow = true; body.add(hips);
  // tie + collar
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.02), m.tie);
  tie.position.set(0, 0.36, 0.122); tie.rotation.x = -0.12; body.add(tie);
  const knot = ell(0.028, 1, 0.8, 0.6, m.tie, 0, 0.44, 0.115); body.add(knot);
  for (const s of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.02), m.shirt);
    col.position.set(s * 0.035, 0.455, 0.11); col.rotation.set(-0.3, 0, s * 0.5); body.add(col);
  }
  // arms + hands
  for (const s of [-1, 1]) {
    body.add(caps(0.046, 0, m.shirt, V(s * 0.155, 0.43, 0), V(s * 0.205, 0.27, 0.03)));
    body.add(ell(0.048, 1, 1, 1, m.skin, s * 0.212, 0.235, 0.04));
  }
  // head
  const head = new THREE.Group(); head.position.y = 0.66; body.add(head);
  head.add(ell(0.27, 1.05, 0.96, 0.96, m.skin, 0, 0, 0, 32, 24));
  head.add(ell(0.275, 1.06, 0.8, 0.98, m.hair, 0, -0.01, -0.045, 28, 20));
  for (const s of [-1, 1]) {
    head.add(ell(0.062, 0.6, 1, 0.9, m.skin, s * 0.278, -0.03, 0.0));
    head.add(ell(0.075, 0.7, 1.2, 0.9, m.hair, s * 0.245, -0.06, -0.05)); // sideburn curls
    head.add(ell(0.05, 1, 1, 1, m.hair, s * 0.21, -0.14, -0.1));
  }
  // eyes (sleepy, heavy lids)
  for (const s of [-1, 1]) {
    const ex = s * 0.088, ey = 0.035, ez = 0.228;
    head.add(ell(0.052, 1.15, 0.78, 0.5, m.eye, ex, ey, ez));
    head.add(ell(0.021, 1, 1, 0.6, m.pupil, ex + s * 0.004, ey - 0.012, ez + 0.022));
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.056, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.lid);
    lid.scale.set(1.18, 0.85, 0.62); lid.position.set(ex, ey - 0.004, ez + 0.002); lid.rotation.x = 0.55; lid.castShadow = true;
    head.add(lid);
    // brow
    head.add(caps(0.017, 0, m.hair, V(ex - s * 0.045, ey + 0.065, ez + 0.005), V(ex + s * 0.045, ey + 0.05, ez + 0.01)));
  }
  // nose
  head.add(ell(0.068, 1.05, 0.95, 0.95, m.nose, 0, -0.035, 0.262));
  // moustache: two curling chains of spheres
  for (const s of [-1, 1]) {
    const pts = [[0.0, -0.1, 0.27, 0.05], [0.05, -0.11, 0.27, 0.052], [0.1, -0.11, 0.25, 0.046], [0.145, -0.1, 0.22, 0.038], [0.18, -0.08, 0.19, 0.03], [0.198, -0.055, 0.17, 0.024], [0.196, -0.03, 0.16, 0.019]];
    for (const [x, y, z, r] of pts) head.add(ell(r, 1, 0.85, 0.85, m.hair, s * x, y, z, 14, 10));
  }
  // chin hint
  head.add(ell(0.08, 1.2, 0.6, 0.8, m.skin, 0, -0.18, 0.18));
  // cap
  const capG = new THREE.Group(); capG.position.set(0, 0.06, -0.01); capG.rotation.x = -0.1; head.add(capG);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.285, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2), m.crown);
  crown.scale.set(1.04, 0.86, 1.02); crown.castShadow = true; capG.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.296, 0.296, 0.03, 36, 1, true), m.crown);
  band.position.y = -0.012; band.scale.set(1.0, 1, 0.98); capG.add(band);
  const button = ell(0.024, 1, 0.6, 1, m.brim, 0, 0.245, 0); capG.add(button);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.022, 28, 1, false, -Math.PI / 2, Math.PI), m.brim);
  brim.position.set(0, -0.005, 0.2); brim.scale.set(1.05, 1, 1.12); brim.rotation.x = 0.16; brim.castShadow = true; capG.add(brim);

  g.scale.setScalar(scale);
  const baked = new THREE.Group();
  g.updateMatrixWorld(true);
  mergeStatic(g);
  baked.add(g);
  return baked;
}
