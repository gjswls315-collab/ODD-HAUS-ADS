// Foot-planted locomotion. Each foot is either PLANTED (fixed on the floor while the body
// passes over it, rolling heel -> flat -> toe) or SWINGING to the next footprint. Everything
// is a pure function of distance travelled, so feet never skate and any frame can be
// rendered in any order. The pelvis height comes from what the legs can actually reach,
// which produces the natural down-on-contact / up-on-passing walk rhythm.
import * as THREE from "three";
import { clamp, lerp, smooth, smoother } from "../core/util.js";

const TAU = Math.PI * 2;
const frac = (x) => x - Math.floor(x);
const _q = new THREE.Quaternion();
const AXX = new THREE.Vector3(1, 0, 0);

function rotX(v, a) {
  // rotate vector about +X by angle a (character space)
  const c = Math.cos(a), s = Math.sin(a);
  return new THREE.Vector3(v.x, v.y * c - v.z * s, v.y * s + v.z * c);
}

/**
 * o: { legs: [{ hip, knee, ankle, toe?, side }], heel, ball, strideK, lift, duty, sway, hipYaw }
 * Measures leg geometry from the rest pose of `pose` (a PoseRig).
 */
export class BipedGait {
  constructor(pose, o = {}) {
    this.pose = pose;
    this.o = o;
    this.legs = (o.legs || [
      { hip: "LeftLeg", knee: "LeftShin", ankle: "LeftFoot", toe: "LeftToe", side: 1 },
      { hip: "RightLeg", knee: "RightShin", ankle: "RightFoot", toe: "RightToe", side: -1 },
    ]).filter((l) => pose.has(l.hip) && pose.has(l.knee) && pose.has(l.ankle));
    for (const l of this.legs) {
      l.H = pose.restPos(l.hip).clone();
      l.K = pose.restPos(l.knee).clone();
      l.A = pose.restPos(l.ankle).clone();
      l.len = l.H.distanceTo(l.K) + l.K.distanceTo(l.A);
      l.ah = Math.max(l.A.y, 0.002);
      const ball = o.ball ?? (l.toe && pose.has(l.toe) ? pose.restPos(l.toe).z - l.A.z : l.len * 0.25);
      l.hv = new THREE.Vector3(0, -l.ah, -(o.heel ?? l.len * 0.12));
      l.bv = new THREE.Vector3(0, -l.ah, ball);
    }
    this.legLen = this.legs.length ? this.legs.reduce((a, l) => a + l.len, 0) / this.legs.length : 0.1;
    this.stride = o.stride ?? this.legLen * (o.strideK ?? 1.3);
  }

  /** Ankle target + foot pitch for one leg at phase phi (0..1). */
  _foot(l, phi, S, duty, lift, ps, po) {
    const z0 = l.A.z, x0 = l.A.x;
    const R = (p) => -p; // pitch>0 = toes up -> rotation about +X by -p
    if (phi < duty) {
      const u = phi / duty;
      const F = new THREE.Vector3(x0, l.ah, z0 + S * duty * (0.5 - u));
      const u1 = 0.16, u2 = 0.58;
      if (u < u1) {
        const p = ps * (1 - u / u1) ** 2;
        const piv = F.clone().add(l.hv);
        return { ankle: piv.sub(rotX(l.hv, R(p))), pitch: p, toe: 0, planted: 1 };
      }
      if (u > u2) {
        const k = (u - u2) / (1 - u2);
        const p = -po * k ** 1.6;
        const piv = F.clone().add(l.bv);
        return { ankle: piv.sub(rotX(l.bv, R(p))), pitch: p, toe: po * 0.7 * k ** 1.6, planted: 1 };
      }
      return { ankle: F, pitch: 0, toe: 0, planted: 1 };
    }
    const v = (phi - duty) / (1 - duty);
    const Fs = new THREE.Vector3(x0, l.ah, z0 - S * duty * 0.5);
    const As = Fs.clone().add(l.bv).sub(rotX(l.bv, R(-po)));
    const Fe = new THREE.Vector3(x0, l.ah, z0 + S * duty * 0.5);
    const Ae = Fe.clone().add(l.hv).sub(rotX(l.hv, R(ps)));
    const e = smoother(v);
    const ankle = As.lerp(Ae, e);
    ankle.y += lift * Math.sin(Math.PI * Math.pow(v, 0.8));
    const pitch = lerp(-po, ps, smooth(v * 1.15)) + Math.sin(Math.PI * v) * ps * 0.4;
    return { ankle, pitch, toe: po * 0.7 * (1 - smooth(v * 2.5)), planted: 0 };
  }

  /**
   * s: CharacterState. Returns { feet: [{ankle, pitch, toe}], pelvis: {x, y, z, yaw, roll, pitch}, phi, fwd: [-1..1] per leg }
   * extra: { crouch, scale (stride multiplier) }
   */
  solve(s, extra = {}) {
    const o = this.o;
    const mv = clamp(s.moving);
    const run = clamp(s.run ?? 0);
    const S = this.stride * (1 + run * 0.55) * (extra.strideMul ?? 1);
    const duty = lerp(o.duty ?? 0.62, 0.38, run);
    const lift = this.legLen * (o.lift ?? 0.11) * (1 + run * 0.8);
    const ps = o.heelStrike ?? 0.32, po = (o.toeOff ?? 0.62) * (1 + run * 0.3);
    const ph = s.dist / S;
    const feet = [], fwd = [];
    for (const l of this.legs) {
      const phi = frac(ph + (l.side > 0 ? 0 : 0.5));
      const g = this._foot(l, phi, S, duty, lift, ps, po);
      const rest = new THREE.Vector3(l.A.x, l.A.y, l.A.z);
      // narrower track while walking
      g.ankle.x = lerp(l.A.x, l.A.x * (1 - 0.18 * mv), 1);
      const a = rest.lerp(g.ankle, mv);
      feet.push({ ankle: a, pitch: g.pitch * mv, toe: g.toe * mv, planted: g.planted, leg: l });
      fwd.push((a.z - l.A.z) / Math.max(1e-4, S * duty * 0.5));
    }
    // pelvis: as high as both legs allow (slightly soft knees), smooth-min across legs
    const crouch = clamp(extra.crouch ?? 0);
    const kSoft = this.legLen * 0.03;
    let dy = 0;
    if (feet.length) {
      const opts = feet.map((f) => {
        const L = f.leg.len * (0.985 - 0.04 * mv);
        const dx = f.leg.H.x - f.ankle.x, dz = f.leg.H.z - f.ankle.z;
        const h = Math.sqrt(Math.max(1e-6, L * L - dx * dx - dz * dz));
        return f.ankle.y + h - f.leg.H.y;
      });
      dy = -kSoft * Math.log(opts.reduce((acc, v) => acc + Math.exp(-v / kSoft), 0));
      dy = Math.min(dy, 0);
    }
    const phL = frac(ph);
    const pelvis = {
      x: (o.sway ?? 0.022) * this.legLen * Math.sin(TAU * phL) * mv,
      y: dy - crouch * this.legLen * 0.52,
      z: 0,
      yaw: -(o.hipYaw ?? 0.13) * Math.cos(TAU * phL) * mv,
      roll: (o.hipRoll ?? 0.05) * Math.sin(TAU * phL) * mv,
      pitch: 0.04 * mv + run * 0.12,
    };
    return { feet, pelvis, phi: phL, fwd, mv, run, S };
  }

  /** Drive the legs of a PoseRig: IK to the ankle targets, then roll the feet. Call after commit(). */
  applyLegs(sol, opts = {}) {
    const pose = this.pose;
    for (const f of sol.feet) {
      const l = f.leg;
      const tgt = f.ankle.clone();
      if (opts.offset) tgt.add(opts.offset(l));
      const pole = new THREE.Vector3(l.K.x + l.side * (opts.kneeOut ?? 0.02) * l.len, l.K.y, l.K.z + l.len * 1.5);
      pose.ik(l.hip, l.knee, l.ankle, tgt, pole, 1);
      _q.setFromAxisAngle(AXX, -f.pitch + (opts.footPitch ? opts.footPitch(l) : 0));
      pose.orient(l.ankle, _q);
      if (l.toe && pose.has(l.toe)) {
        _q.setFromAxisAngle(AXX, -(f.pitch + f.toe));     // toes stay on the floor through toe-off
        pose.orient(l.toe, _q);
      }
    }
  }
}
