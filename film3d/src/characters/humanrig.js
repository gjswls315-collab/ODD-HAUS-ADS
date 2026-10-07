// Human controller for skinned GLB rigs (and procedural fallbacks with the same joint names).
// FK in character axes -> foot-planted leg IK -> foot roll -> optional arm IK -> face.
//
// state.custom (all optional):
//   crouch 0..1, spineBend, headTilt, grin 0..1, browUp, squint, weightShift -1..1,
//   armL / armR: { x, y, z, elbow, curl, spread, wrist, wristZ, twist, point }  (radians; x<0 = forward)
//   legL / legR: { x, z, y, knee, foot }   (foot offsets in metres, character space)
//   ikL / ikR:  { target: world Vector3, w, twist }
//   hold: { L: "fist"|"grip"|"open"|"point" , R: ... }
import * as THREE from "three";
import { PoseRig, AX } from "./pose.js";
import { BipedGait } from "./gait.js";
import { autoBlink, anim } from "./base.js";
import { clamp, lerp, noise1 } from "../core/util.js";

const TAU = Math.PI * 2;
const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();

export class HumanRigController {
  constructor(root) {
    this.root = root;
    const m = root.meta || {};
    this.m = m;
    this.pose = new PoseRig(root, root.rig.all);
    const P = this.pose;
    this.gait = new BipedGait(P, {
      strideK: m.strideK ?? 1.25, duty: m.duty ?? 0.62, lift: m.lift ?? 0.1,
      sway: m.sway ?? 0.03, hipYaw: m.hipYaw ?? 0.14, hipRoll: m.hipRoll ?? 0.05,
      heel: m.heel, heelStrike: m.heelStrike ?? 0.3, toeOff: m.toeOff ?? 0.55,
    });
    // measure the model's rest arm pose so gestures mean the same thing on any rig
    this.arm = {};
    for (const [sd, nm] of [[1, "Left"], [-1, "Right"]]) {
      const S = P.restPos(`${nm}Arm`), E = P.restPos(`${nm}ForeArm`), W = P.restPos(`${nm}Hand`);
      if (!S || !E || !W) continue;
      const u = _v.subVectors(E, S).normalize();
      const f = _w.subVectors(W, E).normalize();
      const abd = Math.atan2(Math.abs(u.x), -u.y);
      const flex = Math.atan2(u.z, -u.y);
      const bend = Math.acos(clamp(u.dot(f), -1, 1));
      const grip = P.restPos(`${nm}Grip`);
      this.arm[nm] = {
        sd, abd, flex, bend, upper: S.distanceTo(E), lower: E.distanceTo(W) + (grip ? W.distanceTo(grip) * 0.6 : 0.06),
        fingers: FINGERS.filter((f) => P.has(`${nm}${f}1`)),
      };
    }
    this.curlSign = this._fingerCurlSign();
    this.eyes = [root.rig.eyeL, root.rig.eyeR].filter(Boolean);
  }

  /** Which way a positive local-X rotation bends the fingers (toward the palm = +1). */
  _fingerCurlSign() {
    const P = this.pose;
    for (const nm of ["Left", "Right"]) {
      const b1 = P.get(`${nm}Index1`), b3 = P.get(`${nm}Index3`), grip = P.get(`${nm}Grip`), hand = P.get(`${nm}Hand`);
      if (!b1 || !b3 || !grip || !hand) continue;
      const before = new THREE.Vector3(), after = new THREE.Vector3(), g = new THREE.Vector3(), h = new THREE.Vector3();
      this.root.updateMatrixWorld(true);
      b3.getWorldPosition(before); grip.getWorldPosition(g); hand.getWorldPosition(h);
      const q0 = b1.quaternion.clone();
      b1.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(AX.X, 0.6));
      this.root.updateMatrixWorld(true);
      b3.getWorldPosition(after);
      b1.quaternion.copy(q0);
      this.root.updateMatrixWorld(true);
      // palm side = from the knuckle line toward the grip point
      const palm = g.sub(before).normalize();
      return after.sub(before).dot(palm) > 0 ? 1 : -1;
    }
    return 1;
  }

  _hand(nm, e, t) {
    const P = this.pose, a = this.arm[nm];
    if (!a || !a.fingers.length) return;
    const curl = clamp(e.curl ?? 0.25, -0.2, 1.2);
    const point = clamp(e.point ?? 0);
    const spread = e.spread ?? 0;
    const cs = this.curlSign;
    for (const f of a.fingers) {
      let c = curl;
      if (f === "Index") c = lerp(curl, 0.02, point);
      if (f === "Thumb") c = curl * 0.6 + point * 0.25;
      const amt = [0.95, 1.25, 1.0];
      for (let i = 1; i <= 3; i++) {
        const k = f === "Thumb" ? [0.45, 0.6, 0.7][i - 1] : amt[i - 1];
        const jitter = noise1(t * 0.7 + i + f.length, 3) * 0.04;
        P.local(`${nm}${f}${i}`, AX.X, cs * (c * k * 1.25 + jitter * (1 - c)));
      }
      if (spread && f !== "Thumb") {
        const s = { Index: 1, Middle: 0.3, Ring: -0.4, Pinky: -1 }[f];
        P.local(`${nm}${f}1`, AX.Z, spread * s * 0.18);
      }
    }
  }

  apply(root, s, t) {
    const P = this.pose, c = s.custom || {}, m = this.m;
    const heavy = m.heavy ?? 0;
    const seed = m.seed ?? 1;
    P.begin();
    const crouch = clamp(c.crouch ?? 0);
    const sol = this.gait.solve(s, { crouch });
    const pel = sol.pelvis, mv = sol.mv, ph = sol.phi;
    const breathe = anim.breathe(t, seed, heavy ? 0.9 : 1.3);
    const fr = clamp(s.freeze ?? 0);
    const ws = c.weightShift ?? 0;

    // ---------------- pelvis + spine (FK)
    P.move("Body", pel.x + ws * 0.035 + Math.sin(t * 0.7 + seed) * 0.004 * (1 - mv), pel.y + breathe * 0.0015, pel.z - crouch * 0.05);
    P.rot("Body", pel.pitch + crouch * 0.35 + (s.lean ?? 0) * 0.3, pel.yaw, pel.roll * (1 + heavy) + ws * 0.04);
    const bend = c.spineBend ?? 0;
    P.rot("Spine", bend * 0.45 + crouch * 0.25 - pel.pitch * 0.4 + fr * 0.05, -pel.yaw * 0.6, -pel.roll * 0.6 - ws * 0.02);
    P.rot("Chest", bend * 0.45 + crouch * 0.12 - breathe * 0.012 - fr * 0.06, -pel.yaw * 0.7, -pel.roll * 0.5 - Math.sin(TAU * ph) * 0.02 * heavy * mv);
    P.scale("Chest", 1 + breathe * 0.006);

    // ---------------- head: stabilise + look
    let yaw = 0, pitch = 0;
    if (s.look && s.lookAmt > 0) {
      root.updateMatrixWorld(true);
      _v.copy(s.look); root.worldToLocal(_v);
      const hp = P.restPos("Head") || _w.set(0, 1.4, 0);
      _v.sub(hp);
      yaw = clamp(Math.atan2(_v.x, _v.z), -1.3, 1.3) * s.lookAmt;
      pitch = clamp(Math.atan2(_v.y, Math.hypot(_v.x, _v.z)), -1.0, 0.8) * s.lookAmt;
    }
    const idle = (1 - mv) * (1 - fr);
    const iy = noise1(t * 0.23, seed + 4) * 0.12 * idle, ip = noise1(t * 0.19, seed + 9) * 0.06 * idle;
    const cancel = -(bend * 0.9 + crouch * 0.37 - pel.pitch * 0.4 + pel.pitch);
    P.rot("Neck", (-pitch - ip) * 0.4 + cancel * 0.45, (yaw + iy) * 0.4 + pel.yaw * 0.25, 0);
    P.rot("Head", (-pitch - ip) * 0.6 + cancel * 0.55, (yaw + iy) * 0.6, (c.headTilt ?? 0) + Math.sin(t * 0.6 + seed) * 0.012 + pel.roll * 0.4);

    // ---------------- arms (FK): relax from the modelling pose, counter-swing, gestures
    for (const nm of ["Left", "Right"]) {
      const a = this.arm[nm];
      if (!a) continue;
      const sd = a.sd;
      const e = c[nm === "Left" ? "armL" : "armR"] || {};
      const fwd = sol.fwd[nm === "Left" ? 1 : 0] ?? 0;                  // opposite leg leads the arm
      const swing = (0.38 - heavy * 0.14) * mv * (fwd * 0.9);
      const relax = 0.13 + heavy * 0.12;
      P.rot(`${nm}Shoulder`, 0, 0, sd * (fr * 0.06 + (e.shrug ?? 0)));
      P.rot(`${nm}Arm`, -swing - (e.x ?? 0) - a.flex * 0 + fr * 0.08, sd * (e.y ?? 0),
        sd * (relax - a.abd + (e.z ?? 0) + breathe * 0.008 + fr * 0.05));
      const elbow = (e.elbow ?? 0) + 0.12 + Math.max(0, fwd) * 0.32 * mv + fr * 0.3;
      P.rot(`${nm}ForeArm`, -(elbow - a.bend), sd * (e.twist ?? 0) * 0, 0);
      if (e.twist) P.local(`${nm}ForeArm`, AX.Y, sd * e.twist);
      P.rot(`${nm}Hand`, e.wrist ?? 0, 0, sd * (e.wristZ ?? 0));
      this._hand(nm, { curl: e.curl ?? (0.3 + fr * 0.3), spread: e.spread, point: e.point }, t);
    }
    P.commit();

    // ---------------- legs: planted feet via IK
    const legOff = (l) => {
      const o = c[l.side > 0 ? "legL" : "legR"];
      return o ? new THREE.Vector3(o.x ?? 0, o.y ?? 0, o.z ?? 0) : new THREE.Vector3();
    };
    this.gait.applyLegs(sol, { offset: legOff, kneeOut: 0.08 + crouch * 0.25 });

    // ---------------- arm IK (reach for props, gestures)
    for (const [nm, k] of [["Left", "ikL"], ["Right", "ikR"]]) {
      const ik = c[k];
      if (!ik || !ik.target || !(ik.w > 0) || !this.arm[nm]) continue;
      const a = this.arm[nm];
      const tgt = root.worldToLocal(ik.target.clone());
      const S = P.charPos(`${nm}Arm`);
      const pole = S.clone().add(new THREE.Vector3(a.sd * 0.5, -0.35 + (ik.elbowUp ?? 0), -0.45));
      // aim the grip point (not the wrist) at the target
      const grip = P.get(`${nm}Grip`);
      if (grip) {
        const gp = P.charPos(`${nm}Grip`), wp = P.charPos(`${nm}Hand`);
        tgt.sub(gp.sub(wp).multiplyScalar(0.8));
      }
      P.ik(`${nm}Arm`, `${nm}ForeArm`, `${nm}Hand`, tgt, pole, clamp(ik.w));
    }

    // ---------------- face
    const blink = s.blink ?? autoBlink(t, seed, heavy ? 4.8 : 3.4);
    const lid = s.lid ?? m.lid ?? 0.85;
    const squint = clamp(c.squint ?? 0);
    const ex = clamp(yaw * 0.6 / 0.5 + iy, -1, 1), ey = clamp(pitch * 0.6 / 0.5, -1, 1);
    for (const e of this.eyes) {
      const eye = e.userData.eye;
      if (!eye) continue;
      eye.setLook(ex, ey);
      eye.setLid(lerp(lerp(lerp(lid, 1, fr * 0.8), 0.2, squint), -1, blink), lerp(m.lowerLid ?? -0.85, -0.85, fr));
    }
    root.extra?.(root.rig, s, t, { p: ph * TAU, mv, breathe, crouch, pose: P });
    root.updateMatrixWorld(true);
  }
}
