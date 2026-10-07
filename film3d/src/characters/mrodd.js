// Mr. ODD — heavy-set adult, ~1.80 m. Red plaid robe, rope belt, slippers, mug, big moustache.
// Intimidating through scale and stillness, never monstrous.
import * as THREE from "three";
import { group, mesh, ellipsoid, capsule, roundedBox, lathe, tube, makeEye, makeHand, furEllipsoid, furMaterial, taperedCapsule } from "../core/geo.js";
import { M, mat } from "../core/mats.js";
import { plaid, mugDecal, fabric } from "../core/textures.js";
import { humanSkeleton } from "./human.js";
import { TAU } from "../core/util.js";

export const MRODD = { id: "mrodd", name: "Mr. ODD", height: 1.8, kind: "human", shadow: [0.45, 0.38, 0.6] };

const P = {
  hipH: 0.86, hipX: 0.11, thigh: 0.42, shin: 0.4, spine: 0.24, chest: 0.3, neck: 0.06,
  shoulderX: 0.245, shoulderY: 0.245, upperArm: 0.3, foreArm: 0.28, armRest: 0.2, elbowRest: 0.2,
};

export function makeMug() {
  const g = group("Mug");
  const ceramic = mat({ color: "#f2eee6", map: mugDecal(), roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  const body = lathe([[0.0001, 0], [0.036, 0], [0.04, 0.004], [0.041, 0.1], [0.043, 0.104], [0.039, 0.106], [0.036, 0.012], [0.0001, 0.012]], ceramic, 48);
  const handle = mesh(new THREE.TorusGeometry(0.028, 0.0085, 10, 24, Math.PI * 1.15), mat({ color: "#f3efe6", roughness: 0.22, clearcoat: 0.8 }));
  handle.position.set(-0.042, 0.054, 0);
  handle.rotation.z = Math.PI / 2 + 0.25;
  const coffee = mesh(new THREE.CircleGeometry(0.036, 32), mat({ color: "#2a160b", roughness: 0.08, clearcoat: 1 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.088;
  g.add(body, handle, coffee);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function buildMrOdd() {
  const J = humanSkeleton(P);
  const skin = M.skin("#e3b393");
  const pl = plaid("#7b1820", "#25080b", "#c49a6a", 2, 1);
  pl.repeat.set(3, 3);
  const robe = mat({ color: "#ffffff", map: pl, roughness: 0.88, sheen: 0.6, sheenColor: "#ff8a7a", sheenRoughness: 0.7 });
  const plS = plaid("#7b1820", "#25080b", "#c49a6a", 2, 1).clone();
  plS.repeat.set(1.5, 2); plS.needsUpdate = true;
  const robeSleeve = mat({ color: "#ffffff", map: plS, roughness: 0.88, sheen: 0.6, sheenColor: "#ff8a7a", sheenRoughness: 0.7 });
  const trim = M.cloth("#5a1016", 0.8);
  const shirt = M.cloth("#a9a194", 0.9);

  // robe skirt from waist to knee (on hips)
  const skirt = lathe([[0.27, 0.2], [0.28, 0.12], [0.27, 0.0], [0.27, -0.2], [0.285, -0.38], [0.29, -0.44], [0.285, -0.455]], robe, 56);
  skirt.material.side = THREE.DoubleSide;
  skirt.scale.z = 0.86;
  J.body.add(skirt);
  const seam = tube([[0.07, 0.2, 0.235], [0.09, 0.0, 0.24], [0.1, -0.2, 0.243], [0.11, -0.44, 0.25]], 0.014, trim, 24, 8);
  J.body.add(seam);
  // big belly + chest in plaid, open V showing the shirt
  const belly = ellipsoid(0.27, 0.27, 0.25, robe, 40);
  belly.position.set(0, 0.1, 0.03);
  J.spine.add(belly);
  const chest = ellipsoid(0.26, 0.24, 0.2, robe, 40);
  chest.position.set(0, 0.13, 0.0);
  const shoulders = ellipsoid(0.29, 0.1, 0.17, robe, 32);
  shoulders.position.y = 0.25;
  J.chest.add(chest, shoulders);
  // open V neckline: shirt front under plaid shawl lapels
  const shirtFront = ellipsoid(0.075, 0.12, 0.04, shirt, 24);
  shirtFront.position.set(0, 0.2, 0.169);
  J.chest.add(shirtFront);
  for (const s of [1, -1]) {
    const lapel = tube([[s * 0.100, 0.330, 0.095], [s * 0.085, 0.250, 0.175], [s * 0.055, 0.170, 0.205], [s * 0.022, 0.090, 0.208], [s * -0.015, 0.000, 0.180]], 0.024, robeSleeve, 32, 10);
    lapel.scale.set(1, 1, 1);
    J.chest.add(lapel);
    const collar = new THREE.Shape();
    collar.moveTo(0, 0); collar.lineTo(s * 0.05, 0.012); collar.lineTo(s * 0.018, -0.05); collar.closePath();
    const cm = mesh(new THREE.ShapeGeometry(collar), shirt, { cast: false });
    cm.position.set(s * 0.01, 0.29, 0.159);
    cm.rotation.x = -0.5;
    cm.material.side = THREE.DoubleSide;
    J.chest.add(cm);
  }
  // twisted rope belt with knot + tassels (on spine, at the waist)
  const rope = mat({ color: "#b38a55", roughness: 0.85, sheen: 0.4, sheenColor: "#ffe2b0" });
  const ropeG = group("RopeBelt");
  for (let k = 0; k < 2; k++) {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * TAU;
      const tw = a * 9 + k * Math.PI;
      pts.push(new THREE.Vector3(Math.sin(a) * (0.28 + Math.cos(tw) * 0.006), Math.sin(tw) * 0.006, Math.cos(a) * (0.255 + Math.cos(tw) * 0.006)));
    }
    ropeG.add(tube(pts, 0.009, rope, 160, 6, true));
  }
  const knot = ellipsoid(0.03, 0.028, 0.022, rope, 16);
  knot.position.set(0.1, -0.005, 0.255);
  ropeG.add(knot);
  const ends = [];
  for (const [dx, len] of [[0.085, 0.22], [0.115, 0.18]]) {
    const end = group("RopeEnd");
    end.position.set(dx, -0.01, 0.262);
    end.add(tube([[0, 0, 0], [0.004, -len * 0.5, 0.01], [0.0, -len, 0.006]], 0.008, rope, 16, 6));
    const tassel = mesh(furEllipsoid({ center: new THREE.Vector3(0, -len - 0.018, 0.006), radii: [0.012, 0.02, 0.012], count: 26, len: [0.03, 0.045], r: [0.004, 0.006], palette: ["#c79c62", "#b38a55"], flow: new THREE.Vector3(0, -1, 0), flowK: 0.95, seed: 3 }), furMaterial(0.9));
    end.add(tassel);
    ropeG.add(end);
    ends.push(end);
  }
  ropeG.position.y = 0.0;
  J.spine.add(ropeG);

  // neck + head
  const neckM = capsule(0.075, 0.13, skin, 20);
  neckM.position.y = 0.035;
  J.neck.add(neckM);
  const H = J.head;
  const skull = ellipsoid(0.125, 0.14, 0.13, skin, 40);
  skull.position.y = 0.135;
  const chin = ellipsoid(0.1, 0.06, 0.09, skin, 28);
  chin.position.set(0, 0.035, 0.045);
  const dbl = ellipsoid(0.095, 0.045, 0.08, skin, 24);
  dbl.position.set(0, 0.0, 0.03);
  H.add(skull, chin, dbl);
  for (const s of [1, -1]) {
    const jowl = ellipsoid(0.058, 0.062, 0.05, skin, 24);
    jowl.position.set(s * 0.078, 0.07, 0.07);
    const ear = ellipsoid(0.024, 0.042, 0.016, skin, 16);
    ear.position.set(s * 0.124, 0.13, -0.01);
    ear.rotation.y = s * 0.35;
    H.add(jowl, ear);
  }
  const nose = ellipsoid(0.031, 0.034, 0.032, M.skin("#dba085"), 24);
  nose.position.set(0, 0.105, 0.142);
  const bridge = ellipsoid(0.017, 0.035, 0.02, skin, 16);
  bridge.position.set(0, 0.135, 0.13);
  H.add(nose, bridge);
  const lid = M.skin("#d9a888");
  [["EyeL", 1], ["EyeR", -1]].forEach(([nm, s]) => {
    const e = makeEye({ rx: 0.02, ry: 0.019, rz: 0.015, iris: "#3c2616", irisR: 0.7, pupilR: 0.4, lidMat: lid, lowerLid: true });
    e.name = nm;
    e.position.set(s * 0.047, 0.142, 0.112);
    e.rotation.y = s * 0.22;
    H.add(e);
  });
  const hairM = furMaterial(0.8);
  const hairCol = (n, r) => new THREE.Color(["#2a221d", "#3a2f27", "#4b4038", "#6f6a64", "#8d8a85", "#2f2621"][(r() * 6) | 0]);
  const browCol = (n, r) => new THREE.Color(["#241d19", "#3a322c", "#5e5852"][(r() * 3) | 0]);
  for (const s of [1, -1]) {
    const brow = group(s > 0 ? "BrowL" : "BrowR");
    brow.add(mesh(furEllipsoid({ radii: [0.036, 0.011, 0.012], count: 55, len: [0.018, 0.03], r: [0.006, 0.009], palette: [], colorFn: browCol, flow: new THREE.Vector3(s * 1, 0.25, 0.4), flowK: 0.75, seed: 20 + s, rootDark: 0.85 }), hairM));
    brow.position.set(s * 0.05, 0.172, 0.12);
    brow.rotation.z = s * -0.22;
    H.add(brow);
  }
  // the moustache: two heavy lobes over a dark base
  const mustache = group("Moustache");
  const mBase = ellipsoid(0.07, 0.022, 0.03, mat({ color: "#231c18", roughness: 0.9 }), 20);
  mustache.add(mBase);
  for (const s of [1, -1]) {
    const lobe = mesh(furEllipsoid({ center: new THREE.Vector3(s * 0.04, -0.004, 0), radii: [0.048, 0.022, 0.026], count: 150, len: [0.02, 0.04], r: [0.006, 0.01], palette: [], colorFn: browCol, flow: new THREE.Vector3(s * 1, -0.6, 0.25), flowK: 0.82, seed: 30 + s, rootDark: 0.85 }), hairM);
    mustache.add(lobe);
  }
  mustache.position.set(0, 0.072, 0.135);
  H.add(mustache);
  const lip = capsule(0.008, 0.05, mat({ color: "#9a5a50", roughness: 0.6 }), 8);
  lip.rotation.z = Math.PI / 2;
  lip.position.set(0, 0.045, 0.128);
  H.add(lip);
  // curly dark hair, grey at the temples, thinner on top
  const curls = mesh(furEllipsoid({ center: new THREE.Vector3(0, 0.14, -0.01), radii: [0.13, 0.145, 0.135], count: 300, len: [0.03, 0.04], r: [0.017, 0.024], blob: true, palette: [], colorFn: (n, r) => (Math.abs(n.x) > 0.75 && n.y < 0.4 ? new THREE.Color(["#7a7671", "#8d8a85", "#5f5a55"][(r() * 3) | 0]) : hairCol(n, r)), flow: new THREE.Vector3(0, 0.2, -1), flowK: 0.25, jitter: 1.2, flat: 1, seed: 12, rootDark: 0.8, filter: (n) => !(n.z > 0.25 && n.y < 0.55) && n.y > -0.4 }), hairM);
  H.add(curls);

  // arms: wide plaid sleeves with cuffs, big hands
  for (const [arm, fore, mount, s] of [[J.armL, J.foreL, J.handL, 1], [J.armR, J.foreR, J.handR, -1]]) {
    const up = mesh(taperedCapsule(0.088, 0.078, 0.36), robeSleeve);
    up.position.y = -0.14;
    arm.add(up);
    const fo = mesh(taperedCapsule(0.08, 0.085, 0.3), robeSleeve);
    fo.position.y = -0.13;
    const cuff = mesh(new THREE.CylinderGeometry(0.088, 0.09, 0.06, 24, 1, true), trim);
    cuff.position.y = -0.255;
    cuff.material.side = THREE.DoubleSide;
    const wrist = capsule(0.045, 0.1, skin, 14);
    wrist.position.y = -0.27;
    fore.add(fo, cuff, wrist);
    const hand = makeHand(0.13, skin, s);
    hand.name = s > 0 ? "LeftHand" : "RightHand";
    hand.rotation.y = s * Math.PI / 2;
    mount.add(hand);
  }
  // mug in the right hand
  const mug = makeMug();
  mug.position.set(-0.035, -0.075, 0.02);
  mug.rotation.set(0, 0.0, -Math.PI / 2);
  J.handR.add(mug);
  // pyjama shins + felt slippers
  const pj = mat({ color: "#ffffff", map: fabric("#262a3f", 5, 6), roughness: 0.9, sheen: 0.4, sheenColor: "#6a7090" });
  for (const [leg, shin, foot, s] of [[J.legL, J.shinL, J.footL, 1], [J.legR, J.shinR, J.footR, -1]]) {
    const th = mesh(taperedCapsule(0.115, 0.09, 0.44), pj);
    th.position.y = -0.2;
    leg.add(th);
    const sh = mesh(taperedCapsule(0.085, 0.07, 0.42), pj);
    sh.position.y = -0.18;
    shin.add(sh);
    const felt = M.cloth("#6a4631", 0.95);
    const slipper = group("Slipper");
    const upper = ellipsoid(0.058, 0.045, 0.13, felt, 24);
    upper.position.set(0, -0.025, 0.06);
    const sole = roundedBox(0.11, 0.022, 0.27, 0.01, mat({ color: "#2e231c", roughness: 0.9 }), 3);
    sole.position.set(0, -0.058, 0.055);
    const fluff = mesh(furEllipsoid({ center: new THREE.Vector3(0, 0.0, -0.0), radii: [0.065, 0.02, 0.065], count: 60, len: [0.012, 0.02], r: [0.006, 0.009], palette: ["#e9dfcc", "#d8ccb4"], flow: new THREE.Vector3(0, 1, 0), flowK: 0.5, seed: 40 + s }), furMaterial(0.95));
    fluff.position.y = -0.0;
    slipper.add(upper, sole, fluff);
    slipper.rotation.y = s * 0.1;
    foot.add(slipper);
  }
  J.model.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } });
  const extra = (r, s, t, k) => {
    // robe + belt secondary motion
    skirt.rotation.z = Math.sin(k.p - 1.2) * 0.035 * k.mv;
    skirt.rotation.x = Math.sin(2 * k.p - 1.5) * 0.02 * k.mv + (s.custom.crouch ?? 0) * -0.15;
    ends.forEach((e, i) => { e.rotation.x = Math.sin(2 * k.p - 1.7 - i * 0.4) * 0.18 * k.mv + Math.sin(t * 1.3 + i) * 0.02; e.rotation.z = Math.sin(k.p - 1.3) * 0.1 * k.mv; });
    mustache.rotation.z = (s.custom.twitch ?? 0) * Math.sin(t * 18) * 0.04;
    mustache.position.y = 0.072 + (s.custom.twitch ?? 0) * Math.abs(Math.sin(t * 9)) * 0.004;
    mug.visible = s.custom.mug !== false;
  };
  return { model: J.model, meta: { ...P, seed: 13, lid: 0.35, heavy: 1, stepAngle: 0.34 }, extra };
}
