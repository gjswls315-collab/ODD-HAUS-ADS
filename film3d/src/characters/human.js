// Shared human skeleton + procedural controller (Bully, Mr. ODD).
// Hierarchy: VisualModel > AnimationPivot > Body(hips) > Spine > Chest > Neck > Head
//            Chest > LeftArm > LeftForeArm > LeftHand ; Body > LeftLeg > LeftShin > LeftFoot
import * as THREE from "three";
import { group } from "../core/geo.js";
import { autoBlink, lookAngles, anim } from "./base.js";
import { clamp, lerp, TAU } from "../core/util.js";

/**
 * p = { hipH, hipX, thigh, shin, ankleH, spine, chest, neck, headY, shoulderX, shoulderY, upperArm, foreArm }
 * All lengths in metres. Returns joints; the caller attaches meshes.
 */
export function humanSkeleton(p) {
  const J = {};
  J.model = group("VisualModel");
  J.pivot = group("AnimationPivot");
  J.model.add(J.pivot);
  J.body = group("Body");
  J.body.position.y = p.hipH;
  J.pivot.add(J.body);
  J.spine = group("Spine");
  J.spine.position.y = 0.04;
  J.body.add(J.spine);
  J.chest = group("Chest");
  J.chest.position.y = p.spine;
  J.spine.add(J.chest);
  J.neck = group("Neck");
  J.neck.position.y = p.chest;
  J.chest.add(J.neck);
  J.head = group("Head");
  J.head.position.y = p.neck;
  J.neck.add(J.head);
  for (const [side, nm] of [[1, "Left"], [-1, "Right"]]) {
    const arm = group(`${nm}Arm`);
    arm.position.set(side * p.shoulderX, p.shoulderY, p.shoulderZ ?? 0);
    arm.rotation.z = side * (p.armRest ?? 0.12);
    J.chest.add(arm);
    const fore = group(`${nm}ForeArm`);
    fore.position.y = -p.upperArm;
    fore.rotation.x = -(p.elbowRest ?? 0.12);
    arm.add(fore);
    const hand = group(`${nm}HandMount`);
    hand.position.y = -p.foreArm;
    fore.add(hand);
    const leg = group(`${nm}Leg`);
    leg.position.set(side * p.hipX, 0, 0);
    J.body.add(leg);
    const shin = group(`${nm}Shin`);
    shin.position.y = -p.thigh;
    leg.add(shin);
    const foot = group(`${nm}Foot`);
    foot.position.y = -p.shin;
    shin.add(foot);
    J[`arm${nm[0]}`] = arm; J[`fore${nm[0]}`] = fore; J[`hand${nm[0]}`] = hand;
    J[`leg${nm[0]}`] = leg; J[`shin${nm[0]}`] = shin; J[`foot${nm[0]}`] = foot;
  }
  return J;
}

/**
 * Procedural human controller.
 * state.custom:
 *   crouch 0..1, spineBend (rad), headTilt, grin 0..1, browUp, squint,
 *   armL / armR: { x, y, z, elbow, curl } additive pose offsets (rad),
 *   legL / legR: { x, knee } additive,
 *   sip 0..1 (Mr. ODD mug), weightShift -1..1
 */
export class HumanController {
  constructor(root) {
    this.root = root;
    const g = (k) => root.rig.all.get(k.toLowerCase());
    this.j = {
      pivot: g("AnimationPivot"), body: g("Body"), spine: g("Spine"), chest: g("Chest"), neck: g("Neck"), head: g("Head"),
      armL: g("LeftArm"), foreL: g("LeftForeArm"), handL: g("LeftHand"), armR: g("RightArm"), foreR: g("RightForeArm"), handR: g("RightHand"),
      legL: g("LeftLeg"), shinL: g("LeftShin"), footL: g("LeftFoot"), legR: g("RightLeg"), shinR: g("RightShin"), footR: g("RightFoot"),
    };
    const m = root.meta;
    this.thigh = m.thigh; this.shin = m.shin;
    this.upper = m.upperArm; this.lower = m.foreArm + (m.handLen ?? 0.08);
    this.A = m.stepAngle ?? 0.42;
    this.stride = m.stride ?? 4 * (m.thigh + m.shin) * Math.sin(this.A) * 0.92;
  }

  apply(root, s, t) {
    const j = this.j, c = s.custom, m = root.meta;
    const heavy = m.heavy ?? 0;
    const mv = clamp(s.moving);
    const p = (s.dist / this.stride) * TAU;
    const A = this.A * mv;
    const crouch = clamp(c.crouch ?? 0);
    const breathe = anim.breathe(t, m.seed ?? 1, heavy ? 0.9 : 1.3);

    // legs + crouch (knee bend solved so feet stay planted)
    const L = this.thigh, Sh = this.shin;
    const drop = crouch * (L + Sh) * 0.55;
    const h = L + Sh - drop;
    const kneeC = Math.acos(clamp((L * L + Sh * Sh - h * h) / (2 * L * Sh), -1, 1));
    const knee = Math.PI - kneeC;
    const hipF = Math.acos(clamp((L * L + h * h - Sh * Sh) / (2 * L * h), -1, 1));
    for (const [leg, shin, foot, off, k] of [[j.legL, j.shinL, j.footL, 0, "legL"], [j.legR, j.shinR, j.footR, Math.PI, "legR"]]) {
      if (!leg) continue;
      const a = p + off;
      const th = A * Math.sin(a);
      const lift = Math.max(0, Math.cos(a)) * mv;
      const extra = c[k] || {};
      leg.rotation.x += -th - hipF * (crouch > 0 ? 1 : 0) - crouch * 0.25 - (extra.x ?? 0);
      shin.rotation.x += lift * (0.85 - heavy * 0.25) + knee * (crouch > 0 ? 1 : 0) + (extra.knee ?? 0);
      if (foot) foot.rotation.x += th * 0.5 - lift * 0.35 - (knee - hipF) * (crouch > 0 ? 1 : 0) * 0.98 + (extra.foot ?? 0);
      leg.rotation.z += (c.weightShift ?? 0) * 0.03;
    }
    // hips / torso
    const bob = (1 + Math.cos(2 * p)) * 0.5;
    j.body.position.y += -drop + (bob - 0.5) * 0.025 * mv * (1 - heavy * 0.3) + breathe * 0.002;
    j.body.position.x += (c.weightShift ?? 0) * 0.03 + Math.sin(p) * 0.012 * mv * (1 + heavy * 1.5);
    j.body.rotation.y += Math.sin(p) * 0.12 * mv;
    j.body.rotation.z += Math.sin(p) * (0.03 + heavy * 0.05) * mv;
    j.body.rotation.x += crouch * 0.25;
    j.spine.rotation.x += (c.spineBend ?? 0) * 0.5 + 0.04 * mv + crouch * 0.35;
    j.chest.rotation.x += (c.spineBend ?? 0) * 0.5 - breathe * 0.012 + crouch * 0.15;
    j.chest.rotation.y += -Math.sin(p) * 0.16 * mv;
    j.chest.rotation.z += -Math.sin(p) * (0.02 + heavy * 0.05) * mv;
    j.chest.scale.setScalar(1 + breathe * 0.006);
    // arms
    for (const [arm, fore, hand, sd, off, k] of [[j.armL, j.foreL, j.handL, 1, Math.PI, "armL"], [j.armR, j.foreR, j.handR, -1, 0, "armR"]]) {
      if (!arm) continue;
      const sw = Math.sin(p + off) * (0.42 - heavy * 0.12) * mv;
      const e = c[k] || {};
      arm.rotation.x += -sw - (e.x ?? 0);
      arm.rotation.y += sd * (e.y ?? 0);
      arm.rotation.z += sd * ((e.z ?? 0) + breathe * 0.01);
      fore.rotation.x += -(Math.max(0, -Math.sin(p + off)) * 0.25 * mv) - (e.elbow ?? 0);
      fore.rotation.y += sd * (e.twist ?? 0);
      if (hand?.setCurl) hand.setCurl(e.curl ?? 0.3, e.spread ?? 0);
      if (hand) { hand.rotation.x += e.wrist ?? 0; hand.rotation.z += sd * (e.wristZ ?? 0); }
    }
    // head: stabilise, look, tilt
    let yaw = 0, pitch = 0;
    if (s.look && s.lookAmt > 0) {
      const a = lookAngles(j.neck, s.look);
      yaw = clamp(a.yaw, -1.3, 1.3) * s.lookAmt;
      pitch = clamp(a.pitch, -1.0, 0.7) * s.lookAmt;
    }
    j.neck.rotation.y += yaw * 0.45 + Math.sin(p) * 0.08 * mv;
    j.neck.rotation.x += -pitch * 0.45 - ((c.spineBend ?? 0) + crouch * 0.5) * 0.3;
    j.head.rotation.y += yaw * 0.55;
    j.head.rotation.x += -pitch * 0.55;
    j.head.rotation.z += (c.headTilt ?? 0) + Math.sin(t * 0.6 + 1) * 0.01;
    // face
    const blink = s.blink ?? autoBlink(t, m.seed ?? 1, heavy ? 4.8 : 3.4);
    const lid = s.lid ?? m.lid ?? 0.85;
    const squint = clamp(c.squint ?? 0);
    const ex = clamp((yaw * 0.45) / 0.5, -1, 1), ey = clamp((pitch * 0.45) / 0.5, -1, 1);
    for (const e of [root.rig.eyeL, root.rig.eyeR]) {
      if (!e) continue;
      e.setLook?.(ex, ey);
      e.setLid?.(lerp(lerp(lid, 0.15, squint), -1, blink), lerp(-0.85, -0.55, squint + (c.grin ?? 0) * 0.5));
    }
    // two-bone arm IK toward world targets (c.ikL / c.ikR = { target: Vector3, w, twist })
    for (const [arm, fore, side, k] of [[j.armL, j.foreL, 1, "ikL"], [j.armR, j.foreR, -1, "ikR"]]) {
      const ik = c[k];
      if (!ik || !ik.target || !(ik.w > 0) || !arm) continue;
      solveArmIK(root, arm, fore, ik.target, this.upper, this.lower, clamp(ik.w), side, ik.twist ?? 0);
    }
    root.extra?.(root.rig, s, t, { p, mv, breathe, crouch });
  }
}

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qa = new THREE.Quaternion();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _ax = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);
/** Analytic 2-bone IK. Upper arm hangs along -Y; elbow bends about local X. */
function solveArmIK(root, arm, fore, target, a, b, w, side, twist) {
  root.updateMatrixWorld(true);
  const chest = arm.parent;
  _v1.copy(target);
  chest.worldToLocal(_v1);
  _v1.sub(arm.position);
  const L = Math.min(_v1.length(), (a + b) * 0.995);
  const dir = _v1.normalize();
  const cosA = clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1);
  const alpha = Math.acos(cosA);
  const cosE = clamp((a * a + b * b - L * L) / (2 * a * b), -1, 1);
  const bend = Math.PI - Math.acos(cosE);
  _q.setFromUnitVectors(DOWN, dir);
  _qa.setFromAxisAngle(dir, twist + side * 0.35);
  _q.premultiply(_qa);
  _q2.setFromAxisAngle(_ax.set(1, 0, 0), alpha);
  _q.multiply(_q2);
  arm.quaternion.slerp(_q, w);
  fore.rotation.x = THREE.MathUtils.lerp(fore.rotation.x, -bend, w);
  fore.rotation.y *= 1 - w; fore.rotation.z *= 1 - w;
}
