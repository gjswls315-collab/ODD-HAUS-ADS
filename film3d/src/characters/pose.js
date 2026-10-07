// Rest-orientation-agnostic posing for any rig (procedural groups or GLB bones).
//
// Rotations are written in CHARACTER axes (x = character's left, y = up, z = forward) and
// applied in each joint's parent frame as it was at rest, so the same numbers pose a GLB
// bone (whatever its bone-roll) and a procedural pivot identically. IK works on world
// positions only, so it never needs to know a bone's local axes either.
import * as THREE from "three";

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _d = new THREE.Vector3(), _t = new THREE.Vector3(), _k = new THREE.Vector3(), _p = new THREE.Vector3();
const _m = new THREE.Matrix4();

export class PoseRig {
  /** root: CharacterRoot (at identity when constructed), nodes: Map(lowercase name -> Object3D) */
  constructor(root, nodes) {
    this.root = root;
    this.nodes = nodes;
    this.j = new Map();
    root.updateMatrixWorld(true);
    _m.copy(root.matrixWorld).invert();
    const rootQ = new THREE.Quaternion();
    root.getWorldQuaternion(rootQ).invert();
    for (const [name, node] of nodes) {
      if (!node.parent) continue;
      const pq = new THREE.Quaternion();
      node.parent.getWorldQuaternion(pq);
      pq.premultiply(rootQ);                       // parent rest orientation in character space
      const ps = new THREE.Vector3();
      node.parent.getWorldScale(ps);
      const wq = new THREE.Quaternion();
      node.getWorldQuaternion(wq);
      wq.premultiply(rootQ);                       // own rest orientation in character space
      this.j.set(name, {
        node, q0: node.quaternion.clone(), p0: node.position.clone(), s0: node.scale.clone(),
        P0: pq, P0i: pq.clone().invert(), W0: wq, pscale: ps.x / root.scale.x,
        off: new THREE.Quaternion(), dp: new THREE.Vector3(), dirty: false,
      });
    }
  }

  has(name) { return this.j.has(name.toLowerCase()); }
  get(name) { return this.j.get(name.toLowerCase())?.node; }

  begin() {
    for (const r of this.j.values()) {
      r.node.quaternion.copy(r.q0); r.node.position.copy(r.p0); r.node.scale.copy(r.s0);
      r.off.identity(); r.dp.set(0, 0, 0); r.dirty = false;
    }
  }

  /** Accumulate a character-axis rotation (radians, XYZ order applied as Z*Y*X) on a joint. */
  rot(name, x = 0, y = 0, z = 0, order = "YXZ") {
    const r = this.j.get(name.toLowerCase());
    if (!r || (x === 0 && y === 0 && z === 0)) return;
    _e.set(x, y, z, order);
    _q.setFromEuler(_e);
    r.off.premultiply(_q);
    r.dirty = true;
  }

  /** Rotate about a character-space axis. */
  rotAxis(name, axis, angle) {
    const r = this.j.get(name.toLowerCase());
    if (!r || angle === 0) return;
    _q.setFromAxisAngle(axis, angle);
    r.off.premultiply(_q);
    r.dirty = true;
  }

  /** Translate a joint in character space (metres). */
  move(name, x = 0, y = 0, z = 0) {
    const r = this.j.get(name.toLowerCase());
    if (!r) return;
    r.dp.x += x; r.dp.y += y; r.dp.z += z;
    r.dirty = true;
  }

  scale(name, sx, sy = sx, sz = sx) {
    const r = this.j.get(name.toLowerCase());
    if (!r) return;
    r.node.scale.set(r.s0.x * sx, r.s0.y * sy, r.s0.z * sz);
  }

  /** Rotation about the joint's OWN local axis (fingers: bone X = curl axis). */
  local(name, axis, angle) {
    const r = this.j.get(name.toLowerCase());
    if (!r || angle === 0) return;
    r.localQ = r.localQ || new THREE.Quaternion();
    if (!r.localDirty) { r.localQ.identity(); r.localDirty = true; }
    _q.setFromAxisAngle(axis, angle);
    r.localQ.multiply(_q);
    r.dirty = true;
  }

  commit() {
    for (const r of this.j.values()) {
      if (!r.dirty) continue;
      // q = P0^-1 * off * P0 * q0
      _q.copy(r.P0i).multiply(r.off).multiply(r.P0).multiply(r.q0);
      if (r.localDirty) { _q.multiply(r.localQ); r.localDirty = false; }
      r.node.quaternion.copy(_q);
      if (r.dp.lengthSq() > 0) {
        _p.copy(r.dp).applyQuaternion(r.P0i).multiplyScalar(1 / r.pscale);
        r.node.position.copy(r.p0).add(_p);
      }
      r.dirty = false;
    }
    this.root.updateMatrixWorld(true);
  }

  /** World position of a joint as a character-space point. */
  charPos(name, out = new THREE.Vector3()) {
    const n = this.get(name);
    if (!n) return out.set(0, 0, 0);
    n.getWorldPosition(out);
    return this.root.worldToLocal(out);
  }

  /** Rest position (character space) of a joint, measured once. */
  restPos(name) {
    const r = this.j.get(name.toLowerCase());
    if (!r) return null;
    if (!r.rest) {
      r.rest = new THREE.Vector3();
      r.node.getWorldPosition(r.rest);
      this.root.worldToLocal(r.rest);
    }
    return r.rest;
  }

  /** Apply a world-space rotation delta to a joint (after commit). */
  _worldDelta(node, dq, w = 1) {
    node.parent.getWorldQuaternion(_q2);
    _q3.copy(_q2).invert().multiply(dq).multiply(_q2).multiply(node.quaternion);
    if (w >= 1) node.quaternion.copy(_q3);
    else node.quaternion.slerp(_q3, w);
    node.updateMatrixWorld(true);
  }

  /**
   * Two-bone IK. upper/lower/end are joint names; target and pole are CHARACTER-space
   * (pole = point the knee/elbow should bend toward). w blends from the FK pose.
   */
  ik(upper, lower, end, target, pole, w = 1) {
    const A = this.get(upper), B = this.get(lower), C = this.get(end);
    if (!A || !B || !C || w <= 0) return false;
    A.getWorldPosition(_a); B.getWorldPosition(_b); C.getWorldPosition(_c);
    const la = _a.distanceTo(_b), lb = _b.distanceTo(_c);
    _t.copy(target); this.root.localToWorld(_t);
    _p.copy(pole); this.root.localToWorld(_p);
    _d.subVectors(_t, _a);
    let L = _d.length();
    L = THREE.MathUtils.clamp(L, Math.abs(la - lb) + 1e-4, (la + lb) * 0.9999);
    _d.normalize();
    // knee position
    const cosA = THREE.MathUtils.clamp((la * la + L * L - lb * lb) / (2 * la * L), -1, 1);
    const sinA = Math.sqrt(1 - cosA * cosA);
    _k.subVectors(_p, _a);
    _k.addScaledVector(_d, -_k.dot(_d));
    if (_k.lengthSq() < 1e-10) _k.set(0, 0, 1).applyQuaternion(this.root.quaternion);
    _k.normalize();
    const knee = _k.multiplyScalar(la * sinA).addScaledVector(_d, la * cosA).add(_a);
    // aim upper
    const from = new THREE.Vector3().subVectors(_b, _a).normalize();
    const to = new THREE.Vector3().subVectors(knee, _a).normalize();
    _q.setFromUnitVectors(from, to);
    this._worldDelta(A, _q, w);
    // aim lower
    B.getWorldPosition(_b); C.getWorldPosition(_c);
    _t.copy(target); this.root.localToWorld(_t);
    from.subVectors(_c, _b).normalize();
    to.subVectors(_t, _b).normalize();
    _q.setFromUnitVectors(from, to);
    this._worldDelta(B, _q, w);
    return true;
  }

  /** Orient a joint so its character-space orientation = rot * rest orientation (feet, head). */
  orient(name, rot, w = 1) {
    const r = this.j.get(name.toLowerCase());
    if (!r || w <= 0) return;
    const n = r.node;
    this.root.getWorldQuaternion(_q);
    _q.multiply(rot).multiply(r.W0);              // desired world orientation
    n.parent.getWorldQuaternion(_q2);
    _q3.copy(_q2).invert().multiply(_q);
    if (w >= 1) n.quaternion.copy(_q3); else n.quaternion.slerp(_q3, w);
    n.updateMatrixWorld(true);
  }
}

export const AX = { X: new THREE.Vector3(1, 0, 0), Y: new THREE.Vector3(0, 1, 0), Z: new THREE.Vector3(0, 0, 1) };
