// Buddy — the original shaggy dog. A real quadruped (shoulder ~0.36 m), not a toy.
// Fur is built from layered clumps (merged, vertex-coloured), not strands.
import * as THREE from "three";
import { group, mesh, ellipsoid, roundedBox, extrude, tube, makeEye, furEllipsoid, furMaterial } from "../core/geo.js";
import { M, mat } from "../core/mats.js";
import { engravedTag, stripes } from "../core/textures.js";
import { autoBlink, lookAngles, anim } from "./base.js";
import { clamp, lerp, TAU, noise1 } from "../core/util.js";

export const BUDDY = { id: "buddy", name: "Buddy", height: 0.52, kind: "dog", shadow: [0.2, 0.36, 0.6] };

const C = (h) => new THREE.Color(h);
const PAL = {
  dark: C("#33291f"), brown: C("#5e4835"), tan: C("#7c6550"), grey: C("#615c55"),
  greyL: C("#857e74"), cream: C("#b4a790"), creamL: C("#c9bda6"), choc: C("#43342a"),
};
const pick = (r, arr) => arr[(r() * arr.length) | 0];

// region-aware colouring: darker saddle, cream chest/belly/muzzle, grizzled sides
function bodyColor(n, r) {
  if (n.y > 0.55) return pick(r, [PAL.dark, PAL.brown, PAL.grey, PAL.choc, PAL.brown]);
  if (n.y < -0.35) return pick(r, [PAL.cream, PAL.greyL, PAL.creamL]);
  if (n.z > 0.6) return pick(r, [PAL.cream, PAL.greyL, PAL.creamL, PAL.tan]);
  return pick(r, [PAL.brown, PAL.tan, PAL.grey, PAL.greyL, PAL.dark]);
}
function headColor(n, r) {
  if (n.y > 0.5) return pick(r, [PAL.grey, PAL.brown, PAL.greyL, PAL.tan]);
  if (n.z > 0.45) return pick(r, [PAL.creamL, PAL.cream, PAL.greyL]);
  return pick(r, [PAL.tan, PAL.brown, PAL.grey, PAL.greyL]);
}

function furPart(o, material) {
  const len = [o.len[0] * 1.35, o.len[1] * 1.45];
  return mesh(furEllipsoid({ rootDark: 0.86, tipLighten: 0.02, jitter: 0.22, ...o, len, flowK: Math.min(0.94, (o.flowK ?? 0.7) + 0.12) }), material);
}

function buildLeg(name, upperLen, lowerLen, x, y, z, front, furM, skinMat, seed) {
  const hip = group(name);
  hip.position.set(x, y, z);
  const upper = group(`${name}Upper`);
  hip.add(upper);
  const uFur = furPart({ center: new THREE.Vector3(0, -upperLen * 0.45, 0), radii: [0.04, upperLen * 0.62, 0.045], count: 208, len: [0.018, 0.032], r: [0.0043, 0.0062], palette: [], colorFn: (n, r) => pick(r, [PAL.tan, PAL.grey, PAL.greyL, PAL.brown]), flow: new THREE.Vector3(0, -1, front ? -0.3 : -0.6), flowK: 0.75, seed }, furM);
  const uCore = ellipsoid(0.036, upperLen * 0.58, 0.04, mat({ color: "#76644f", roughness: 0.95 }), 16);
  uCore.position.y = -upperLen * 0.45;
  upper.add(uCore, uFur);
  const knee = group(`${name}Lower`);
  knee.position.y = -upperLen;
  upper.add(knee);
  const lCore = ellipsoid(0.024, lowerLen * 0.55, 0.026, mat({ color: "#a2937c", roughness: 0.95 }), 14);
  lCore.position.y = -lowerLen * 0.48;
  const lFur = furPart({ center: new THREE.Vector3(0, -lowerLen * 0.48, 0), radii: [0.026, lowerLen * 0.56, 0.028], count: 144, len: [0.012, 0.022], r: [0.0031, 0.0050], palette: [], colorFn: (n, r) => pick(r, [PAL.cream, PAL.greyL, PAL.tan]), flow: new THREE.Vector3(0, -1, -0.2), flowK: 0.8, seed: seed + 1 }, furM);
  knee.add(lCore, lFur);
  const paw = group(`${name}Paw`);
  paw.position.y = -lowerLen;
  const pad = ellipsoid(0.03, 0.017, 0.042, mat({ color: "#b8a68a", roughness: 0.95 }), 16);
  pad.position.set(0, 0.006, 0.014);
  const pawFur = furPart({ center: new THREE.Vector3(0, 0.012, 0.014), radii: [0.031, 0.018, 0.043], count: 96, len: [0.008, 0.013], r: [0.0031, 0.0043], palette: [], colorFn: (n, r) => pick(r, [PAL.creamL, PAL.cream, PAL.greyL]), flow: new THREE.Vector3(0, -0.4, 1), flowK: 0.5, seed: seed + 2 }, furM);
  for (let i = -1; i <= 1; i++) {
    const toe = ellipsoid(0.009, 0.007, 0.01, mat({ color: "#3a2f26", roughness: 0.6 }), 10);
    toe.position.set(i * 0.013, -0.006, 0.05);
    paw.add(toe);
  }
  paw.add(pad, pawFur);
  knee.add(paw);
  return hip;
}

export function buildBuddy() {
  const model = group("VisualModel");
  const pivot = group("AnimationPivot");
  model.add(pivot);
  const furM = furMaterial(0.9);
  const skin = mat({ color: "#6e5d4b", roughness: 0.95, sheen: 0.6, sheenColor: "#c9b79a", sheenRoughness: 0.8 });

  const body = group("Body");
  body.position.set(0, 0.29, 0);
  pivot.add(body);
  // torso: soft core + three fur layers (under-coat, coat, shaggy guard hairs)
  const core = ellipsoid(0.1, 0.1, 0.235, skin, 28);
  body.add(core);
  body.add(furPart({ radii: [0.105, 0.105, 0.24], count: 1120, len: [0.03, 0.05], r: [0.0068, 0.0099], palette: [], colorFn: bodyColor, flow: new THREE.Vector3(0, -0.4, -1), flowK: 0.78, seed: 1, inset: 0.95 }, furM));
  body.add(furPart({ radii: [0.112, 0.112, 0.245], count: 992, len: [0.045, 0.07], r: [0.0056, 0.0081], palette: [], colorFn: bodyColor, flow: new THREE.Vector3(0, -1, -0.7), flowK: 0.82, seed: 2, inset: 0.98 }, furM));
  body.add(furPart({ radii: [0.11, 0.11, 0.24], count: 416, len: [0.06, 0.09], r: [0.0037, 0.0062], palette: [], colorFn: bodyColor, flow: new THREE.Vector3(0, -1, -0.3), flowK: 0.85, seed: 3, filter: (n) => n.y > -0.2 }, furM));
  // fluffy chest
  const chest = group("Chest");
  chest.position.set(0, -0.015, 0.2);
  chest.add(ellipsoid(0.085, 0.095, 0.07, skin, 20));
  chest.add(furPart({ radii: [0.09, 0.1, 0.075], count: 544, len: [0.035, 0.06], r: [0.0056, 0.0081], palette: [], colorFn: (n, r) => pick(r, [PAL.creamL, PAL.cream, PAL.greyL, PAL.cream]), flow: new THREE.Vector3(0, -1, 0.35), flowK: 0.8, seed: 4, filter: (n) => !(Math.abs(n.x) < 0.22 && n.z > 0.5 && n.y > -0.45) }, furM));
  body.add(chest);

  // neck + head
  const neck = group("Neck");
  neck.position.set(0, 0.05, 0.2);
  neck.rotation.x = 0.42;
  body.add(neck);
  neck.add(furPart({ center: new THREE.Vector3(0, 0.04, 0), radii: [0.075, 0.07, 0.07], count: 448, len: [0.035, 0.055], r: [0.0056, 0.0081], palette: [], colorFn: bodyColor, flow: new THREE.Vector3(0, -0.6, -1), flowK: 0.78, seed: 5 }, furM));
  const head = group("Head");
  head.position.set(0, 0.1, 0.01);
  head.rotation.x = -0.42;
  neck.add(head);
  head.add(ellipsoid(0.074, 0.07, 0.078, skin, 24));
  head.add(furPart({ radii: [0.082, 0.078, 0.085], count: 896, len: [0.02, 0.04], r: [0.0050, 0.0074], palette: [], colorFn: headColor, flow: new THREE.Vector3(0, -0.5, -1), flowK: 0.72, seed: 6, filter: (n) => !(n.z > 0.55 && Math.abs(n.y) < 0.35 && Math.abs(n.x) < 0.7) }, furM));
  // shaggy top-knot falling over the forehead
  head.add(furPart({ center: new THREE.Vector3(0, 0.05, 0.02), radii: [0.06, 0.03, 0.06], count: 192, len: [0.03, 0.048], r: [0.0043, 0.0068], palette: [], colorFn: (n, r) => pick(r, [PAL.greyL, PAL.grey, PAL.tan, PAL.cream]), flow: new THREE.Vector3(0, -0.2, 1), flowK: 0.7, seed: 7, filter: (n) => n.y > 0.3 }, furM));
  // muzzle with scruffy beard
  const muzzle = group("Muzzle");
  muzzle.position.set(0, -0.026, 0.07);
  head.add(muzzle);
  muzzle.add(ellipsoid(0.042, 0.035, 0.05, skin, 20));
  muzzle.add(furPart({ radii: [0.046, 0.038, 0.054], count: 448, len: [0.016, 0.03], r: [0.0037, 0.0056], palette: [], colorFn: (n, r) => pick(r, [PAL.creamL, PAL.cream, PAL.greyL, PAL.grey]), flow: new THREE.Vector3(0, -1, 0.5), flowK: 0.75, seed: 8, filter: (n) => n.z < 0.82 }, furM));
  const beard = furPart({ center: new THREE.Vector3(0, -0.028, 0.012), radii: [0.034, 0.016, 0.034], count: 192, len: [0.025, 0.045], r: [0.0037, 0.0056], palette: [], colorFn: (n, r) => pick(r, [PAL.cream, PAL.greyL, PAL.creamL]), flow: new THREE.Vector3(0, -1, 0.15), flowK: 0.88, seed: 9 }, furM);
  muzzle.add(beard);
  const nose = ellipsoid(0.019, 0.014, 0.014, mat({ color: "#121010", roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.3 }), 18);
  nose.name = "Nose";
  nose.position.set(0, 0.012, 0.05);
  muzzle.add(nose);
  const mouthLine = tube([[-0.02, -0.012, 0.035], [0, -0.016, 0.045], [0.02, -0.012, 0.035]], 0.002, mat({ color: "#2a1d16" }), 10, 6);
  muzzle.add(mouthLine);
  // big expressive brown eyes, soft fur lids
  const lid = mat({ color: "#6e5a46", roughness: 0.95 });
  [["EyeL", 1], ["EyeR", -1]].forEach(([nm, s]) => {
    const e = makeEye({ rx: 0.025, ry: 0.025, rz: 0.018, iris: "#5a3218", irisR: 0.72, pupilR: 0.44, lidMat: lid });
    e.name = nm;
    e.position.set(s * 0.037, 0.01, 0.064);
    e.rotation.y = s * 0.3;
    head.add(e);
  });
  // brow tufts (expressive)
  for (const s of [1, -1]) {
    const brow = furPart({ center: new THREE.Vector3(s * 0.034, 0.032, 0.06), radii: [0.02, 0.008, 0.012], count: 28, len: [0.02, 0.03], r: [0.0037, 0.0056], palette: [], colorFn: (n, r) => pick(r, [PAL.creamL, PAL.greyL]), flow: new THREE.Vector3(s * 0.4, 0.3, 1), flowK: 0.7, seed: 10 + s }, furM);
    brow.name = s > 0 ? "BrowL" : "BrowR";
    head.add(brow);
  }
  // floppy ears
  for (const [nm, s] of [["EarL", 1], ["EarR", -1]]) {
    const ear = group(nm);
    ear.position.set(s * 0.066, 0.042, -0.005);
    ear.rotation.set(0.1, 0, s * 0.35);
    const flap = ellipsoid(0.03, 0.062, 0.012, mat({ color: "#4a3a2b", roughness: 0.95 }), 16);
    flap.position.y = -0.05;
    const earFur = furPart({ center: new THREE.Vector3(0, -0.05, 0), radii: [0.034, 0.066, 0.016], count: 272, len: [0.02, 0.04], r: [0.0043, 0.0062], palette: [], colorFn: (n, r) => pick(r, [PAL.dark, PAL.choc, PAL.brown, PAL.tan]), flow: new THREE.Vector3(0, -1, 0), flowK: 0.85, seed: 12 + s }, furM);
    ear.add(flap, earFur);
    head.add(ear);
  }

  // collar, BUDDY tag, striped tie
  const collarG = group("Collar");
  collarG.position.set(0, 0.075, 0.035);
  collarG.rotation.x = -0.55;
  chest.add(collarG);
  const shirt = mat({ color: "#ece6d8", roughness: 0.8, sheen: 0.4, sheenColor: "#ffffff" });
  const band = mesh(new THREE.TorusGeometry(0.062, 0.007, 10, 40), shirt);
  band.rotation.x = Math.PI / 2;
  collarG.add(band);
  for (const s2 of [1, -1]) {
    const tri = new THREE.Shape();
    tri.moveTo(0, 0); tri.lineTo(s2 * 0.028, -0.004); tri.lineTo(s2 * 0.01, -0.026); tri.closePath();
    const flap = extrude(tri, 0.0015, shirt, 0.001);
    flap.position.set(s2 * 0.004, -0.004, 0.062);
    flap.rotation.x = 0.35;
    collarG.add(flap);
  }
  const tieTex = stripes("#20418f", "#f0c232").clone();
  tieTex.repeat.set(22, 22);
  tieTex.needsUpdate = true;
  const tieMat = mat({ color: "#ffffff", map: tieTex, roughness: 0.6, sheen: 0.5, sheenColor: "#ffffff" });
  const tie = group("Tie");
  tie.position.set(0, 0.07, 0.085);
  const knot = roundedBox(0.02, 0.018, 0.012, 0.005, tieMat, 3);
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.008, 0); bladeShape.lineTo(0.008, 0); bladeShape.lineTo(0.017, -0.075); bladeShape.lineTo(0, -0.09); bladeShape.lineTo(-0.017, -0.075); bladeShape.closePath();
  const blade = extrude(bladeShape, 0.003, tieMat, 0.0012);
  blade.position.y = -0.006;
  tie.add(knot, blade);
  tie.rotation.x = 0.32;
  chest.add(tie);
  const tag = group("Tag");
  tag.position.set(0.024, -0.01, 0.07);
  const ring = mesh(new THREE.TorusGeometry(0.005, 0.0012, 6, 16), M.metal("#c9a24a", 0.3));
  const disc = mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.0025, 32), mat({ color: "#ffffff", map: engravedTag("BUDDY"), roughness: 0.3, metalness: 0.9 }));
  disc.rotation.x = Math.PI / 2;
  disc.rotation.y = Math.PI / 2;
  disc.material.map.center.set(0.5, 0.5);
  disc.material.map.rotation = Math.PI / 2;
  disc.position.y = -0.021;
  tag.add(ring, disc);
  collarG.add(tag);

  // legs
  const legs = {
    LegFL: buildLeg("LegFL", 0.13, 0.12, 0.062, -0.03, 0.15, true, furM, skin, 20),
    LegFR: buildLeg("LegFR", 0.13, 0.12, -0.062, -0.03, 0.15, true, furM, skin, 30),
    LegHL: buildLeg("LegHL", 0.13, 0.13, 0.068, -0.035, -0.17, false, furM, skin, 40),
    LegHR: buildLeg("LegHR", 0.13, 0.13, -0.068, -0.035, -0.17, false, furM, skin, 50),
  };
  for (const l of Object.values(legs)) body.add(l);
  // rest pose for hind legs: knee forward, hock back
  for (const k of ["LegHL", "LegHR"]) {
    legs[k].children[0].rotation.x = -0.32;
    legs[k].getObjectByName(`${k}Lower`).rotation.x = 0.55;
    legs[k].getObjectByName(`${k}Paw`).rotation.x = -0.23;
  }

  // tail: 3-segment fluffy chain
  const tail = group("Tail");
  tail.position.set(0, 0.04, -0.225);
  tail.rotation.x = -0.9;
  body.add(tail);
  let parent = tail;
  for (let i = 0; i < 3; i++) {
    const seg = group(`Tail${i + 1}`);
    if (i > 0) seg.position.y = 0.055;
    seg.add(furPart({ center: new THREE.Vector3(0, 0.03, 0), radii: [0.022 - i * 0.003, 0.04, 0.022 - i * 0.003], count: 160, len: [0.03, 0.055 - i * 0.004], r: [0.0043, 0.0068], palette: [], colorFn: (n, r) => pick(r, i === 2 ? [PAL.cream, PAL.greyL, PAL.creamL] : [PAL.brown, PAL.grey, PAL.tan, PAL.greyL]), flow: new THREE.Vector3(0, 1, -0.6), flowK: 0.6, seed: 60 + i }, furM));
    seg.rotation.x = 0.25;
    parent.add(seg);
    parent = seg;
  }

  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { model, meta: { seed: 5, walkStride: 0.42, trotStride: 0.62 } };
}

/**
 * Quadruped controller. state.custom: trot (0..1), earPerk, earsDown, tailWag,
 * sniff, headTilt, lie, pant.
 */
export class DogController {
  constructor(root) {
    this.root = root;
    const n = root.rig.all;
    const get = (k) => n.get(k.toLowerCase());
    this.p = {
      body: get("Body"), neck: get("Neck"), head: get("Head"), muzzle: get("Muzzle"), nose: get("Nose"),
      earL: get("EarL"), earR: get("EarR"), tail: get("Tail"), tails: [get("Tail1"), get("Tail2"), get("Tail3")],
      tie: get("Tie"), tag: get("Tag"), browL: get("BrowL"), browR: get("BrowR"),
      legs: ["LegFL", "LegFR", "LegHL", "LegHR"].map((k) => ({ k, hip: get(k), up: get(k)?.children[0], low: get(`${k}Lower`), paw: get(`${k}Paw`), front: k[3] === "F" })),
    };
  }

  apply(root, s, t) {
    const P = this.p, c = s.custom, m = root.meta;
    if (!P.body || !P.neck || !P.head) return; // partial GLB rig: root motion only
    const trot = clamp(c.trot ?? 0);
    const stride = lerp(m.walkStride ?? 0.42, m.trotStride ?? 0.62, trot);
    const ph = (s.dist / stride) * TAU;
    const mv = clamp(s.moving);
    const lie = clamp(c.lie ?? 0);
    const offsWalk = { LegHL: 0, LegFL: 0.25, LegHR: 0.5, LegFR: 0.75 };
    const offsTrot = { LegFL: 0, LegHR: 0, LegFR: 0.5, LegHL: 0.5 };
    const A = lerp(0.42, 0.55, trot) * mv;
    for (const L of P.legs) {
      if (!L.hip || !L.up || !L.low || !L.paw) continue;
      const off = lerp(offsWalk[L.k], offsTrot[L.k], trot) * TAU;
      const a = ph + off;
      const sw = A * Math.sin(a);
      const lift = Math.max(0, Math.cos(a)) * mv;
      L.up.rotation.x += -sw;
      if (L.front) {
        L.low.rotation.x += lift * 0.9 * (1 + trot * 0.4);
        L.paw.rotation.x += lift * 0.6 - sw * 0.3;
      } else {
        L.low.rotation.x += lift * 0.7;
        L.paw.rotation.x += -lift * 0.5 + sw * 0.2;
      }
      // lie down: fold legs under the body
      if (lie > 0) {
        if (L.front) { L.up.rotation.x += -1.25 * lie; L.low.rotation.x += 0.2 * lie; L.paw.rotation.x += 1.0 * lie; }
        else { L.up.rotation.x += -0.9 * lie; L.low.rotation.x += 2.1 * lie; L.paw.rotation.x += -0.9 * lie; }
      }
    }
    // body motion
    const bob = Math.cos(2 * ph) * 0.006 * mv * (1 + trot);
    const breathe = anim.breathe(t, 2, c.pant ? 3.2 : 1.1);
    P.body.position.y += bob - lie * 0.17;
    P.body.rotation.x += Math.sin(2 * ph) * 0.02 * mv + lie * 0.02;
    P.body.rotation.z += Math.sin(ph) * 0.03 * mv;
    P.body.scale.x *= 1 + breathe * 0.012;
    P.body.scale.y *= 1 + breathe * 0.012;
    // head: stabilise against bob, look, sniff, tilt
    let yaw = 0, pitch = 0;
    if (s.look && s.lookAmt > 0) {
      const a = lookAngles(P.neck, s.look);
      yaw = clamp(a.yaw, -1.2, 1.2) * s.lookAmt;
      pitch = clamp(a.pitch + 0.35, -0.6, 0.7) * s.lookAmt;
    }
    const sniff = clamp(c.sniff ?? 0);
    P.neck.rotation.y += yaw * 0.6;
    P.neck.rotation.x += -pitch * 0.5 + sniff * 0.75 - Math.sin(2 * ph) * 0.02 * mv + lie * 0.25;
    P.head.rotation.y += yaw * 0.4;
    P.head.rotation.x += -pitch * 0.5 + sniff * 0.35 + lie * 0.1;
    P.head.rotation.z += (c.headTilt ?? 0) * 0.35 + Math.sin(t * 0.7) * 0.02;
    const tw = sniff * (0.5 + 0.5 * Math.sin(t * 22)) * (noise1(t * 3, 4) > -0.2 ? 1 : 0);
    if (P.nose) { P.nose.scale.x *= 1 + tw * 0.12; P.nose.scale.y *= 1 - tw * 0.08; P.nose.position.y += tw * 0.0015; }
    if (P.muzzle) P.muzzle.rotation.x += tw * 0.03;
    // ears: perk up / flatten back + bounce
    const perk = clamp(c.earPerk ?? 0), down = clamp(c.earsDown ?? 0);
    for (const [ear, sd] of [[P.earL, 1], [P.earR, -1]]) {
      if (!ear) continue;
      const bounce = Math.sin(2 * ph - 1.1) * 0.18 * mv * (1 + trot);
      ear.rotation.z += sd * (-perk * 0.55 + down * 0.45) + sd * bounce * 0.4;
      ear.rotation.x += -perk * 0.5 + down * 0.55 + bounce;
      ear.rotation.y += sd * perk * 0.25;
    }
    for (const b of [P.browL, P.browR]) if (b) b.position.y += perk * 0.006 - down * 0.004;
    // tail
    const wag = clamp(c.tailWag ?? 0.15);
    const tailDown = down * 0.9 + lie * 0.6;
    if (P.tail) {
      P.tail.rotation.x += tailDown * 0.9 - Math.sin(2 * ph) * 0.05 * mv;
      P.tail.rotation.z += wag * 0.55 * Math.sin(t * 13);
    }
    P.tails.forEach((seg, i) => {
      if (!seg) return;
      seg.rotation.z += wag * 0.35 * Math.sin(t * 13 - (i + 1) * 0.9);
      seg.rotation.x += Math.sin(ph * 2 - i) * 0.06 * mv + tailDown * 0.15;
    });
    // tie & tag swing
    if (P.tie) { P.tie.rotation.x += Math.sin(2 * ph - 1.4) * 0.12 * mv + sniff * 0.35; P.tie.rotation.z += Math.sin(ph - 1.2) * 0.1 * mv; }
    if (P.tag) P.tag.rotation.z += Math.sin(2 * ph - 0.9) * 0.3 * mv + Math.sin(t * 2) * 0.05;
    // eyes
    const blink = s.blink ?? autoBlink(t, 5, 4.2);
    const ex = clamp((yaw * 0.6) / 0.5, -1, 1), ey = clamp((pitch * 0.5 - sniff * 0.3) / 0.5, -1, 1);
    for (const e of [root.rig.eyeL, root.rig.eyeR]) {
      if (!e) continue;
      e.setLook?.(ex, ey);
      e.setLid?.(lerp(lerp(0.85, 0.35, down * 0.6 + lie * 0.5), -1, blink));
    }
  }
}
