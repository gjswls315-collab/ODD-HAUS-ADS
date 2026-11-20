// Jeon de Vero himself, at full size, as in the brand's skate poster: JDV cap, sleepy eyes,
// moustache, cigarette; black tee with the oval JDV mark, very baggy pants, skate shoes.
// Body: 3D, rigged (so it lights, shadows and occludes in the set). Head: the brand's own drawn
// head (from the logo sheet) as a paper-puppet sprite that always faces the lens and mirrors
// when he faces the other way — a double take is a crisp flip, as in cut-out animation.
import * as THREE from "three";
import { M } from "/jdv-store/src/materials.js";
import { canvas, tex } from "/jdv-store/src/textures.js";
import { mug } from "/jdv-store/src/world/props.js";
import { HEAD, HEAD_M, ART_META } from "./assets/jdvArt.js";

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
function capsule(r, len, mat, seg = 12) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, seg), mat); m.castShadow = true; m.receiveShadow = true; return m; }
function tube(r0, r1, len, mat, seg = 16) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, seg), mat); m.castShadow = true; m.receiveShadow = true; return m; }
function box(w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; m.receiveShadow = true; return m; }
function ball(r, mat, sx = 1, sy = 1, sz = 1) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; return m; }

function chestMark() {
  const c = canvas(256, 160), g = c.getContext("2d");
  g.strokeStyle = "#efe6d4"; g.lineWidth = 9;
  g.beginPath(); g.ellipse(128, 80, 112, 62, 0, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#efe6d4"; g.font = 'italic 900 78px "Archivo Black", "Arial Black", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("JDV", 128, 86);
  return tex(c, { wrap: false });
}

const loadImg = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
/** The drawn head and its mirror (the mirror keeps the cap lettering readable: see tools/extract_art.py). */
export function loadHead() { return Promise.all([loadImg(HEAD), loadImg(HEAD_M)]); }

/** Build the rig. Local frame: feet at origin, facing +z, his left = +x. */
export function buildJDV([headImg, headImgM]) {
  const mat = {
    tee: std({ color: 0x1b1b1d, roughness: 0.95 }),
    pants: std({ color: 0x8a8580, roughness: 0.98 }),
    pantsDark: std({ color: 0x55524e, roughness: 0.98 }),
    skin: std({ color: 0xc99f74, roughness: 0.8 }),
    shoe: std({ color: 0x17171a, roughness: 0.7 }),
    sole: std({ color: 0xf2efe6, roughness: 0.8 }),
    mark: new THREE.MeshStandardMaterial({ map: chestMark(), transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }),
  };
  const J = { root: new THREE.Group(), mat };
  const pelvis = new THREE.Group(); pelvis.position.y = 0.86; J.root.add(pelvis); J.pelvis = pelvis;
  // waist of the trousers
  const waist = tube(0.245, 0.215, 0.24, mat.pants, 20); waist.scale.z = 0.66; waist.position.y = -0.04; pelvis.add(waist); // the seat of very baggy trousers
  // legs: hip → knee → ankle; very baggy, rolled cuffs
  for (const [k, s] of [["L", 1], ["R", -1]]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.11, 0, 0); pelvis.add(hip);
    const thigh = tube(0.118, 0.13, 0.44, mat.pants); thigh.position.y = -0.21; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.42; hip.add(knee);
    const shin = tube(0.13, 0.142, 0.36, mat.pants); shin.position.y = -0.18; knee.add(shin);
    const cuff = tube(0.146, 0.146, 0.06, mat.pantsDark); cuff.position.y = -0.36; knee.add(cuff);
    const ankle = new THREE.Group(); ankle.position.y = -0.4; knee.add(ankle);
    const shoe = box(0.125, 0.085, 0.3, mat.shoe); shoe.position.set(0, -0.0, 0.06); ankle.add(shoe);
    const toe = ball(0.065, mat.shoe, 0.98, 0.7, 1); toe.position.set(0, -0.005, 0.2); ankle.add(toe);
    const sole = box(0.13, 0.03, 0.33, mat.sole); sole.position.set(0, -0.055, 0.075); ankle.add(sole);
    const cap = box(0.13, 0.05, 0.03, mat.sole); cap.position.set(0, -0.02, 0.255); ankle.add(cap);
    J["hip" + k] = hip; J["knee" + k] = knee; J["ankle" + k] = ankle;
  }
  // torso: boxy oversized black tee
  const torso = new THREE.Group(); torso.position.y = 0.06; pelvis.add(torso); J.torso = torso;
  const tee = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.235, 0.5, 20), mat.tee);
  tee.scale.set(1.05, 1, 0.6); tee.position.y = 0.24; tee.castShadow = tee.receiveShadow = true; torso.add(tee);
  const chest = ball(0.215, mat.tee, 1.05, 0.55, 0.62); chest.position.y = 0.46; torso.add(chest);
  const mk = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.08), mat.mark); mk.position.set(0.085, 0.36, 0.142); mk.rotation.y = 0.18; torso.add(mk);
  const neck = new THREE.Group(); neck.position.y = 0.55; torso.add(neck); J.neck = neck;
  const neckMesh = tube(0.05, 0.046, 0.07, mat.skin); neckMesh.position.y = 0.0; neck.add(neckMesh); // tucked into the collar
  // arms: shoulder (abduction then flexion) → elbow → wrist; lanky, cartoon hands
  for (const [k, s] of [["L", 1], ["R", -1]]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.215, 0.47, 0); torso.add(sh);
    const sleeve = tube(0.082, 0.078, 0.2, mat.tee); sleeve.position.y = -0.07; sh.add(sleeve);
    const upper = capsule(0.04, 0.24, mat.skin); upper.position.y = -0.16; sh.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.3; sh.add(elbow);
    const fore = capsule(0.038, 0.24, mat.skin); fore.position.y = -0.14; elbow.add(fore);
    const wrist = new THREE.Group(); wrist.position.y = -0.29; elbow.add(wrist);
    const palm = ball(0.055, mat.skin, 0.75, 1.15, 0.55); palm.position.y = -0.045; wrist.add(palm);
    const thumb = capsule(0.018, 0.04, mat.skin, 8); thumb.position.set(-s * 0.0, -0.035, 0.04); thumb.rotation.x = -0.6; wrist.add(thumb);
    for (let f = 0; f < 3; f++) { const fi = capsule(0.016, 0.045, mat.skin, 8); fi.position.set((f - 1) * 0.024, -0.11, 0.005); wrist.add(fi); }
    J["sh" + k] = sh; J["elbow" + k] = elbow; J["wrist" + k] = wrist;
  }
  // the drawn head: sprite anchored under the chin
  // sprites ignore negative scale, so the mirrored head is its own texture
  const headMat = (img) => { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return new THREE.SpriteMaterial({ map: t, transparent: true, alphaTest: 0.35, depthWrite: true }); };
  const hmat = headMat(headImg);
  const head = new THREE.Sprite(hmat);
  J.headMats = [hmat, headMat(headImgM)];
  const [iw, ih] = ART_META.head;
  const H = 0.5;
  head.scale.set(H * iw / ih, H, 1);
  head.center.set(0.62, 0.035);
  head.position.y = 0.05;
  neck.add(head);
  J.head = head; J.headH = H; J.headW = H * iw / ih;
  J.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // props
  J.props = {};
  J.props.mug = mug(); J.props.mug.scale.setScalar(1.25);
  J.props.board = skateboard();
  return J;
}

export function skateboard() {
  const g = new THREE.Group();
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.6 });
  const grip = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 });
  const metal = M.steel, wheel = new THREE.MeshStandardMaterial({ color: 0xeee8d8, roughness: 0.4 });
  const mid = box(0.2, 0.014, 0.56, deckMat); g.add(mid);
  const top = box(0.198, 0.002, 0.56, grip); top.position.y = 0.008; g.add(top);
  for (const s of [-1, 1]) {
    const tail = new THREE.Group(); tail.position.z = s * 0.28; tail.rotation.x = -s * 0.28; g.add(tail);
    const t = box(0.2, 0.014, 0.16, deckMat); t.position.z = s * 0.07; tail.add(t);
    const tg = box(0.198, 0.002, 0.16, grip); tg.position.set(0, 0.008, s * 0.07); tail.add(tg);
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.014, 20, 1, false, s > 0 ? 0 : Math.PI, Math.PI), deckMat);
    nose.rotation.y = Math.PI / 2; nose.position.z = s * 0.15; tail.add(nose);
    const truck = box(0.16, 0.035, 0.05, metal); truck.position.set(0, -0.03, s * 0.2); g.add(truck);
    for (const w of [-1, 1]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.034, 16), wheel); wh.rotation.z = Math.PI / 2; wh.position.set(w * 0.09, -0.055, s * 0.2); wh.castShadow = true; g.add(wh); }
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Neutral pose (radians / metres). */
export const STAND = {
  x: 0, z: 0, y: 0, yaw: 0, lean: 0.04, twist: 0, tilt: 0, crouch: 0,
  hipLx: 0, hipLz: 0.05, kneeL: 0.05, ankleL: 0, hipRx: 0, hipRz: -0.05, kneeR: 0.05, ankleR: 0,
  shLab: 0.14, shLfl: 0.05, elbL: 0.25, shRab: 0.14, shRfl: 0.05, elbR: 0.25, wristL: 0, wristR: 0,
  headTilt: 0, headBob: 0, headMirror: null, headScale: 1,
};

/** Apply a pose; camera decides which way the drawn head faces unless headMirror is forced. */
export function applyJDV(J, p, camera) {
  J.root.position.set(p.x, p.y, p.z);
  J.root.rotation.y = p.yaw;
  J.pelvis.position.y = 0.86 - p.crouch;
  J.torso.rotation.set(p.lean, p.twist, p.tilt);
  J.hipL.rotation.set(-p.hipLx, 0, p.hipLz); J.hipR.rotation.set(-p.hipRx, 0, p.hipRz);
  J.kneeL.rotation.x = p.kneeL; J.kneeR.rotation.x = p.kneeR;
  J.ankleL.rotation.x = p.ankleL - p.kneeL + p.hipLx * 0.8; J.ankleR.rotation.x = p.ankleR - p.kneeR + p.hipRx * 0.8;
  J.shL.rotation.set(-p.shLfl, 0, p.shLab); J.shR.rotation.set(-p.shRfl, 0, -p.shRab);
  J.elbowL.rotation.x = -p.elbL; J.elbowR.rotation.x = -p.elbR;
  J.wristL.rotation.x = p.wristL; J.wristR.rotation.x = p.wristR;
  J.root.updateMatrixWorld(true);
  // which way does he face on screen?
  let mirror = p.headMirror;
  if (mirror == null && camera) {
    const f = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw)).transformDirection(camera.matrixWorldInverse);
    mirror = f.x < 0;
  }
  J.mirrored = !!mirror;
  const s = p.headScale;
  J.head.material = J.headMats[mirror ? 1 : 0];
  J.head.scale.set(J.headW * s, J.headH * s, 1);
  J.head.center.set(mirror ? 1 - 0.62 : 0.62, 0.035);
  J.head.material.rotation = (mirror ? -1 : 1) * -p.headTilt;
  J.head.position.y = 0.05 + p.headBob;
}

/** World position of the cigarette tip (for smoke). */
export function cigTip(J) {
  const p = new THREE.Vector3(); J.head.getWorldPosition(p);
  const w = J.headW * Math.abs(J.head.scale.x) / J.headW, h = J.head.scale.y;
  // cigarette tip in the head art: u≈0.96, v≈0.29 (from the bottom); the sprite is anchored at (0.62, 0.035)
  const du = (0.96 - 0.62) * Math.abs(J.head.scale.x), dv = (0.29 - 0.035) * h;
  return { anchor: p, du: J.mirrored ? -du : du, dv };
}
