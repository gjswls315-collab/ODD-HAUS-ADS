// The five small object characters, modelled directly in Three.js.
// Heights (metres): Picker 0.23, Vin 0.25, A.A. 0.28, Locke 0.30, Rex 0.35.
import * as THREE from "three";
import {
  group, mesh, ellipsoid, capsule, roundedBox, lathe, extrude, tube, roundedPolygon, sphereGeo, furEllipsoid, furMaterial,
} from "../core/geo.js";
import { M, mat } from "../core/mats.js";
import { vinylBands, paintedWear, agedBrass, knit, woodGrain, fabric } from "../core/textures.js";
import { buildBiped } from "./tinyrig.js";
import { TAU } from "../core/util.js";

const brows = (len, r, material) => capsule(r, len, material, 8);

// ============================================================== VIN
export const VIN = { id: "vin", name: "Vin", height: 0.25, kind: "tiny", shadow: [0.09, 0.05, 0.6] };

export function buildVin() {
  const R = 0.088, T = 0.034, bev = 0.007;
  const legLen = 0.075;
  const body = group("Body");
  // bevelled record: lathe profile centre -> rim -> back centre, v-bands = grooves
  const prof = [];
  const N = 46;
  for (let i = 0; i <= N; i++) prof.push([(i / N) * (R - bev), T / 2]);
  for (let i = 1; i <= 8; i++) { const a = (i / 8) * Math.PI; prof.push([R - bev + Math.sin(a) * bev, Math.cos(a) * T / 2]); }
  for (let i = N; i >= 0; i--) prof.push([(i / N) * (R - bev), -T / 2]);
  const bands = vinylBands("#b3262c", "#efe2c4");
  const vinyl = mat({ physical: true, color: "#ffffff", map: bands.map, roughnessMap: bands.roughnessMap, roughness: 1, clearcoat: 0.7, clearcoatRoughness: 0.22, sheen: 0.2, sheenColor: "#8899ff", sheenRoughness: 0.3 });
  const disc = lathe(prof, vinyl, 96);
  disc.rotation.x = Math.PI / 2;
  const discG = group("Disc", disc);
  discG.position.y = R + 0.004;
  body.add(discG);
  // spindle hole
  const hole = mesh(new THREE.CylinderGeometry(0.0045, 0.0045, T + 0.002, 16), mat({ color: "#050505", roughness: 0.9 }));
  hole.rotation.x = Math.PI / 2;
  hole.position.set(0, R + 0.004, 0);
  body.add(hole);
  // worn scuffs on the rim (small lighter strokes)
  const scuffMat = mat({ color: "#3a3a3a", roughness: 0.8 });
  for (let i = 0; i < 6; i++) {
    const a = 0.6 + i * 0.9;
    const sc = roundedBox(0.012, 0.0025, T * 0.5, 0.001, scuffMat, 1);
    sc.position.set(Math.cos(a) * (R - 0.001), R + 0.004 + Math.sin(a) * (R - 0.001), 0);
    sc.rotation.z = a + Math.PI / 2;
    body.add(sc);
  }
  const lidMat = mat({ color: "#121214", roughness: 0.35, clearcoat: 0.6 });
  const eyeY = R + 0.004 + 0.03;
  const eyes = [
    { pos: [0.026, eyeY, T / 2 + 0.004], rx: 0.022, ry: 0.031, rz: 0.012, lidMat, pupilR: 0.42, rotY: 0.1 },
    { pos: [-0.026, eyeY, T / 2 + 0.004], rx: 0.022, ry: 0.031, rz: 0.012, lidMat, pupilR: 0.42, rotY: -0.1 },
  ];
  const model = buildBiped({
    body, legLen, hipX: 0.022, legR: 0.0045,
    shoe: { s: 0.068, upper: "#c62a2f", sole: "#f1ece2", toe: "#f1ece2", lace: "#faf8f2", canvas: true },
    shoulders: [[R - 0.006, R + 0.004 - 0.005, 0], [-(R - 0.006), R + 0.004 - 0.005, 0]],
    armLen: 0.07, armR: 0.0042, glove: 0.024, eyes,
  });
  return { model, meta: { legLen, stepAngle: 0.55, seed: 3, lid: 0.95 } };
}

// ============================================================== PICKER
export const PICKER = { id: "picker", name: "Picker", height: 0.23, kind: "tiny", shadow: [0.08, 0.05, 0.6] };

function pickShape(w, h) {
  // classic 351 pick: wide rounded shoulders, convex sides, rounded tip (pointing down)
  const s = new THREE.Shape();
  const top = h * 0.48, bot = -h * 0.52;
  s.moveTo(0, top + h * 0.03);
  s.bezierCurveTo(w * 0.36, top + h * 0.05, w * 0.52, top - h * 0.02, w * 0.5, top - h * 0.2);
  s.bezierCurveTo(w * 0.48, top - h * 0.48, w * 0.2, bot + h * 0.16, w * 0.06, bot + h * 0.02);
  s.quadraticCurveTo(0, bot - h * 0.02, -w * 0.06, bot + h * 0.02);
  s.bezierCurveTo(-w * 0.2, bot + h * 0.16, -w * 0.48, top - h * 0.48, -w * 0.5, top - h * 0.2);
  s.bezierCurveTo(-w * 0.52, top - h * 0.02, -w * 0.36, top + h * 0.05, 0, top + h * 0.03);
  return s;
}

export function buildPicker() {
  const W = 0.158, H = 0.16, T = 0.026;
  const legLen = 0.07;
  const body = group("Body");
  const paint = paintedWear("#cf2430", 31, "#ffd9c8");
  const red = mat({ physical: true, color: "#ffffff", map: paint.map, roughnessMap: paint.roughnessMap, roughness: 1, clearcoat: 0.55, clearcoatRoughness: 0.25 });
  const pick = extrude(pickShape(W, H), T - 0.008, red, 0.004);
  pick.position.y = H * 0.52 + 0.004;
  body.add(pick);
  const cy = H * 0.52 + 0.004;
  // bandage: two crossed beige strips with a pad and breathing holes
  const band = mat({ color: "#d9b98c", roughness: 0.8, sheen: 0.3, sheenColor: "#fff1d6" });
  const pad = mat({ color: "#efe0c3", roughness: 0.85 });
  const holeM = mat({ color: "#a98a62", roughness: 0.9 });
  const bandage = group("Bandage");
  for (const [rz, len] of [[0.7, 0.085], [-0.7, 0.07]]) {
    const st = roundedBox(len, 0.022, 0.003, 0.006, band, 3);
    st.rotation.z = rz;
    bandage.add(st);
  }
  const p = roundedBox(0.022, 0.019, 0.0045, 0.004, pad, 2);
  bandage.add(p);
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const h1 = mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.004, 6), holeM, { cast: false });
    h1.rotation.x = Math.PI / 2;
    h1.position.set(Math.cos(0.7) * i * 0.016, Math.sin(0.7) * i * 0.016, 0.0005);
    bandage.add(h1);
  }
  bandage.position.set(-0.042, cy + 0.035, T / 2 + 0.001);
  bandage.rotation.z = 0.15;
  body.add(bandage);
  // big determined eyes with angled lids + thick brows
  const lidMat = mat({ color: "#c41f2a", roughness: 0.45, clearcoat: 0.5 });
  const eyeY = cy + 0.006;
  const eyes = [
    { pos: [0.026, eyeY, T / 2 + 0.002], rx: 0.02, ry: 0.025, rz: 0.011, lidMat, pupilR: 0.4, rotZ: 0.28 },
    { pos: [-0.026, eyeY, T / 2 + 0.002], rx: 0.02, ry: 0.025, rz: 0.011, lidMat, pupilR: 0.4, rotZ: -0.28 },
  ];
  const browM = mat({ color: "#1a0d0d", roughness: 0.6 });
  for (const s of [1, -1]) {
    const b = brows(0.03, 0.0042, browM);
    b.rotation.z = Math.PI / 2 + s * 0.45;
    b.position.set(s * 0.025, eyeY + 0.026, T / 2 + 0.006);
    body.add(b);
  }
  // small set mouth
  const mouth = tube([[-0.012, cy - 0.03, T / 2 + 0.001], [0, cy - 0.027, T / 2 + 0.0025], [0.012, cy - 0.031, T / 2 + 0.001]], 0.0022, mat({ color: "#2a0a0c", roughness: 0.5 }), 12, 6);
  body.add(mouth);
  const model = buildBiped({
    body, legLen, hipX: 0.018, legR: 0.0042,
    shoe: { s: 0.06, upper: "#d0262e", sole: "#f3efe6", lace: "#ffffff", canvas: true },
    shoulders: [[W * 0.42, cy + 0.02, 0], [-W * 0.42, cy + 0.02, 0]],
    armLen: 0.064, armR: 0.004, glove: 0.022, eyes,
  });
  return { model, meta: { legLen, stepAngle: 0.68, seed: 7, lid: 0.55, strideScale: 1.2 } };
}

// ============================================================== A.A.
export const AA = { id: "aa", name: "A.A.", height: 0.28, kind: "tiny", shadow: [0.07, 0.06, 0.6] };

function boltShape(s) {
  const pts = [[0.1, 0.5], [-0.32, -0.04], [-0.02, -0.04], [-0.14, -0.5], [0.32, 0.08], [0.02, 0.08], [0.16, 0.5]];
  const sh = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? sh.lineTo(x * s, y * s) : sh.moveTo(x * s, y * s)));
  sh.closePath();
  return sh;
}

export function buildAA() {
  const R = 0.042, BH = 0.152;
  const legLen = 0.074;
  const body = group("Body");
  const yel = paintedWear("#f0bd27", 41, "#fff4c8", true);
  const blu = paintedWear("#2153c4", 42, "#c9d8ff", true);
  const yMat = mat({ color: "#ffffff", map: yel.map, roughnessMap: yel.roughnessMap, roughness: 1, metalness: 0.15 });
  const bMat = mat({ color: "#ffffff", map: blu.map, roughnessMap: blu.roughnessMap, roughness: 1, metalness: 0.15 });
  const metal = M.metal("#c8c6c0", 0.32);
  const base = 0.008;
  // bottom metal cap
  const capB = lathe([[0.0001, 0], [R * 0.82, 0], [R * 0.95, 0.002], [R, 0.006], [R, base]], metal, 40);
  body.add(capB);
  // blue stripe band + yellow body
  const blue = mesh(new THREE.CylinderGeometry(R, R, BH * 0.36, 48, 1, true), bMat);
  blue.position.y = base + BH * 0.18;
  const yellow = mesh(new THREE.CylinderGeometry(R, R, BH * 0.64, 48, 1, true), yMat);
  yellow.position.y = base + BH * 0.36 + BH * 0.32;
  body.add(blue, yellow);
  // seam rings
  for (const y of [base, base + BH * 0.36, base + BH]) {
    const ring = mesh(new THREE.TorusGeometry(R, 0.0012, 6, 48), metal);
    ring.rotation.x = Math.PI / 2; ring.position.y = y;
    body.add(ring);
  }
  // top cap (shoulder + positive nub, mostly under the beanie)
  const top = lathe([[R, base + BH], [R * 0.96, base + BH + 0.004], [R * 0.5, base + BH + 0.006], [R * 0.3, base + BH + 0.006], [R * 0.3, base + BH + 0.014], [0.0001, base + BH + 0.015]], metal, 40);
  body.add(top);
  // lightning icon on the stripe
  const bolt = extrude(boltShape(0.05), 0.002, mat({ color: "#f6cf3a", roughness: 0.5, metalness: 0.1 }), 0.0006);
  bolt.position.set(0, base + BH * 0.18, R - 0.0004);
  body.add(bolt);
  // black knit beanie with cuff
  const k = knit("#1b1b20", 9);
  const knitMat = mat({ color: "#ffffff", map: k.map, bumpMap: k.bumpMap, bumpScale: 1.4, roughness: 0.95, sheen: 0.4, sheenColor: "#9090a0" });
  k.map.repeat.set(3, 1.5); k.bumpMap.repeat.set(3, 1.5);
  const beanie = group("Beanie");
  const dome = mesh(new THREE.SphereGeometry(R * 1.12, 40, 20, 0, TAU, 0, Math.PI / 2), knitMat);
  dome.scale.y = 1.05;
  const cuff = mesh(new THREE.CylinderGeometry(R * 1.16, R * 1.15, 0.018, 40, 1, true), knitMat);
  cuff.position.y = 0.006;
  const cuffTop = mesh(new THREE.TorusGeometry(R * 1.15, 0.004, 8, 40), knitMat);
  cuffTop.rotation.x = Math.PI / 2; cuffTop.position.y = 0.015;
  beanie.add(dome, cuff, cuffTop);
  beanie.position.y = base + BH - 0.012;
  body.add(beanie);
  // sleepy half-lidded eyes
  const lidMat = mat({ color: "#e8b523", roughness: 0.5, metalness: 0.1 });
  const eyeY = base + BH * 0.66;
  const eyes = [
    { pos: [0.017, eyeY, R - 0.002], rx: 0.016, ry: 0.019, rz: 0.01, lidMat, pupilR: 0.42, lowerLid: true, rotY: 0.38 },
    { pos: [-0.017, eyeY, R - 0.002], rx: 0.016, ry: 0.019, rz: 0.01, lidMat, pupilR: 0.42, lowerLid: true, rotY: -0.38 },
  ];
  // charge indicator (status light) on the side
  const led = mesh(new THREE.SphereGeometry(0.0035, 12, 8), mat({ color: "#111", emissive: "#ff2a1a", emissiveIntensity: 0 }));
  led.name = "ChargeLight";
  led.position.set(R * 0.72, base + BH * 0.85, R * 0.69);
  body.add(led);
  const mouth = tube([[-0.008, eyeY - 0.03, R + 0.0005], [0, eyeY - 0.032, R + 0.0012], [0.008, eyeY - 0.03, R + 0.0005]], 0.0016, mat({ color: "#3a2a0a" }), 10, 6);
  body.add(mouth);
  const model = buildBiped({
    body, legLen, hipX: 0.02, legR: 0.0045,
    shoe: { s: 0.062, upper: "#8b8f96", sole: "#d8d0c0", lace: "#cfc8b8", worn: 1, canvas: true },
    shoulders: [[R - 0.002, base + BH * 0.55, 0], [-(R - 0.002), base + BH * 0.55, 0]],
    armLen: 0.07, armR: 0.0042, glove: 0.022, eyes,
  });
  const extra = (r, s, t, k) => {
    const bob = Math.sin(2 * k.p - 0.9) * k.mv * (1 + k.run);
    beanie.position.y = base + BH - 0.012 + bob * 0.0025 + k.breathe * 0.0006;
    beanie.rotation.z = Math.sin(k.p - 0.8) * 0.06 * k.mv;
    beanie.rotation.x = -0.05 + bob * 0.04;
    const charge = s.custom.charge ?? 0.15;
    led.material.emissive.setRGB(charge < 0.5 ? 1 : 0.2, charge < 0.5 ? 0.15 : 1, 0.08);
    led.material.emissiveIntensity = (s.custom.ledOn ?? 1) * (0.6 + 0.4 * Math.sin(t * 4));
  };
  return { model, meta: { legLen, stepAngle: 0.45, seed: 11, lid: 0.12, heavy: 0.2 }, extra };
}

// ============================================================== LOCKE
export const LOCKE = { id: "locke", name: "Locke", height: 0.30, kind: "tiny", shadow: [0.07, 0.06, 0.6] };

export function buildLocke() {
  const legLen = 0.072;
  const body = group("Body");
  const br = agedBrass(17);
  br.map.repeat.set(3, 3); br.roughnessMap.repeat.set(3, 3);
  const brass = mat({ color: "#ffffff", map: br.map, roughnessMap: br.roughnessMap, roughness: 1, metalness: 1, envMapIntensity: 1.2 });
  const shaftLen = 0.118, shaftR = 0.011;
  // shaft
  const shaft = lathe([[0.0001, 0], [shaftR * 0.9, 0], [shaftR, 0.004], [shaftR, shaftLen - 0.01], [shaftR * 1.5, shaftLen - 0.006], [shaftR * 1.5, shaftLen], [shaftR, shaftLen + 0.004]], brass, 28);
  body.add(shaft);
  // the bit (teeth) — keeps the key silhouette readable
  const bit = new THREE.Shape();
  const bw = 0.042, bh = 0.05;
  bit.moveTo(0, 0); bit.lineTo(bw, 0); bit.lineTo(bw, 0.012); bit.lineTo(bw * 0.7, 0.012); bit.lineTo(bw * 0.7, 0.02);
  bit.lineTo(bw, 0.02); bit.lineTo(bw, 0.034); bit.lineTo(bw * 0.55, 0.034); bit.lineTo(bw * 0.55, 0.042); bit.lineTo(bw * 0.85, 0.042);
  bit.lineTo(bw * 0.85, bh); bit.lineTo(0, bh); bit.closePath();
  const bitM = extrude(bit, 0.009, brass, 0.0015);
  bitM.position.set(shaftR * 0.6, 0.006, 0);
  body.add(bitM);
  // bow (head): ornate oval ring with a face plate
  const bowY = shaftLen + 0.052;
  const bowG = group("Bow");
  bowG.position.y = bowY;
  // domed face plate inside a heavy ring, plus three ornamental loops (trefoil bow)
  const plate = mesh(new THREE.SphereGeometry(1, 40, 20, 0, TAU, 0, Math.PI / 2), brass);
  plate.rotation.x = Math.PI / 2;
  plate.scale.set(0.041, 0.012, 0.045);
  const back = mesh(new THREE.CylinderGeometry(1, 1, 1, 40), brass);
  back.rotation.x = Math.PI / 2;
  back.scale.set(0.041, 0.012, 0.045);
  back.position.z = -0.005;
  const rim = mesh(new THREE.TorusGeometry(1, 0.15, 14, 56), brass);
  rim.scale.set(0.046, 0.05, 0.06);
  const lobes = group("Lobes");
  for (const [a, rr] of [[0, 0.016], [Math.PI, 0.016], [Math.PI / 2, 0.013]]) {
    const lobe = mesh(new THREE.TorusGeometry(rr, 0.0048, 10, 24), brass);
    lobe.position.set(Math.cos(a) * (0.05 + rr * 0.75), Math.sin(a) * (0.055 + rr * 0.75), -0.002);
    lobes.add(lobe);
  }
  const collar = lathe([[shaftR * 1.3, -0.006], [shaftR * 2.2, 0], [shaftR * 2.2, 0.006], [shaftR * 1.3, 0.01]], brass, 28);
  collar.position.y = -0.058;
  bowG.add(plate, back, rim, lobes, collar);
  body.add(bowG);
  // face on the bow
  const lidMat = mat({ color: "#a8834a", roughness: 0.5, metalness: 0.8 });
  const eyes = [
    { pos: [0.017, bowY + 0.006, 0.011], rx: 0.014, ry: 0.017, rz: 0.008, lidMat, pupilR: 0.44, rotY: 0.12 },
    { pos: [-0.017, bowY + 0.006, 0.011], rx: 0.014, ry: 0.017, rz: 0.008, lidMat, pupilR: 0.44, rotY: -0.12 },
  ];
  const mouth = tube([[-0.009, bowY - 0.018, 0.0085], [0, bowY - 0.022, 0.0095], [0.009, bowY - 0.018, 0.0085]], 0.0016, mat({ color: "#3d2a10" }), 10, 6);
  body.add(mouth);
  // cap on the bow
  const capMat = M.cloth("#6b4a2b", 0.85);
  const cap = group("Cap");
  const crown = mesh(new THREE.SphereGeometry(0.036, 32, 16, 0, TAU, 0, Math.PI / 2), capMat);
  crown.scale.set(1, 0.7, 1.05);
  const brim = mesh(new THREE.CylinderGeometry(0.036, 0.038, 0.003, 32, 1, false, -0.9, 1.8), capMat);
  brim.position.set(0, 0.001, 0.022);
  brim.scale.z = 1.25;
  const btn = ellipsoid(0.005, 0.003, 0.005, capMat);
  btn.position.y = 0.025;
  cap.add(crown, brim, btn);
  cap.position.set(0.004, bowY + 0.05, -0.002);
  cap.rotation.set(-0.12, 0.25, -0.12);
  body.add(cap);
  // explorer jacket: short vest around the upper shaft only (key stays readable)
  const jacketMat = M.cloth("#4f5a37", 0.9);
  const vest = lathe([[shaftR + 0.006, 0], [shaftR + 0.011, 0.012], [shaftR + 0.012, 0.03], [shaftR + 0.008, 0.044], [shaftR + 0.004, 0.05]], jacketMat, 24);
  vest.position.y = shaftLen - 0.05;
  vest.scale.z = 1.15;
  const lapels = group("Lapels");
  for (const s of [1, -1]) {
    const lap = roundedBox(0.008, 0.022, 0.003, 0.0015, jacketMat, 2);
    lap.position.set(s * 0.008, shaftLen - 0.008, shaftR + 0.012);
    lap.rotation.set(-0.3, 0, s * 0.35);
    lapels.add(lap);
  }
  const pocket = roundedBox(0.012, 0.01, 0.003, 0.0015, M.cloth("#434d2e"), 2);
  pocket.position.set(0.01, shaftLen - 0.032, shaftR + 0.0125);
  body.add(vest, lapels, pocket);
  // backpack (follows with a delay)
  const packMat = M.cloth("#8a5a2e", 0.85);
  const pack = group("Backpack");
  const bag = roundedBox(0.036, 0.04, 0.02, 0.008, packMat, 3);
  const flap = roundedBox(0.037, 0.016, 0.022, 0.006, M.cloth("#6e4523"), 3);
  flap.position.set(0, 0.014, 0.001);
  const buckle = roundedBox(0.008, 0.006, 0.003, 0.001, M.metal("#9a8a6a", 0.4), 1);
  buckle.position.set(0, 0.006, 0.0125);
  pack.add(bag, flap, buckle);
  for (const s of [1, -1]) {
    const strap = tube([[s * 0.01, 0.018, 0.008], [s * 0.014, 0.024, 0.022], [s * 0.012, 0.0, 0.03], [s * 0.009, -0.02, 0.024]], 0.0018, packMat, 12, 6);
    pack.add(strap);
  }
  pack.position.set(0, shaftLen - 0.025, -0.03);
  body.add(pack);
  const model = buildBiped({
    body, legLen, hipX: 0.014, legR: 0.0042,
    shoe: { s: 0.058, upper: "#5c4632", sole: "#e6dccb", lace: "#d7c9b0", canvas: false },
    shoulders: [[shaftR + 0.012, shaftLen - 0.012, 0], [-(shaftR + 0.012), shaftLen - 0.012, 0]],
    armLen: 0.07, armR: 0.004, glove: 0.021, eyes,
  });
  const extra = (r, s, t, k) => {
    const lag = Math.sin(2 * k.p - 1.3) * k.mv * (1 + k.run);
    pack.rotation.x = -0.08 + lag * 0.12 - k.run * 0.15;
    pack.position.y = shaftLen - 0.025 + lag * 0.003;
    pack.rotation.z = Math.sin(k.p - 1.1) * 0.08 * k.mv;
    if (s.custom.hasPack === false) pack.visible = false; else pack.visible = true;
  };
  return { model, meta: { legLen, stepAngle: 0.52, seed: 19, lid: 0.9 }, extra };
}

// ============================================================== REX
export const REX = { id: "rex", name: "Rex", height: 0.35, kind: "tiny", shadow: [0.09, 0.08, 0.65] };

export function buildRex() {
  const legLen = 0.05;
  const body = group("Body");
  const grain = woodGrain("#3a2114", 23, 0.9);
  grain.repeat.set(1, 3);
  const wood = mat({ physical: true, color: "#ffffff", map: grain, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 });
  // Staunton king profile
  const prof = [
    [0.0001, 0], [0.058, 0], [0.062, 0.004], [0.062, 0.012], [0.056, 0.016], [0.05, 0.02], [0.054, 0.026], [0.05, 0.03],
    [0.038, 0.036], [0.03, 0.05], [0.026, 0.08], [0.024, 0.11], [0.025, 0.13], [0.034, 0.142], [0.04, 0.148], [0.034, 0.154],
    [0.03, 0.158], [0.034, 0.17], [0.042, 0.2], [0.046, 0.215], [0.044, 0.222], [0.032, 0.226], [0.0001, 0.228],
  ];
  const piece = lathe(prof, wood, 64);
  body.add(piece);
  // big gold crown
  const gold = mat({ color: "#e0b04a", roughness: 0.22, metalness: 1 });
  const crown = group("Crown");
  const band = mesh(new THREE.CylinderGeometry(0.044, 0.04, 0.02, 48, 1, true), gold);
  band.material.side = THREE.DoubleSide;
  crown.add(band);
  const rimT = mesh(new THREE.TorusGeometry(0.044, 0.003, 8, 48), gold);
  rimT.rotation.x = Math.PI / 2; rimT.position.y = 0.01;
  const rimB = mesh(new THREE.TorusGeometry(0.04, 0.003, 8, 48), gold);
  rimB.rotation.x = Math.PI / 2; rimB.position.y = -0.01;
  crown.add(rimT, rimB);
  const gemCols = ["#c0182b", "#1f5fd1", "#1b9a5a"];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const spike = mesh(new THREE.ConeGeometry(0.009, 0.034, 12), gold);
    spike.position.set(Math.sin(a) * 0.043, 0.026, Math.cos(a) * 0.043);
    spike.rotation.set(Math.cos(a) * 0.18, 0, -Math.sin(a) * 0.18);
    const ball = mesh(new THREE.SphereGeometry(0.0055, 12, 8), gold);
    ball.position.set(Math.sin(a) * 0.046, 0.045, Math.cos(a) * 0.046);
    const gem = mesh(new THREE.SphereGeometry(0.0055, 12, 8), mat({ color: gemCols[i % 3], roughness: 0.05, metalness: 0, clearcoat: 1, transmission: 0.3, ior: 1.6 }));
    gem.position.set(Math.sin(a) * 0.0445, 0, Math.cos(a) * 0.0445);
    gem.scale.set(1, 1.2, 0.6);
    gem.lookAt(gem.position.clone().multiplyScalar(2));
    crown.add(spike, ball, gem);
  }
  const velvet = mesh(new THREE.SphereGeometry(0.04, 24, 12, 0, TAU, 0, Math.PI / 2), M.cloth("#7e1220", 0.9));
  velvet.position.y = 0.004;
  crown.add(velvet);
  const orb = mesh(new THREE.SphereGeometry(0.008, 16, 10), gold);
  orb.position.y = 0.048;
  crown.add(orb);
  crown.position.y = 0.232;
  crown.rotation.z = 0.08;
  body.add(crown);
  // eyes on the upper body
  const lidMat = mat({ physical: true, color: "#3a2114", roughness: 0.3, clearcoat: 1 });
  const eyeY = 0.188;
  const eyes = [
    { pos: [0.017, eyeY, 0.036], rx: 0.014, ry: 0.016, rz: 0.009, lidMat, pupilR: 0.42, rotY: 0.35 },
    { pos: [-0.017, eyeY, 0.036], rx: 0.014, ry: 0.016, rz: 0.009, lidMat, pupilR: 0.42, rotY: -0.35 },
  ];
  // red velvet cape with cream fur trim
  const capeMat = mat({ physical: true, color: "#8c1622", roughness: 0.75, sheen: 1, sheenColor: "#ff5a6a", sheenRoughness: 0.45, side: THREE.DoubleSide });
  const cape = group("Cape");
  const cg = new THREE.CylinderGeometry(0.045, 0.072, 0.17, 40, 8, true, Math.PI * 0.62, Math.PI * 0.76 * 1.0);
  // flare and fold the cape hem a little
  const cp = cg.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i);
    const a = Math.atan2(x, z);
    const fold = 1 + 0.06 * Math.sin(a * 9) * (0.5 - y / 0.17);
    cp.setXYZ(i, x * fold, y, z * fold);
  }
  cg.computeVertexNormals();
  const capeM = mesh(cg, capeMat);
  capeM.position.y = -0.085;
  cape.add(capeM);
  cape.position.set(0, 0.176, 0);
  body.add(cape);
  const furPal = ["#efe6d2", "#e4d8bf", "#f7f1e2"];
  const collarFur = mesh(furEllipsoid({ radii: [0.05, 0.012, 0.05], count: 160, len: [0.006, 0.011], r: [0.003, 0.005], palette: furPal, flowK: 0.2, seed: 5, filter: (n) => n.z < 0.55 }), furMaterial(0.95));
  collarFur.position.y = 0.177;
  const collarBase = mesh(new THREE.TorusGeometry(0.046, 0.009, 10, 40, Math.PI * 1.55), mat({ color: "#efe6d2", roughness: 1 }));
  collarBase.rotation.set(Math.PI / 2, 0, Math.PI * 0.725);
  collarBase.position.y = 0.177;
  body.add(collarFur, collarBase);
  // ermine spots on the collar
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.75 + (i / 6) * Math.PI * 0.5 + 0.3;
    const sp = ellipsoid(0.003, 0.004, 0.002, mat({ color: "#111" }));
    sp.position.set(Math.sin(a) * 0.055, 0.18, Math.cos(a) * 0.055);
    body.add(sp);
  }
  // scepter (held in the right hand; parented later)
  const scepter = group("Scepter");
  const rod = mesh(new THREE.CylinderGeometry(0.0025, 0.003, 0.12, 12), gold);
  rod.position.y = 0.0;
  const sOrb = mesh(new THREE.SphereGeometry(0.008, 16, 10), gold);
  sOrb.position.y = 0.064;
  const sGem = mesh(new THREE.SphereGeometry(0.005, 12, 8), mat({ color: "#c0182b", roughness: 0.05, clearcoat: 1 }));
  sGem.position.y = 0.075;
  scepter.add(rod, sOrb, sGem);
  const model = buildBiped({
    body, legLen, hipX: 0.022, legR: 0.0055,
    shoe: { s: 0.05, upper: "#151515", sole: "#2a2a2a", lace: "#1c1c1c", canvas: false },
    shoulders: [[0.036, 0.162, 0.004], [-0.036, 0.162, 0.004]],
    armLen: 0.068, armR: 0.0046, glove: 0.022, eyes,
  });
  const hand = model.getObjectByName("RightHand");
  scepter.position.set(0, -0.03, 0.004);
  scepter.rotation.set(0.15, 0, 0);
  hand.add(scepter);
  const extra = (r, s, t, k) => {
    const sway = Math.sin(k.p - 1.4) * k.mv;
    cape.rotation.x = 0.06 + k.mv * 0.22 + k.run * 0.25 + Math.abs(sway) * 0.05 + Math.sin(t * 1.1) * 0.012;
    cape.rotation.z = sway * 0.08;
    capeM.scale.y = 1 + k.fr * -0.04;
    crown.rotation.z = 0.08 + Math.sin(k.p - 0.6) * 0.04 * k.mv + (s.custom.crownTilt ?? 0);
    r.handR?.setCurl?.(0.85);
  };
  return { model, meta: { legLen, stepAngle: 0.42, seed: 23, lid: 0.7, heavy: 1, strideScale: 1.05 }, extra };
}
