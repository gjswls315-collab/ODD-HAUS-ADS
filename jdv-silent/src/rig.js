// Mr. Vero, the JDV mascot as a 24 cm vinyl figure, rigged for pantomime.
// Same design as the shop's figures (jdv-store/src/world/mascot.js) but with live joints:
// root → hop (squash) → legs, torso (lean/sway) → arms (abduction THEN flexion), head.
// The face never moves: deadpan; the body does the acting.
import * as THREE from "three";
import { M } from "/jdv-store/src/materials.js";
import { capFront } from "/jdv-store/src/brand.js";
import { PAL, tex } from "/jdv-store/src/textures.js";

const paint = (hex, o = {}) => new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.35, ...o });

function ell(r, sx, sy, sz, mat, x, y, z, ws = 20, hs = 14) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
function caps(r, mat, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, dir.length()), 6, 12), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildRig(scale = 0.24) {
  const m = {
    crown: new THREE.MeshPhysicalMaterial({ map: tex(capFront(PAL.navy, "#efe5cf"), { wrap: false }), roughness: 0.55, clearcoat: 0.25 }),
    brim: paint(PAL.navy), shirt: paint("#efe5cf"), tie: paint(PAL.navy), pants: paint(PAL.navy), shoes: paint("#5a3320"),
    skin: M.skin, hair: M.hair, eye: M.eyeWhite, pupil: M.ink, lid: paint(0xe2b48c), nose: paint(0xf0b892),
  };
  const root = new THREE.Group();
  const hop = new THREE.Group(); root.add(hop);
  const J = { root, hop };
  // legs (pivot at the hip)
  for (const [k, s] of [["legL", 1], ["legR", -1]]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.075, 0.19, 0); hop.add(leg);
    leg.add(caps(0.062, m.pants, V(0, -0.12, 0), V(0, 0, 0)));
    leg.add(ell(0.075, 1, 0.55, 1.45, m.shoes, 0, -0.155, 0.03));
    J[k] = leg;
  }
  // torso (pivot at the hips)
  const torso = new THREE.Group(); torso.position.y = 0.2; hop.add(torso); J.torso = torso;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.12, 8, 20), m.shirt);
  body.position.y = 0.12; body.scale.set(1.05, 1, 0.82); body.castShadow = true; torso.add(body);
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.14, 0.09, 24), m.pants);
  hips.position.y = 0.015; hips.scale.set(1.05, 1, 0.82); hips.castShadow = true; torso.add(hips);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.02), m.tie); tie.position.set(0, 0.16, 0.122); tie.rotation.x = -0.12; torso.add(tie);
  torso.add(ell(0.028, 1, 0.8, 0.6, m.tie, 0, 0.24, 0.115));
  for (const s of [-1, 1]) { const col = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.02), m.shirt); col.position.set(s * 0.035, 0.255, 0.11); col.rotation.set(-0.3, 0, s * 0.5); torso.add(col); }
  // arms (pivot at the shoulder). Euler XYZ = Z (abduction) applied first, then X (flexion).
  for (const [k, s] of [["armL", 1], ["armR", -1]]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.15, 0.225, 0); torso.add(arm);
    arm.add(caps(0.046, m.shirt, V(0, 0, 0), V(s * 0.045, -0.155, 0.02)));
    arm.add(ell(0.048, 1, 1, 1, m.skin, s * 0.055, -0.19, 0.03));
    J[k] = arm;
  }
  // head (pivot at the neck)
  const neck = new THREE.Group(); neck.position.y = 0.3; torso.add(neck); J.neck = neck;
  const head = new THREE.Group(); head.position.y = 0.16; neck.add(head);
  head.add(ell(0.27, 1.05, 0.96, 0.96, m.skin, 0, 0, 0, 32, 24));
  head.add(ell(0.275, 1.06, 0.8, 0.98, m.hair, 0, -0.01, -0.045, 28, 20));
  for (const s of [-1, 1]) {
    head.add(ell(0.062, 0.6, 1, 0.9, m.skin, s * 0.278, -0.03, 0.0));
    head.add(ell(0.075, 0.7, 1.2, 0.9, m.hair, s * 0.245, -0.06, -0.05));
    head.add(ell(0.05, 1, 1, 1, m.hair, s * 0.21, -0.14, -0.1));
    const ex = s * 0.088, ey = 0.035, ez = 0.228;
    head.add(ell(0.052, 1.15, 0.78, 0.5, m.eye, ex, ey, ez));
    head.add(ell(0.021, 1, 1, 0.6, m.pupil, ex + s * 0.004, ey - 0.012, ez + 0.022));
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.056, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.lid);
    lid.scale.set(1.18, 0.85, 0.62); lid.position.set(ex, ey - 0.004, ez + 0.002); lid.rotation.x = 0.55; head.add(lid);
    head.add(caps(0.017, m.hair, V(ex - s * 0.045, ey + 0.065, ez + 0.005), V(ex + s * 0.045, ey + 0.05, ez + 0.01)));
    for (const [x, y, z, r] of [[0.0, -0.1, 0.27, 0.05], [0.05, -0.11, 0.27, 0.052], [0.1, -0.11, 0.25, 0.046], [0.145, -0.1, 0.22, 0.038], [0.18, -0.08, 0.19, 0.03], [0.198, -0.055, 0.17, 0.024], [0.196, -0.03, 0.16, 0.019]])
      head.add(ell(r, 1, 0.85, 0.85, m.hair, s * x, y, z, 14, 10));
  }
  head.add(ell(0.068, 1.05, 0.95, 0.95, m.nose, 0, -0.035, 0.262));
  head.add(ell(0.08, 1.2, 0.6, 0.8, m.skin, 0, -0.18, 0.18));
  const cap = new THREE.Group(); cap.position.set(0, 0.06, -0.01); cap.rotation.x = -0.1; head.add(cap); J.cap = cap;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.285, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2), m.crown);
  crown.scale.set(1.04, 0.86, 1.02); crown.castShadow = true; cap.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.296, 0.296, 0.03, 36, 1, true), m.crown); band.position.y = -0.012; cap.add(band);
  cap.add(ell(0.024, 1, 0.6, 1, m.brim, 0, 0.245, 0));
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.022, 28, 1, false, -Math.PI / 2, Math.PI), m.brim);
  brim.position.set(0, -0.005, 0.2); brim.scale.set(1.05, 1, 1.12); brim.rotation.x = 0.16; brim.castShadow = true; cap.add(brim);
  root.scale.setScalar(scale);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return J;
}

export const REST = { x: 0, y: 0, z: 0, yaw: 0, hop: 0, squash: 1, lean: 0, sway: 0, hYaw: 0, hPitch: 0, hTilt: 0, aLab: 0.12, aLfl: 0, aRab: 0.12, aRfl: 0, legL: 0, legR: 0, capLift: 0 };

/** Apply a pose (unit-height figure, world position in metres). */
export function applyPose(J, p) {
  J.root.position.set(p.x, p.y, p.z);
  J.root.rotation.y = p.yaw;
  J.hop.position.y = p.hop / J.root.scale.x;
  J.hop.scale.set(1 / Math.sqrt(p.squash), p.squash, 1 / Math.sqrt(p.squash));
  J.torso.rotation.set(p.lean, 0, p.sway);
  J.neck.rotation.set(p.hPitch, p.hYaw, p.hTilt, "YXZ");
  J.armL.rotation.set(-p.aLfl, 0, p.aLab);
  J.armR.rotation.set(-p.aRfl, 0, -p.aRab);
  J.legL.rotation.x = -p.legL; J.legR.rotation.x = -p.legR;
  J.cap.position.y = 0.06 + p.capLift; J.cap.rotation.x = -0.1 - p.capLift * 2.2;
}
