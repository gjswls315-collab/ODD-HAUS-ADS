// Bully — human boy, ~1.50 m. Backward cap always readable. Red flying-V guitar.
import * as THREE from "three";
import { group, mesh, ellipsoid, capsule, roundedBox, extrude, tube, makeEye, makeHand, makeSneaker, furEllipsoid, furMaterial, taperedCapsule } from "../core/geo.js";
import { M, mat } from "../core/mats.js";
import { skullTee, scrawl } from "../core/textures.js";
import { humanSkeleton } from "./human.js";
import { attachRest } from "./glb.js";
import { TAU } from "../core/util.js";

export const BULLY = { id: "bully", name: "Bully", height: 1.5, kind: "human", shadow: [0.32, 0.26, 0.55] };

const P = {
  hipH: 0.7, hipX: 0.082, thigh: 0.33, shin: 0.31, spine: 0.18, chest: 0.26, neck: 0.035,
  shoulderX: 0.165, shoulderY: 0.215, upperArm: 0.25, foreArm: 0.23, armRest: 0.14,
};

export function makeFlyingV() {
  const g = group("Guitar");
  const red = mat({ physical: true, color: "#b51c22", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  const white = mat({ color: "#f1ece2", roughness: 0.35, clearcoat: 0.6 });
  const dark = mat({ color: "#1b120d", roughness: 0.55 });
  const chrome = M.metal("#d8d8d8", 0.18);
  // V body (neck joint at origin, wings toward -Y)
  const v = new THREE.Shape();
  v.moveTo(-0.055, 0.03);
  v.lineTo(0.055, 0.03);
  v.quadraticCurveTo(0.11, -0.02, 0.215, -0.39);
  v.quadraticCurveTo(0.2, -0.43, 0.165, -0.42);
  v.lineTo(0.03, -0.17);
  v.quadraticCurveTo(0, -0.14, -0.03, -0.17);
  v.lineTo(-0.165, -0.42);
  v.quadraticCurveTo(-0.2, -0.43, -0.215, -0.39);
  v.quadraticCurveTo(-0.11, -0.02, -0.055, 0.03);
  const body = extrude(v, 0.034, red, 0.007, undefined, 32);
  g.add(body);
  // pickguard
  const pg = new THREE.Shape();
  pg.moveTo(-0.045, 0.02); pg.lineTo(0.045, 0.02); pg.lineTo(0.09, -0.15); pg.lineTo(0.03, -0.15); pg.lineTo(0, -0.12); pg.lineTo(-0.03, -0.15); pg.lineTo(-0.09, -0.15); pg.closePath();
  const pgM = extrude(pg, 0.002, white, 0.001);
  pgM.position.z = 0.022;
  g.add(pgM);
  for (const y of [-0.03, -0.09]) {
    const pu = roundedBox(0.075, 0.03, 0.012, 0.004, mat({ color: "#121212", roughness: 0.4 }), 2);
    pu.position.set(0, y, 0.027);
    g.add(pu);
    for (let i = -2; i <= 3; i++) { const pole = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.004, 8), chrome); pole.rotation.x = Math.PI / 2; pole.position.set(i * 0.011 - 0.005, y, 0.034); g.add(pole); }
  }
  const bridge = roundedBox(0.07, 0.012, 0.01, 0.003, chrome, 2);
  bridge.position.set(0, -0.125, 0.026);
  g.add(bridge);
  for (let i = 0; i < 3; i++) {
    const knob = mesh(new THREE.CylinderGeometry(0.009, 0.01, 0.012, 16), mat({ color: "#d9b44a", metalness: 0.9, roughness: 0.3 }));
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.1 + i * 0.022, -0.2 - i * 0.045, 0.026);
    g.add(knob);
  }
  // neck, fretboard, frets, headstock, tuners
  const neckL = 0.44;
  const neck = roundedBox(0.048, neckL, 0.022, 0.009, mat({ color: "#8a5a2c", roughness: 0.45 }), 3);
  neck.position.set(0, neckL / 2 + 0.01, 0.002);
  const fb = roundedBox(0.046, neckL, 0.006, 0.002, dark, 2);
  fb.position.set(0, neckL / 2 + 0.01, 0.015);
  g.add(neck, fb);
  for (let i = 0; i < 16; i++) {
    const fr = roundedBox(0.046, 0.002, 0.003, 0.0008, chrome, 1);
    fr.position.set(0, 0.03 + neckL * (1 - Math.pow(0.94, i + 1)) * 1.6, 0.0185);
    if (fr.position.y < neckL) g.add(fr);
  }
  const hs = new THREE.Shape();
  hs.moveTo(-0.028, 0); hs.lineTo(0.028, 0); hs.lineTo(0.05, 0.13); hs.lineTo(0.0, 0.17); hs.lineTo(-0.05, 0.13); hs.closePath();
  const head = extrude(hs, 0.016, red, 0.003);
  head.position.set(0, neckL + 0.005, 0.0);
  g.add(head);
  for (let i = 0; i < 3; i++) {
    for (const s of [1, -1]) {
      const tp = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.024, 8), chrome);
      tp.rotation.z = Math.PI / 2;
      tp.position.set(s * 0.05, neckL + 0.04 + i * 0.035, 0.006);
      g.add(tp);
    }
  }
  // strings
  const strM = mat({ color: "#e8e2d4", roughness: 0.2, metalness: 1 });
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 0.0065;
    const st = mesh(new THREE.CylinderGeometry(0.0007, 0.0007, neckL + 0.14, 4), strM, { cast: false });
    st.position.set(x, neckL / 2 - 0.05, 0.023);
    g.add(st);
  }
  // "Bully" scrawl on the lower wing
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.065), new THREE.MeshStandardMaterial({ map: scrawl("Bully"), transparent: true, roughness: 0.5, depthWrite: false }));
  sc.position.set(-0.11, -0.28, 0.0245);
  sc.rotation.z = -1.08;
  g.add(sc);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function buildBully() {
  const J = humanSkeleton(P);
  const skin = M.skin("#f2c3a0");
  const tee = M.cloth("#18181b", 0.9);
  const khaki = M.cloth("#9b8a60", 0.9);
  const khakiD = M.cloth("#85754f", 0.9);

  // hips + cargo shorts
  const hips = ellipsoid(0.15, 0.11, 0.11, khaki, 28);
  hips.position.y = 0.02;
  const belt = mesh(new THREE.CylinderGeometry(0.15, 0.152, 0.03, 32, 1, true), mat({ color: "#3a2a1e", roughness: 0.6 }));
  belt.position.y = 0.075;
  const buckle = roundedBox(0.035, 0.026, 0.008, 0.004, M.metal("#b8b1a0", 0.3), 2);
  buckle.position.set(0, 0.075, 0.148);
  J.body.add(hips, belt, buckle);

  // torso tee (spine = belly, chest = ribcage/shoulders)
  const belly = ellipsoid(0.145, 0.15, 0.105, tee, 28);
  belly.position.y = 0.06;
  J.spine.add(belly);
  const ribs = ellipsoid(0.165, 0.18, 0.112, tee, 28);
  ribs.position.y = 0.08;
  const shoulders = ellipsoid(0.19, 0.075, 0.1, tee, 24);
  shoulders.position.y = 0.2;
  const neckband = mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 24), M.cloth("#232327"));
  neckband.rotation.x = Math.PI / 2;
  neckband.position.set(0, 0.245, 0.01);
  J.chest.add(ribs, shoulders, neckband);
  // skull print, wrapped on the chest front
  const printGeo = new THREE.CylinderGeometry(0.168, 0.168, 0.24, 32, 1, true, -0.62, 1.24);
  printGeo.scale(1, 1, 0.71);
  const print = mesh(printGeo, mat({ color: "#ffffff", map: skullTee(), roughness: 0.85, transparent: false }), { cast: false });
  print.position.set(0, 0.075, 0.004);
  J.chest.add(print);

  // neck + head
  const neckM = capsule(0.05, 0.11, skin, 16);
  neckM.position.y = 0.0;
  J.neck.add(neckM);
  const H = J.head;
  const skull = ellipsoid(0.115, 0.128, 0.118, skin, 40);
  skull.position.y = 0.125;
  const jaw = ellipsoid(0.1, 0.075, 0.1, skin, 32);
  jaw.position.set(0, 0.07, 0.014);
  H.add(skull, jaw);
  for (const s of [1, -1]) {
    const ear = ellipsoid(0.02, 0.034, 0.014, skin, 16);
    ear.position.set(s * 0.112, 0.11, -0.005);
    ear.rotation.y = s * 0.4;
    const cheek = ellipsoid(0.03, 0.02, 0.012, mat({ color: "#ec9a86", roughness: 0.6 }), 16);
    cheek.position.set(s * 0.064, 0.077, 0.096);
    cheek.rotation.y = s * 0.55;
    H.add(ear, cheek);
  }
  const nose = ellipsoid(0.019, 0.019, 0.019, skin, 16);
  nose.position.set(0, 0.098, 0.124);
  H.add(nose);
  const lid = M.skin("#efbd98");
  [["EyeL", 1], ["EyeR", -1]].forEach(([nm, s]) => {
    const e = makeEye({ rx: 0.026, ry: 0.031, rz: 0.019, iris: "#3b6cc0", irisR: 0.62, pupilR: 0.34, lidMat: lid, lowerLid: true });
    e.name = nm;
    e.position.set(s * 0.045, 0.128, 0.098);
    e.rotation.y = s * 0.28;
    H.add(e);
  });
  const browM = mat({ color: "#a2722f", roughness: 0.8 });
  const browL = capsule(0.0065, 0.042, browM, 8);
  browL.name = "BrowL";
  browL.rotation.z = Math.PI / 2 + 0.1;
  browL.position.set(0.046, 0.171, 0.112);
  const browR = capsule(0.0065, 0.042, browM, 8);
  browR.name = "BrowR";
  browR.rotation.z = Math.PI / 2 - 0.32;
  browR.position.set(-0.046, 0.164, 0.113);
  H.add(browL, browR);
  // crooked grin: dark crescent + teeth with a gap
  const mouth = group("Mouth");
  const cres = new THREE.Shape();
  cres.absarc(0, 0.02, 0.05, Math.PI + 0.35, TAU - 0.35, false);
  cres.absarc(0, 0.045, 0.06, TAU - 0.55, Math.PI + 0.55, true);
  const cavity = extrude(cres, 0.006, mat({ color: "#5a1616", roughness: 0.6 }), 0.002);
  mouth.add(cavity);
  for (const [x, w] of [[-0.018, 0.024], [0.011, 0.02]]) {
    const tooth = roundedBox(w, 0.011, 0.006, 0.002, mat({ color: "#f7f3ea", roughness: 0.3 }), 2);
    tooth.position.set(x, -0.012, 0.004);
    mouth.add(tooth);
  }
  mouth.position.set(0.01, 0.06, 0.112);
  mouth.rotation.set(-0.15, 0.05, -0.12);
  H.add(mouth);
  // messy blond hair (under and around the cap)
  const hairM = furMaterial(0.75);
  const blond = (n, r) => new THREE.Color(["#e2bf62", "#d3a845", "#efd488", "#b9893a", "#e8c870"][(r() * 5) | 0]);
  const hair = mesh(furEllipsoid({ center: new THREE.Vector3(0, 0.13, -0.005), radii: [0.12, 0.13, 0.124], count: 260, len: [0.05, 0.085], r: [0.016, 0.024], palette: [], colorFn: blond, flow: new THREE.Vector3(0, -1, -0.6), flowK: 0.72, flat: 0.6, seed: 3, rootDark: 0.82, tipLighten: 0.05, filter: (n) => !(n.z > 0.2 && n.y < 0.42) && n.y > -0.4 && n.y < 0.3 }), hairM);
  const fringe = mesh(furEllipsoid({ center: new THREE.Vector3(0, 0.175, 0.1), radii: [0.06, 0.016, 0.03], count: 26, len: [0.026, 0.042], r: [0.012, 0.018], palette: [], colorFn: blond, flow: new THREE.Vector3(0.4, -0.15, 1), flowK: 0.7, flat: 0.6, seed: 4, rootDark: 0.82 }), hairM);
  const sideL = mesh(furEllipsoid({ center: new THREE.Vector3(0.1, 0.13, 0.0), radii: [0.03, 0.05, 0.06], count: 30, len: [0.045, 0.075], r: [0.015, 0.021], palette: [], colorFn: blond, flow: new THREE.Vector3(1, -0.6, -0.3), flowK: 0.7, flat: 0.6, seed: 5, rootDark: 0.82 }), hairM);
  const sideR = mesh(furEllipsoid({ center: new THREE.Vector3(-0.1, 0.13, 0.0), radii: [0.03, 0.05, 0.06], count: 30, len: [0.045, 0.075], r: [0.015, 0.021], palette: [], colorFn: blond, flow: new THREE.Vector3(-1, -0.6, -0.3), flowK: 0.7, flat: 0.6, seed: 6, rootDark: 0.82 }), hairM);
  H.add(hair, fringe, sideL, sideR);
  // BACKWARD CAP — sits on top of the hair, brim to the back
  const cap = group("Cap");
  const capM = M.cloth("#383c46", 0.75);
  const crown = mesh(new THREE.SphereGeometry(0.136, 48, 24, 0, TAU, 0, Math.PI / 2), capM);
  crown.scale.set(1.04, 0.8, 1.08);
  cap.add(crown);
  const stitch = mat({ color: "#d9d4c8", roughness: 0.7 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const ph = (k / 10) * Math.PI / 2;
      pts.push(new THREE.Vector3(Math.sin(a) * Math.cos(ph) * 0.1425, Math.sin(ph) * 0.1098, Math.cos(a) * Math.cos(ph) * 0.1478));
    }
    cap.add(tube(pts, 0.0011, stitch, 16, 4));
  }
  const btn = ellipsoid(0.012, 0.007, 0.012, mat({ color: "#c0262d", roughness: 0.5 }), 12);
  btn.position.y = 0.108;
  cap.add(btn);
  const brimShape = new THREE.Shape();
  brimShape.moveTo(-0.125, 0);
  brimShape.quadraticCurveTo(-0.14, 0.13, 0, 0.14);
  brimShape.quadraticCurveTo(0.14, 0.13, 0.125, 0);
  brimShape.quadraticCurveTo(0, 0.03, -0.125, 0);
  const brim = extrude(brimShape, 0.008, capM, 0.003);
  brim.rotation.x = Math.PI / 2 + 0.18;
  brim.position.set(0, 0.006, -0.118);
  brim.rotation.z = Math.PI;
  const brimEdge = extrude(brimShape, 0.0082, mat({ color: "#a8242a", roughness: 0.7 }), 0.001);
  brimEdge.rotation.copy(brim.rotation);
  brimEdge.position.set(0, 0.0045, -0.118);
  brimEdge.scale.set(1.02, 1.02, 0.3);
  cap.add(brimEdge, brim);
  // snapback strap across the forehead with hair poking through
  const strap = mesh(new THREE.TorusGeometry(0.032, 0.007, 6, 16, Math.PI), M.cloth("#1d1f24"));
  strap.position.set(0, 0.0, 0.146);
  cap.add(strap);
  cap.position.set(0, 0.176, -0.008);
  cap.rotation.set(-0.12, 0, 0.03);
  H.add(cap);

  // arms: sleeves + skin + wristband + hands
  for (const [arm, fore, mount, s] of [[J.armL, J.foreL, J.handL, 1], [J.armR, J.foreR, J.handR, -1]]) {
    const sleeve = mesh(taperedCapsule(0.062, 0.055, 0.17), tee);
    sleeve.position.y = -0.055;
    const upper = capsule(0.04, 0.24, skin, 16);
    upper.position.y = -0.13;
    arm.add(sleeve, upper);
    const f = mesh(taperedCapsule(0.037, 0.031, 0.25), skin);
    f.position.y = -0.11;
    fore.add(f);
    if (s === 1) {
      const band = mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.045, 20), mat({ color: "#141414", roughness: 0.5 }));
      band.position.y = -0.2;
      fore.add(band);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const stud = mesh(new THREE.ConeGeometry(0.006, 0.012, 8), M.metal("#cfcfcf", 0.25));
        stud.position.set(Math.sin(a) * 0.04, -0.2, Math.cos(a) * 0.04);
        stud.lookAt(new THREE.Vector3(Math.sin(a), -0.2, Math.cos(a)).multiplyScalar(1));
        stud.rotateX(Math.PI / 2);
        fore.add(stud);
      }
    }
    const hand = makeHand(0.095, skin, s);
    hand.name = s > 0 ? "LeftHand" : "RightHand";
    hand.rotation.y = s * Math.PI / 2;
    mount.add(hand);
  }
  // legs: shorts + pockets + skin + socks + high-tops
  for (const [leg, shin, foot, s] of [[J.legL, J.shinL, J.footL, 1], [J.legR, J.shinR, J.footR, -1]]) {
    const short = mesh(taperedCapsule(0.088, 0.082, 0.31), khaki);
    short.position.y = -0.12;
    const hem = mesh(new THREE.CylinderGeometry(0.084, 0.086, 0.02, 24, 1, true), khakiD);
    hem.position.y = -0.255;
    const pocket = roundedBox(0.02, 0.09, 0.075, 0.008, khakiD, 2);
    pocket.position.set(s * 0.085, -0.16, 0.0);
    const flap = roundedBox(0.024, 0.02, 0.078, 0.006, khakiD, 2);
    flap.position.set(s * 0.087, -0.112, 0.0);
    const thigh = capsule(0.055, 0.3, skin, 16);
    thigh.position.y = -0.2;
    leg.add(short, hem, pocket, flap, thigh);
    const calf = mesh(taperedCapsule(0.055, 0.04, 0.3), skin);
    calf.position.y = -0.14;
    const sock = mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.07, 20), M.cloth("#ece8de"));
    sock.position.y = -0.265;
    shin.add(calf, sock);
    const shoe = makeSneaker({ s: 0.24, upper: "#1d1d20", sole: "#efeae0", lace: "#f4f1ea", canvas: true });
    shoe.position.y = -0.0;
    shoe.rotation.y = s * 0.06;
    foot.add(shoe);
  }
  // guitar: on the back (default) or in playing position
  const guitar = makeFlyingV();
  const back = group("GuitarBack");
  back.position.set(0.02, 0.06, -0.14);
  back.rotation.set(0.1, Math.PI, 0.55);
  const front = group("GuitarFront");
  front.position.set(-0.06, -0.08, 0.17);
  front.rotation.set(-0.15, 0.18, 1.2);
  J.chest.add(back, front);
  back.add(guitar);
  const strapM = M.cloth("#3a2a1f", 0.8);
  const strapT = tube([[0.15, 0.24, -0.04], [0.12, 0.23, 0.08], [0.0, 0.08, 0.13], [-0.13, -0.08, 0.1], [-0.17, -0.13, -0.02], [-0.12, -0.06, -0.12], [0.06, 0.18, -0.13], [0.15, 0.24, -0.04]], 0.009, strapM, 64, 6, true);
  strapT.scale.set(1, 1, 1);
  J.chest.add(strapT);

  J.model.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } });
  const extra = (r, s, t, k) => {
    const mode = s.custom.guitar ?? "back";
    if (mode === "front" && guitar.parent !== front) front.add(guitar);
    if (mode !== "front" && guitar.parent !== back) back.add(guitar);
    guitar.visible = mode !== "none";
    strapT.visible = mode !== "none";
    // guitar secondary bounce
    guitar.rotation.z = Math.sin(2 * k.p - 1.2) * 0.04 * k.mv;
    guitar.position.y = Math.sin(2 * k.p - 0.9) * 0.008 * k.mv;
    // cap + hair secondary
    cap.rotation.x = -0.12 + Math.sin(2 * k.p - 1.4) * 0.015 * k.mv;
    hair.rotation.x = Math.sin(2 * k.p - 1.6) * 0.02 * k.mv;
    // grin
    const grin = s.custom.grin ?? 0.6;
    mouth.scale.set(0.75 + grin * 0.35, 0.6 + grin * 0.55, 1);
    browR.rotation.z = Math.PI / 2 - 0.32 * grin;
    browL.position.y = 0.171 + (s.custom.browUp ?? 0) * 0.008;
  };
  return { model: J.model, meta: { ...P, seed: 9, lid: 0.82, stepAngle: 0.4 }, extra };
}

/** Props + secondary motion for the sculpted GLB Bully (guitar on the back or played in front). */
export function bullyGLBExtra(root) {
  const chest = root.rig.all.get("chest");
  if (!chest) return null;
  const guitar = makeFlyingV();
  guitar.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const back = attachRest(root, chest, new THREE.Group(), [0.03, 1.0, -0.19], [0.1, Math.PI, 0.55]);
  const front = attachRest(root, chest, new THREE.Group(), [-0.05, 0.86, 0.23], [-0.15, 0.18, 1.2]);
  back.add(guitar);
  const strapPts = [[0.15, 1.11, -0.03], [0.13, 1.08, 0.1], [0.02, 0.94, 0.162], [-0.12, 0.8, 0.175], [-0.188, 0.72, 0.0],
    [-0.12, 0.8, -0.165], [0.06, 1.0, -0.16], [0.15, 1.11, -0.03]];
  const strap = tube(strapPts, 0.011, M.cloth("#3a2a1f", 0.8), 64, 8, true);
  strap.castShadow = true;
  attachRest(root, chest, strap, [0, 0, 0]);
  return (r, s, t, k) => {
    const mode = s.custom.guitar ?? "back";
    const want = mode === "front" ? front : back;
    if (guitar.parent !== want) want.add(guitar);
    guitar.visible = strap.visible = mode !== "none";
    guitar.rotation.z = Math.sin(k.p * 2 - 1.2) * 0.04 * k.mv;
    guitar.position.y = Math.sin(k.p * 2 - 0.9) * 0.008 * k.mv;
  };
}
