// Buddy's controller for the sculpted GLB rig: four planted paws (lateral-sequence walk,
// diagonal trot), body height and pitch from what the legs reach, spine flex, head look/sniff,
// ears, tail, tie and tag secondary motion.
//
// state.custom: trot 0..1, sniff 0..1, earPerk 0..1, earsDown 0..1, tailWag 0..1, headTilt,
//               lie 0..1, pant 0..1
import * as THREE from "three";
import { PoseRig, AX } from "./pose.js";
import { autoBlink, anim } from "./base.js";
import { clamp, lerp, smooth, smoother, noise1 } from "../core/util.js";

const TAU = Math.PI * 2;
const frac = (x) => x - Math.floor(x);
const _q = new THREE.Quaternion();
const LEGS = [
  { k: "LegFL", front: true, side: 1, walk: 0.25, trot: 0.0 },
  { k: "LegFR", front: true, side: -1, walk: 0.75, trot: 0.5 },
  { k: "LegHL", front: false, side: 1, walk: 0.0, trot: 0.5 },
  { k: "LegHR", front: false, side: -1, walk: 0.5, trot: 0.0 },
];

export class DogRigController {
  constructor(root) {
    this.root = root;
    this.m = root.meta || {};
    const P = this.pose = new PoseRig(root, root.rig.all);
    this.legs = LEGS.filter((l) => P.has(l.k) && P.has(`${l.k}Lower`) && P.has(`${l.k}Paw`)).map((l) => {
      const top = P.restPos(l.k).clone(), joint = P.restPos(`${l.k}Lower`).clone(), paw = P.restPos(`${l.k}Paw`).clone();
      return { ...l, top, joint, paw, len: top.distanceTo(joint) + joint.distanceTo(paw) };
    });
    const f = this.legs.filter((l) => l.front), h = this.legs.filter((l) => !l.front);
    this.span = f.length && h.length ? Math.abs(f[0].top.z - h[0].top.z) : 0.3;
    this.eyes = [root.rig.eyeL, root.rig.eyeR].filter(Boolean);
  }

  _paw(l, phi, S, duty, lift) {
    const z0 = l.paw.z;
    if (phi < duty) {
      const u = phi / duty;
      const late = smooth((u - 0.55) / 0.45);
      return { p: new THREE.Vector3(l.paw.x, l.paw.y + late * 0.012, z0 + S * duty * (0.5 - u)), pitch: -late * 0.7, planted: 1 };
    }
    const v = (phi - duty) / (1 - duty);
    const p = new THREE.Vector3(l.paw.x, l.paw.y, lerp(z0 - S * duty * 0.5, z0 + S * duty * 0.5, smoother(v)));
    p.y += lift * Math.sin(Math.PI * Math.pow(v, 0.75)) + 0.012 * (1 - smooth(v * 3));
    const fold = Math.sin(Math.PI * Math.min(1, v * 1.25));
    return { p, pitch: -0.7 * (1 - smooth(v * 2)) - (l.front ? 1.1 : 0.7) * fold + 0.15 * smooth((v - 0.8) / 0.2), planted: 0 };
  }

  apply(root, s, t) {
    const P = this.pose, c = s.custom || {}, m = this.m;
    P.begin();
    const mv = clamp(s.moving), trot = clamp(c.trot ?? 0), lie = clamp(c.lie ?? 0);
    const S = lerp(m.walkStride ?? 0.36, m.trotStride ?? 0.56, trot);
    const duty = lerp(0.66, 0.46, trot);
    const lift = lerp(0.032, 0.05, trot);
    const ph = s.dist / S;
    const breathe = anim.breathe(t, 2, c.pant ? 3.4 : 1.1);

    // paw targets
    const paws = this.legs.map((l) => {
      const phi = frac(ph + lerp(l.walk, l.trot, trot));
      const g = this._paw(l, phi, S, duty, lift);
      const rest = l.paw.clone();
      return { l, p: rest.lerp(g.p, mv), pitch: g.pitch * mv };
    });
    // body height + pitch from reach (front pair / hind pair)
    const pairDy = (front) => {
      const opts = paws.filter((q) => q.l.front === front).map((q) => {
        const L = q.l.len * 0.97;
        const dz = q.l.top.z - q.p.z, dx = q.l.top.x - q.p.x;
        return q.p.y + Math.sqrt(Math.max(1e-6, L * L - dx * dx - dz * dz)) - q.l.top.y;
      });
      if (!opts.length) return 0;
      const k = 0.006;
      return Math.min(0, -k * Math.log(opts.reduce((a, v) => a + Math.exp(-v / k), 0)));
    };
    const dyF = pairDy(true), dyH = pairDy(false);
    const phL = frac(ph);
    const sway = Math.sin(TAU * phL) * 0.006 * mv;
    P.move("Body", sway, (dyF + dyH) * 0.5 - lie * 0.16 + breathe * 0.001, 0);
    P.rot("Body", -Math.atan2(dyF - dyH, this.span) + lie * 0.03, Math.sin(TAU * phL) * 0.04 * mv, Math.sin(TAU * phL) * 0.035 * mv);
    P.rot("Chest", 0, Math.sin(TAU * phL + 1.2) * 0.05 * mv, 0);
    P.rot("Hips", 0, -Math.sin(TAU * phL + 1.2) * 0.05 * mv, 0);
    P.scale("Chest", 1 + breathe * 0.012, 1 + breathe * 0.012, 1);

    // head: look, sniff, tilt
    let yaw = 0, pitch = 0;
    if (s.look && s.lookAmt > 0) {
      const v = root.worldToLocal(s.look.clone()).sub(P.restPos("Head") || new THREE.Vector3(0, 0.45, 0.25));
      yaw = clamp(Math.atan2(v.x, v.z), -1.2, 1.2) * s.lookAmt;
      pitch = clamp(Math.atan2(v.y, Math.hypot(v.x, v.z)), -0.7, 0.8) * s.lookAmt;
    }
    const sniff = clamp(c.sniff ?? 0);
    const sn = sniff * (0.5 + 0.5 * Math.sin(t * 20)) * (noise1(t * 3, 4) > -0.2 ? 1 : 0);
    P.rot("Neck", -pitch * 0.5 + sniff * 0.75 + lie * 0.25 - Math.sin(2 * TAU * phL) * 0.03 * mv, yaw * 0.6, 0);
    P.rot("Head", -pitch * 0.5 + sniff * 0.3 + lie * 0.08 + sn * 0.02, yaw * 0.4, (c.headTilt ?? 0) * 0.4 + Math.sin(t * 0.7) * 0.02);
    P.rot("Jaw", (c.pant ? 0.12 + 0.05 * Math.sin(t * 20) : 0), 0, 0);

    // ears: perk (lift out), down (pinned back), bounce
    const perk = clamp(c.earPerk ?? 0), down = clamp(c.earsDown ?? 0);
    for (const [ear, sd] of [["EarL", 1], ["EarR", -1]]) {
      const bounce = Math.sin(2 * TAU * phL - 1.1) * 0.16 * mv * (1 + trot);
      P.rot(ear, -perk * 0.35 + down * 0.5 + bounce, sd * perk * 0.2, sd * (perk * 0.65 - down * 0.25 + bounce * 0.3));
    }
    // tail: wag about the vertical, droop when scared or lying
    const wag = clamp(c.tailWag ?? 0.15);
    const tdown = down * 0.9 + lie * 0.6;
    const tails = ["Tail", "Tail1", "Tail2", "Tail3"];
    tails.forEach((n, i) => {
      P.rot(n, -tdown * (i ? 0.25 : 0.9) + Math.sin(2 * TAU * phL - i) * 0.06 * mv,
        wag * (i ? 0.32 : 0.5) * Math.sin(t * 13 - i * 0.9), 0);
    });
    P.rot("Tie", Math.sin(2 * TAU * phL - 1.4) * 0.12 * mv + sniff * 0.4 + lie * 0.3, 0, Math.sin(TAU * phL - 1.2) * 0.1 * mv);
    P.rot("Tag", Math.sin(2 * TAU * phL - 0.9) * 0.25 * mv, 0, Math.sin(t * 2) * 0.05 + Math.sin(TAU * phL) * 0.2 * mv);
    // lie down: fold legs (FK) - IK is blended out below
    if (lie > 0) {
      for (const l of this.legs) {
        if (l.front) { P.rot(l.k, -1.25 * lie, 0, 0); P.rot(`${l.k}Lower`, 0.2 * lie, 0, 0); P.rot(`${l.k}Paw`, 1.0 * lie, 0, 0); }
        else { P.rot(l.k, -0.9 * lie, 0, 0); P.rot(`${l.k}Lower`, 2.1 * lie, 0, 0); P.rot(`${l.k}Paw`, -0.9 * lie, 0, 0); }
      }
    }
    P.commit();

    // legs: IK to planted paws, then paw pitch
    const w = 1 - lie;
    for (const q of paws) {
      const l = q.l;
      const pole = l.joint.clone().add(new THREE.Vector3(l.side * 0.02, 0, l.front ? -0.5 : 0.5));
      P.ik(l.k, `${l.k}Lower`, `${l.k}Paw`, q.p, pole, w);
      _q.setFromAxisAngle(AX.X, -q.pitch);
      P.orient(`${l.k}Paw`, _q, w);
    }

    // eyes
    const blink = s.blink ?? autoBlink(t, 5, 4.2);
    const ex = clamp((yaw * 0.6) / 0.5, -1, 1), ey = clamp((pitch * 0.5 - sniff * 0.3) / 0.5, -1, 1);
    for (const e of this.eyes) {
      const eye = e.userData.eye;
      if (!eye) continue;
      eye.setLook(ex, ey);
      eye.setLid(lerp(lerp(0.8, 0.35, down * 0.6 + lie * 0.5), -1, blink), -0.8);
    }
    root.updateMatrixWorld(true);
  }
}
