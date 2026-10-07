// Character architecture:
//   CharacterRoot (world placement)
//   ├─ VisualModel  (procedural model now, chr_<id>.glb later — same node names)
//   └─ AnimationController (drives named rig parts; never touches primitives directly)
// Film choreography only ever writes a CharacterState and calls apply().
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { contactShadow } from "../core/geo.js";
import { prepareGLB } from "./glb.js";
import { clamp, lerp, noise1, fbm1, TAU, remap } from "../core/util.js";

/** Standard rig node names (procedural builders and GLB files both use these). */
export const RIG_NAMES = {
  pivot: "AnimationPivot", body: "Body", head: "Head", neck: "Neck", props: "Props",
  eyeL: "EyeL", eyeR: "EyeR",
  armL: "LeftArm", foreL: "LeftForeArm", handL: "LeftHand",
  armR: "RightArm", foreR: "RightForeArm", handR: "RightHand",
  legL: "LeftLeg", shinL: "LeftShin", footL: "LeftFoot",
  legR: "RightLeg", shinR: "RightShin", footR: "RightFoot",
};

export function defaultState() {
  return {
    pos: new THREE.Vector3(), yaw: 0,
    dist: 0, moving: 0, run: 0, // locomotion: metres travelled, 0..1 weight, 0..1 run blend
    look: null, lookAmt: 0,     // world-space look target
    freeze: 0, crouch: 0, lean: 0, tremble: 0,
    blink: null, lid: null,     // null = automatic
    custom: {},
  };
}

/** Collect named nodes from any Object3D (procedural or GLB). */
export function mapRig(object) {
  const rig = {};
  const lookup = new Map();
  object.traverse((o) => { if (o.name) lookup.set(o.name.toLowerCase(), o); });
  for (const [k, name] of Object.entries(RIG_NAMES)) {
    const n = lookup.get(name.toLowerCase());
    if (n) rig[k] = n;
  }
  rig.all = lookup;
  return rig;
}

/** Snapshot rest transforms so controllers can write absolute poses every frame. */
export function captureRest(object) {
  object.traverse((o) => {
    o.userData.rest = { p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone() };
  });
}

export function resetToRest(object) {
  object.traverse((o) => {
    const r = o.userData.rest;
    if (!r) return;
    o.position.copy(r.p); o.rotation.copy(r.r); o.scale.copy(r.s);
  });
}

/** Deterministic blink: returns 0 (open) .. 1 (closed). */
export function autoBlink(t, seed = 1, period = 3.6) {
  const p = period + (seed % 5) * 0.37;
  const k = Math.floor((t + seed * 1.7) / p);
  const jitter = (noise1(k * 3.1, seed) * 0.5 + 0.5) * 0.8;
  const ph = ((t + seed * 1.7) % p) - jitter;
  if (ph < 0 || ph > 0.16) return 0;
  return Math.sin((ph / 0.16) * Math.PI);
}

const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();

/** Look target -> local yaw/pitch (radians) relative to a node's parent frame. */
export function lookAngles(node, target) {
  node.parent.updateWorldMatrix(true, false);
  _m.copy(node.parent.matrixWorld).invert();
  _v.copy(target).applyMatrix4(_m).sub(node.position);
  const yaw = Math.atan2(_v.x, _v.z);
  const pitch = Math.atan2(_v.y, Math.hypot(_v.x, _v.z));
  return { yaw, pitch };
}

export class CharacterRoot extends THREE.Group {
  constructor(def) {
    super();
    this.def = def;
    this.name = `CharacterRoot_${def.id}`;
    this.state = defaultState();
    this.source = "procedural";
    this.shadowBlob = contactShadow(def.shadow?.[0] ?? def.height * 0.35, def.shadow?.[1] ?? def.height * 0.3, def.shadow?.[2] ?? 0.55);
    this.add(this.shadowBlob);
  }

  setVisual(visual, rig, meta, source) {
    if (this.visual) this.remove(this.visual);
    this.visual = visual;
    this.visual.name = "VisualModel";
    this.rig = rig;
    this.meta = meta || {};
    this.source = source;
    this.add(visual);
    captureRest(visual);
  }

  apply(t) {
    const s = this.state;
    this.position.copy(s.pos);
    this.rotation.set(0, s.yaw, 0);
    resetToRest(this.visual);
    this.controller?.apply(this, s, t);
    this.updateMatrixWorld(true);
  }
}

const loader = new GLTFLoader();

/**
 * GLB-first loader. If assets/chr_<id>.glb exists it is used (scaled to the
 * character's height, rig mapped by node name); otherwise the procedural model.
 */
/**
 * Fetch + parse `<name>.glb`, falling back to `<name>.gltf.json` (the same model as glTF JSON with
 * embedded buffers, for hosts that only serve web types). Returns null if neither exists.
 */
export async function fetchModel(assetBase, name) {
  for (const ext of [".glb", ".gltf.json"]) {
    try {
      const res = await fetch(`${assetBase}${name}${ext}`);
      const type = res.headers.get("content-type") || "";
      if (!res.ok || type.includes("text/html")) continue;
      const data = ext === ".glb" ? await res.arrayBuffer() : await res.text();
      return await loader.parseAsync(data, assetBase);
    } catch (e) { /* try the next form */ }
  }
  return null;
}

export async function loadCharacter(def, buildProcedural, Controller, { assetBase = "./assets/", tryGLB = true, GLBController = null, glbExtra = null } = {}) {
  const root = new CharacterRoot(def);
  let Ctl = Controller;
  if (tryGLB) {
    try {
      const gltf = await fetchModel(assetBase, `chr_${def.id}`);
      if (gltf) {
        const vis = gltf.scene;
        let modelledHeight = 0;
        vis.traverse((o) => { if (o.userData?.height) modelledHeight = o.userData.height; });
        if (!modelledHeight) {
          // foreign GLB: fit to the character's height
          const box = new THREE.Box3().setFromObject(vis);
          const h = box.max.y - box.min.y;
          if (h > 0) vis.scale.multiplyScalar(def.height / h);
        }
        prepareGLB(vis, def);
        root.setVisual(vis, mapRig(vis), { stride: def.height * 0.9, ...(def.glbMeta || {}) }, "glb");
        if (GLBController) Ctl = GLBController;
        root.extra = glbExtra ? glbExtra(root) : null;
      }
    } catch (e) {
      console.warn(`GLB ${def.id}:`, e);
      if (root.visual) { root.remove(root.visual); root.visual = null; }
    }
  }
  if (!root.visual) {
    const built = buildProcedural(def);
    root.setVisual(built.model, mapRig(built.model), built.meta, "procedural");
    root.extra = built.extra || null;
  }
  root.controller = new Ctl(root);
  root.apply(0);
  return root;
}

// ---------------------------------------------------------------------------
/** Shared helpers for controllers. */
export const anim = {
  breathe(t, seed, rate = 1.6) { return Math.sin(t * rate * TAU * 0.5 + seed); },
  tremble(t, seed, amt) { return amt * (noise1(t * 38, seed) * 0.6 + noise1(t * 61, seed + 3) * 0.4); },
  idleLook(t, seed) { return { x: fbm1(t * 0.35, seed) * 0.6, y: fbm1(t * 0.31, seed + 9) * 0.3 }; },
};

/**
 * Small biped controller for the object characters (Vin, Picker, A.A., Locke, Rex).
 * meta: { legLen, stepAngle, seed, heavy (0..1), bodyNode, faceYawLimit }
 */
export class TinyController {
  constructor(root) {
    this.root = root;
    const m = root.meta;
    this.seed = m.seed ?? 1;
    this.legLen = m.legLen ?? 0.06;
    this.A = m.stepAngle ?? 0.6;
    this.stride = 4 * this.legLen * Math.sin(this.A) * (m.strideScale ?? 1.15);
  }

  apply(root, s, t) {
    const r = root.rig;
    const m = root.meta;
    const heavy = m.heavy ?? 0;
    const cyc = s.dist / this.stride;
    const p = cyc * TAU;
    const mv = clamp(s.moving);
    const run = clamp(s.run);
    const A = this.A * (1 + run * 0.35) * mv;
    const fr = clamp(s.freeze);
    const breathe = anim.breathe(t, this.seed, 1.4 - heavy * 0.4);

    // legs
    for (const [leg, shin, foot, off] of [[r.legL, r.shinL, r.footL, 0], [r.legR, r.shinR, r.footR, Math.PI]]) {
      if (!leg) continue;
      const ph = p + off;
      const th = A * Math.sin(ph);
      leg.rotation.x += -th;
      const knee = (0.9 + run * 0.6) * mv * Math.max(0, Math.cos(ph)) ** 1.5 + fr * 0.35 + s.crouch * 0.9;
      if (shin) shin.rotation.x += knee;
      leg.rotation.x += -(fr * 0.18 + s.crouch * 0.45);
      if (foot) foot.rotation.x += th * 0.6 - knee * 0.5 + (fr * 0.18 + s.crouch * 0.45);
    }
    // body bob / sway / lean
    if (r.pivot) {
      const bob = (1 + Math.cos(2 * p)) * 0.5;
      r.pivot.position.y += (bob * 0.012 * (1 + run) * mv - 0.004 * mv) * (this.legLen / 0.06)
        - (fr * 0.08 + s.crouch * 0.28) * this.legLen;
      r.pivot.rotation.z += Math.sin(p) * 0.06 * mv * (1 + heavy * 0.8);
      r.pivot.rotation.x += (0.06 * mv + run * 0.12 + s.lean) * (1 - heavy * 0.4);
      r.pivot.rotation.y += Math.sin(p) * 0.05 * mv;
      const sq = 1 + breathe * 0.012 * (1 - mv) - fr * 0.04 + (bob - 0.5) * 0.03 * mv;
      r.pivot.scale.y *= sq;
      r.pivot.scale.x *= 1 + (1 - sq) * 0.5;
      r.pivot.scale.z *= 1 + (1 - sq) * 0.5;
      const tr = anim.tremble(t, this.seed, s.tremble * 0.04);
      r.pivot.rotation.z += tr;
      r.pivot.position.x += tr * 0.02;
    }
    // arms: counter-swing, freeze tucks them up
    for (const [arm, fore, hand, side, off] of [[r.armL, r.foreL, r.handL, 1, Math.PI], [r.armR, r.foreR, r.handR, -1, 0]]) {
      if (!arm) continue;
      const sw = Math.sin(p + off) * (0.7 + run * 0.4) * mv;
      const idle = Math.sin(t * 1.3 + this.seed + side) * 0.05 * (1 - mv);
      arm.rotation.x += -sw + idle - fr * 1.1;
      arm.rotation.z += side * (0.25 + 0.15 * mv + fr * 0.2 + breathe * 0.02);
      if (fore) fore.rotation.x += -(0.35 + run * 0.6) * mv - fr * 1.2 - 0.15;
      if (hand?.setCurl) hand.setCurl(0.25 + fr * 0.6 + run * 0.3);
    }
    // look: turn the whole body a little, eyes do the rest
    let ly = 0, lp = 0;
    if (s.look && s.lookAmt > 0 && r.body) {
      const a = lookAngles(r.pivot || r.body, s.look);
      ly = clamp(a.yaw, -1.4, 1.4) * s.lookAmt;
      lp = clamp(a.pitch, -0.8, 1.2) * s.lookAmt;
    }
    const idleL = anim.idleLook(t, this.seed);
    const bodyYaw = clamp(ly * 0.55, -0.7, 0.7);
    if (r.body) {
      r.body.rotation.y += bodyYaw;
      r.body.rotation.x += -clamp(lp * 0.25, -0.25, 0.3);
    }
    const ex = clamp((ly - bodyYaw) / 0.6 + idleL.x * (1 - s.lookAmt) * 0.6, -1, 1);
    const ey = clamp(lp / 0.6 + idleL.y * (1 - s.lookAmt) * 0.6, -1, 1);
    const blink = s.blink ?? autoBlink(t, this.seed);
    const lidOpen = s.lid ?? (m.lid ?? 1);
    for (const e of [r.eyeL, r.eyeR]) {
      if (!e) continue;
      e.setLook?.(ex, ey);
      const open = lerp(lidOpen, 1, fr);
      e.setLid?.(lerp(open, -1, blink));
    }
    root.extra?.(r, s, t, { p, mv, run, fr, breathe });
  }
}
