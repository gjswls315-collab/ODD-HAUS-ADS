// Shared biped assembly for the small object characters.
// Produces the standard rig hierarchy:
// VisualModel > AnimationPivot > {Body > (face, EyeL, EyeR, LeftArm, RightArm, Props), LeftLeg, RightLeg}
import * as THREE from "three";
import { group, limb, makeGlove, makeSneaker, makeEye } from "../core/geo.js";
import { M } from "../core/mats.js";
import { hasKit, makeKitGlove, makeKitSneaker, HoseLimb } from "./tinykit.js";
import { PoseRig, AX } from "./pose.js";
import { BipedGait } from "./gait.js";
import { autoBlink, anim } from "./base.js";
import { clamp, lerp, noise1, fbm1 } from "../core/util.js";

/**
 * spec = {
 *   legLen, hipX, legR, shoe: {...makeSneaker opts},
 *   body: Group (origin = hip centre),
 *   shoulders: [[x, y, z], [x, y, z]] in body space (left = +x),
 *   armLen, armR, glove,
 *   eyes: [{ pos:[x,y,z], rx, ry, rz, lidMat, iris, pupilR, rotY, rotZ }],
 *   limbMat
 * }
 */
export function buildBiped(spec) {
  const model = group("VisualModel");
  const pivot = group("AnimationPivot");
  model.add(pivot);
  const body = spec.body;
  body.name = "Body";
  body.position.y = spec.legLen;
  pivot.add(body);
  const props = group("Props");
  body.add(props);

  const limbMat = spec.limbMat || M.limb();
  const shoeS = spec.shoe.s;
  const ankleH = 0.44 * shoeS;
  const L = (spec.legLen - ankleH) / 2;
  const kit = hasKit();
  const hoses = [];
  for (const [side, name] of [[1, "Left"], [-1, "Right"]]) {
    const hip = kit ? group(`${name}Leg`) : limb(L + spec.legR, spec.legR, limbMat, `${name}Leg`);
    hip.position.set(side * spec.hipX, spec.legLen, 0);
    const knee = kit ? group(`${name}Shin`) : limb(L + spec.legR, spec.legR * 0.95, limbMat, `${name}Shin`);
    knee.position.y = -L;
    hip.add(knee);
    const foot = group(`${name}Foot`);
    foot.position.y = -L;
    knee.add(foot);
    const shoe = kit ? makeKitSneaker(spec.shoe) : makeSneaker(spec.shoe);
    shoe.rotation.y = side * 0.08;
    foot.add(shoe);
    pivot.add(hip);
    if (kit) hoses.push(new HoseLimb([hip, knee, foot], spec.legR, spec.legR * 0.9, limbMat, model, { extendStart: spec.legR * 2 }));
  }

  const aL = spec.armLen / 2;
  spec.shoulders.forEach(([x, y, z], i) => {
    const side = i === 0 ? 1 : -1;
    const name = i === 0 ? "Left" : "Right";
    const sh = kit ? group(`${name}Arm`) : limb(aL + spec.armR, spec.armR, limbMat, `${name}Arm`);
    sh.position.set(x, y, z);
    sh.rotation.z = side * 0.2;
    const el = kit ? group(`${name}ForeArm`) : limb(aL + spec.armR, spec.armR, limbMat, `${name}ForeArm`);
    el.position.y = -aL;
    sh.add(el);
    const glove = kit ? makeKitGlove(spec.glove, side) : makeGlove(spec.glove);
    glove.name = `${name}Hand`;
    glove.position.y = -aL - spec.armR * 0.5;
    glove.rotation.y = side * -Math.PI / 2;
    el.add(glove);
    body.add(sh);
    if (kit) hoses.push(new HoseLimb([sh, el, glove], spec.armR, spec.armR * 0.92, limbMat, model, { extendStart: spec.armR * 1.5, extendEnd: spec.armR * 1.2 }));
  });
  model.userData.hoses = hoses;
  model.userData.shoeS = spec.shoe.s;

  (spec.eyes || []).forEach((e, i) => {
    const eye = makeEye(e);
    eye.name = i === 0 ? "EyeL" : "EyeR";
    eye.position.set(...e.pos);
    if (e.rotY) eye.rotation.y = e.rotY;
    if (e.rotZ) eye.rotation.z = e.rotZ;
    body.add(eye);
  });

  model.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false; } });
  return model;
}

/**
 * Controller for the small object characters: planted feet (BipedGait + IK), toy-like bounce
 * and squash, counter-swinging arms, freeze/crouch/tremble, look, eyes, rubber-hose limbs.
 * meta: { legLen, seed, lid, heavy, strideK, shoeS }
 */
export class TinyRigController {
  constructor(root) {
    this.root = root;
    const m = this.m = root.meta || {};
    this.seed = m.seed ?? 1;
    this.pose = new PoseRig(root, root.rig.all);
    const shoe = m.shoeS ?? root.visual.userData.shoeS ?? 0.06;
    this.gait = new BipedGait(this.pose, {
      legs: [{ hip: "LeftLeg", knee: "LeftShin", ankle: "LeftFoot", side: 1 }, { hip: "RightLeg", knee: "RightShin", ankle: "RightFoot", side: -1 }],
      strideK: m.strideK ?? 2.3, duty: 0.56, lift: 0.3, sway: 0.08, hipYaw: 0.18, hipRoll: 0.0,
      heel: shoe * 0.28, ball: shoe * 0.42, heelStrike: 0.35, toeOff: 0.5,
    });
    this.hoses = root.visual.userData.hoses || [];
  }

  apply(root, s, t) {
    const P = this.pose, r = root.rig, m = this.m, c = s.custom || {};
    const heavy = m.heavy ?? 0;
    const fr = clamp(s.freeze ?? 0);
    const crouch = clamp((s.crouch ?? 0) + fr * 0.25);
    P.begin();
    const sol = this.gait.solve(s, { crouch });
    const mv = sol.mv, run = sol.run, ph = sol.phi;
    const p = ph * Math.PI * 2;
    const breathe = anim.breathe(t, this.seed, 1.4 - heavy * 0.4);
    const L = this.gait.legLen;
    // body: bounce from the legs' reach, squash on contact, lean into the walk
    const bob = sol.pelvis.y;
    const tr = anim.tremble(t, this.seed, (s.tremble ?? 0) * 0.04);
    P.move("AnimationPivot", sol.pelvis.x * 0.6 + tr * 0.02, bob, 0);
    P.rot("AnimationPivot", (0.08 * mv + run * 0.12 + (s.lean ?? 0)) * (1 - heavy * 0.4) - fr * 0.05,
      sol.pelvis.yaw * 0.5, Math.sin(p) * 0.07 * mv * (1 + heavy * 0.8) + tr);
    const contact = Math.max(0, Math.cos(2 * p)) ** 3 * mv;          // two footfalls per cycle
    const sq = 1 + breathe * 0.012 * (1 - mv) - fr * 0.05 - contact * 0.045 + (1 - contact) * 0.015 * mv;
    P.scale("Body", 1 + (1 - sq) * 0.5, sq, 1 + (1 - sq) * 0.5);
    // look: turn the body a little, eyes do the rest
    let ly = 0, lp = 0;
    if (s.look && s.lookAmt > 0) {
      const v = root.worldToLocal(s.look.clone()).sub(P.restPos("Body") || new THREE.Vector3(0, L, 0));
      ly = clamp(Math.atan2(v.x, v.z), -1.4, 1.4) * s.lookAmt;
      lp = clamp(Math.atan2(v.y, Math.hypot(v.x, v.z)), -0.8, 1.2) * s.lookAmt;
    }
    const bodyYaw = clamp(ly * 0.55, -0.7, 0.7);
    P.rot("Body", -clamp(lp * 0.25, -0.25, 0.3), bodyYaw, 0);
    // arms: counter-swing; freeze tucks them up
    for (const [nm, sd, k] of [["Left", 1, 1], ["Right", -1, 0]]) {
      const fwd = sol.fwd[k] ?? 0;
      const e = c[nm === "Left" ? "armL" : "armR"] || {};
      const sw = fwd * (0.75 + run * 0.4) * mv;
      const idle = Math.sin(t * 1.3 + this.seed + sd) * 0.05 * (1 - mv);
      P.rot(`${nm}Arm`, -sw + idle - fr * 1.1 - (e.x ?? 0), 0, sd * (0.25 + 0.15 * mv + fr * 0.2 + breathe * 0.02 + (e.z ?? 0)));
      P.rot(`${nm}ForeArm`, -(0.35 + run * 0.6) * mv - fr * 1.2 - 0.25 - (e.elbow ?? 0), 0, 0);
    }
    P.commit();
    this.gait.applyLegs(sol, { kneeOut: 0.15 });
    for (const [nm] of [["Left"], ["Right"]]) {
      const hand = P.get(`${nm}Hand`);
      if (hand?.setCurl) hand.setCurl((c[nm === "Left" ? "armL" : "armR"]?.curl) ?? (0.25 + fr * 0.6 + run * 0.3));
    }
    // eyes
    const idleL = anim.idleLook(t, this.seed);
    const ex = clamp((ly - bodyYaw) / 0.6 + idleL.x * (1 - s.lookAmt) * 0.6, -1, 1);
    const ey = clamp(lp / 0.6 + idleL.y * (1 - s.lookAmt) * 0.6, -1, 1);
    const blink = s.blink ?? autoBlink(t, this.seed);
    const lidOpen = s.lid ?? (m.lid ?? 1);
    for (const e of [r.eyeL, r.eyeR]) {
      if (!e) continue;
      e.setLook?.(ex, ey);
      e.setLid?.(lerp(lerp(lidOpen, 1, fr), -1, blink));
    }
    root.extra?.(r, s, t, { p, mv, run, fr, breathe });
    root.updateMatrixWorld(true);
    for (const h of this.hoses) h.update();
  }
}
