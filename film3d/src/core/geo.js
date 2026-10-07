// Geometry helpers and reusable character parts (eyes, gloves, hands, sneakers, fur).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { M, mat } from "./mats.js";
import { rng } from "./util.js";
import { radial } from "./textures.js";

export function mesh(geo, material, { cast = true, receive = true, name } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (name) m.name = name;
  return m;
}

export function group(name, ...children) {
  const g = new THREE.Group();
  if (name) g.name = name;
  for (const c of children) if (c) g.add(c);
  return g;
}

export const sphereGeo = (seg = 32) => new THREE.SphereGeometry(1, seg, Math.max(12, seg * 0.75 | 0));

export function ellipsoid(rx, ry, rz, material, seg = 32, opts) {
  const m = mesh(sphereGeo(seg), material, opts);
  m.scale.set(rx, ry, rz);
  return m;
}

/** Capsule along +Y, centred. `len` is total length including caps. */
export function capsule(r, len, material, seg = 16, opts) {
  return mesh(new THREE.CapsuleGeometry(r, Math.max(0.0001, len - 2 * r), 6, seg), material, opts);
}

/** A limb segment hanging from its pivot: pivot at y=0, extends to y=-len. */
export function limb(len, r, material, name, r2 = r) {
  const pivot = new THREE.Group();
  pivot.name = name || "";
  const geo = r2 === r
    ? new THREE.CapsuleGeometry(r, Math.max(0.0001, len - 2 * r), 6, 14)
    : taperedCapsule(r, r2, len);
  const m = mesh(geo, material);
  m.position.y = -len / 2;
  pivot.add(m);
  pivot.userData.len = len;
  return pivot;
}

/** Tapered capsule (top radius r1, bottom r2) along Y, centred. */
export function taperedCapsule(r1, r2, len, seg = 16) {
  const pts = [];
  const h = len - r1 - r2;
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI / 2;
    pts.push(new THREE.Vector2(Math.sin(a) * r2, -h / 2 - Math.cos(a) * r2));
  }
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI / 2;
    pts.push(new THREE.Vector2(Math.cos(a) * r1, h / 2 + Math.sin(a) * r1));
  }
  return new THREE.LatheGeometry(pts, seg);
}

export function roundedBox(w, h, d, r, material, seg = 4, opts) {
  return mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) - 1e-5), material, opts);
}

/** Lathe from [[radius, y], ...] profile. */
export function lathe(profile, material, seg = 48, opts) {
  return mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.00001), y)), seg), material, opts);
}

export function extrude(shape, depth, material, bevel = 0.002, opts, curveSegments = 24) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments,
  });
  geo.translate(0, 0, -depth / 2);
  return mesh(geo, material, opts);
}

export function tube(points, r, material, seg = 32, radial = 10, closed = false, opts) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), closed);
  return mesh(new THREE.TubeGeometry(curve, seg, r, radial, closed), material, opts);
}

/** Rounded-corner polygon shape (2D), corners given as [x, y]. */
export function roundedPolygon(pts, radius) {
  const shape = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = new THREE.Vector2(...pts[(i - 1 + n) % n]);
    const p1 = new THREE.Vector2(...pts[i]);
    const p2 = new THREE.Vector2(...pts[(i + 1) % n]);
    const a = p0.clone().sub(p1).normalize();
    const b = p2.clone().sub(p1).normalize();
    const r = Math.min(radius, p0.distanceTo(p1) / 2.2, p2.distanceTo(p1) / 2.2);
    const s = p1.clone().addScaledVector(a, r);
    const e = p1.clone().addScaledVector(b, r);
    if (i === 0) shape.moveTo(s.x, s.y); else shape.lineTo(s.x, s.y);
    shape.quadraticCurveTo(p1.x, p1.y, e.x, e.y);
  }
  shape.closePath();
  return shape;
}

// ---------------------------------------------------------------- eyes
/**
 * Stylised eye. Origin at eyeball centre, looking down +Z.
 * opts: rx, ry, rz (eyeball radii), iris (colour or null), irisR, pupilR,
 * lidMat (enables an upper lid), lowerLid.
 * Returns group with .setLook(x, y) (-1..1) and .setLid(edge) (1 open .. -1 closed).
 */
export function makeEye(o = {}) {
  const { rx = 0.02, ry = rx, rz = rx * 0.7, iris = null, irisR = 0.55, pupilR = 0.32, lidMat = null, lowerLid = false, catchlight = true } = o;
  const eye = group("Eye");
  const unit = group("EyeUnit");
  unit.scale.set(rx, ry, rz);
  eye.add(unit);
  const ball = mesh(sphereGeo(32), M.eyeWhite(), { cast: false });
  unit.add(ball);
  const look = group("EyeLook");
  unit.add(look);
  if (iris) {
    const ir = mesh(new THREE.SphereGeometry(1.002, 32, 12, 0, Math.PI * 2, 0, Math.asin(irisR)), mat({ color: iris, roughness: 0.25, clearcoat: 1 }), { cast: false });
    ir.rotation.x = Math.PI / 2;
    look.add(ir);
  }
  const pu = mesh(new THREE.SphereGeometry(1.004, 32, 10, 0, Math.PI * 2, 0, Math.asin(pupilR)), M.pupil(), { cast: false });
  pu.rotation.x = Math.PI / 2;
  look.add(pu);
  if (catchlight) {
    const cl = mesh(new THREE.SphereGeometry(1, 12, 8), M.catchlight(), { cast: false, receive: false });
    cl.scale.setScalar(0.13);
    cl.position.set(-0.32, 0.36, 0.9);
    unit.add(cl);
    const cl2 = cl.clone();
    cl2.scale.setScalar(0.06);
    cl2.position.set(0.2, -0.28, 0.95);
    unit.add(cl2);
  }
  let lid = null, low = null;
  if (lidMat) {
    lid = mesh(new THREE.SphereGeometry(1.06, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), lidMat, { cast: false });
    unit.add(lid);
    if (lowerLid) {
      low = mesh(new THREE.SphereGeometry(1.05, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lidMat, { cast: false });
      unit.add(low);
    }
  }
  eye.userData.lidBase = 1;
  eye.setLook = (x, y) => {
    look.rotation.y = x * 0.45;
    look.rotation.x = -y * 0.4;
  };
  eye.setLid = (edge, lower = -1) => {
    if (lid) lid.rotation.x = -Math.asin(THREE.MathUtils.clamp(edge, -1, 1));
    if (low) low.rotation.x = -Math.asin(THREE.MathUtils.clamp(lower, -1, 1)) - 0.0;
  };
  eye.setLid(1);
  return eye;
}

// ---------------------------------------------------------------- gloves & hands
/** Cartoon 4-finger glove. Origin at the wrist, fingers point down -Y. */
export function makeGlove(s = 0.03, material = M.glove()) {
  const g = group("Glove");
  const cuff = mesh(new THREE.CylinderGeometry(0.42 * s, 0.55 * s, 0.32 * s, 18), material);
  cuff.position.y = -0.1 * s;
  const roll = mesh(new THREE.TorusGeometry(0.5 * s, 0.1 * s, 8, 20), material);
  roll.rotation.x = Math.PI / 2;
  roll.position.y = -0.02 * s;
  const palm = ellipsoid(0.55 * s, 0.6 * s, 0.32 * s, material);
  palm.position.y = -0.62 * s;
  g.add(cuff, roll, palm);
  const fingers = [];
  for (let i = 0; i < 3; i++) {
    const f = group("Finger");
    f.position.set((i - 1) * 0.3 * s, -1.0 * s, 0.02 * s);
    f.rotation.z = (i - 1) * -0.12;
    const seg = capsule(0.15 * s, 0.62 * s, material, 10);
    seg.position.y = -0.24 * s;
    f.add(seg);
    g.add(f);
    fingers.push(f);
  }
  const thumb = group("Thumb");
  thumb.position.set(0.48 * s, -0.55 * s, 0.1 * s);
  thumb.rotation.z = 0.9;
  const tseg = capsule(0.15 * s, 0.5 * s, material, 10);
  tseg.position.y = -0.18 * s;
  thumb.add(tseg);
  g.add(thumb);
  g.setCurl = (v) => {
    fingers.forEach((f, i) => { f.rotation.x = v * 1.5; f.rotation.z = (i - 1) * -0.12 * (1 - v); });
    thumb.rotation.x = v * 0.8;
  };
  g.setCurl(0.15);
  return g;
}

/** Stylised human hand (palm + 4 fingers + thumb). Origin at wrist, fingers down -Y. */
export function makeHand(s = 0.09, material, side = 1) {
  const g = group("Hand");
  const palm = roundedBox(0.8 * s, 0.9 * s, 0.32 * s, 0.14 * s, material, 3);
  palm.position.y = -0.45 * s;
  g.add(palm);
  const fingers = [];
  const lens = [0.48, 0.55, 0.52, 0.42];
  for (let i = 0; i < 4; i++) {
    const f = group("Finger");
    f.position.set((i - 1.5) * 0.2 * s * side, -0.86 * s, 0);
    const a = capsule(0.085 * s, lens[i] * s * 0.55, material, 8);
    a.position.y = -lens[i] * s * 0.22;
    const k = group("Knuckle");
    k.position.y = -lens[i] * s * 0.5;
    const b = capsule(0.08 * s, lens[i] * s * 0.5, material, 8);
    b.position.y = -lens[i] * s * 0.2;
    k.add(b);
    f.add(a, k);
    f.userData.k = k;
    g.add(f);
    fingers.push(f);
  }
  const th = group("Thumb");
  th.position.set(0.42 * s * side, -0.3 * s, 0.08 * s);
  th.rotation.z = 0.7 * side;
  const ta = capsule(0.1 * s, 0.45 * s, material, 8);
  ta.position.y = -0.2 * s;
  th.add(ta);
  g.add(th);
  g.setCurl = (v, spread = 0) => {
    fingers.forEach((f, i) => {
      f.rotation.x = v * 1.2;
      f.userData.k.rotation.x = v * 1.4;
      f.rotation.z = (i - 1.5) * 0.08 * spread * side;
    });
    th.rotation.x = v * 0.6;
  };
  g.setCurl(0.25);
  return g;
}

// ---------------------------------------------------------------- shoes
/**
 * Cartoon sneaker, origin at the ankle, toe pointing +Z.
 * s = shoe length.
 */
export function makeSneaker({ s = 0.06, upper = "#c8262c", sole = "#f1ede4", toe = "#f1ede4", lace = "#f6f4ee", worn = 0, canvas = true } = {}) {
  const g = group("Sneaker");
  const upMat = canvas ? M.cloth(upper, 0.85) : M.plastic(upper, 0.5);
  const soleMat = M.rubber(sole);
  const soleM = roundedBox(0.52 * s, 0.16 * s, 1.0 * s, 0.07 * s, soleMat, 3);
  soleM.position.set(0, -0.36 * s, 0.18 * s);
  const stripe = roundedBox(0.535 * s, 0.035 * s, 1.01 * s, 0.015 * s, M.rubber(worn ? "#7b7368" : "#2a2a2a"), 2);
  stripe.position.set(0, -0.31 * s, 0.18 * s);
  const body = ellipsoid(0.25 * s, 0.24 * s, 0.46 * s, upMat, 24);
  body.position.set(0, -0.2 * s, 0.14 * s);
  const toeCap = ellipsoid(0.24 * s, 0.15 * s, 0.2 * s, soleMat, 20);
  toeCap.position.set(0, -0.26 * s, 0.5 * s);
  const collar = mesh(new THREE.TorusGeometry(0.17 * s, 0.05 * s, 8, 18), upMat);
  collar.rotation.x = Math.PI / 2 - 0.25;
  collar.position.set(0, -0.02 * s, -0.08 * s);
  const tongue = roundedBox(0.2 * s, 0.05 * s, 0.4 * s, 0.02 * s, upMat, 2);
  tongue.position.set(0, -0.02 * s, 0.14 * s);
  tongue.rotation.x = -0.45;
  g.add(soleM, stripe, body, toeCap, collar, tongue);
  const laceMat = M.cloth(lace, 0.8);
  for (let i = 0; i < 3; i++) {
    const l = roundedBox(0.26 * s, 0.03 * s, 0.045 * s, 0.012 * s, laceMat, 2);
    l.position.set(0, -0.06 * s - i * 0.035 * s, 0.2 * s + i * 0.09 * s);
    l.rotation.x = -0.45;
    g.add(l);
  }
  const heel = roundedBox(0.3 * s, 0.14 * s, 0.08 * s, 0.03 * s, soleMat, 2);
  heel.position.set(0, -0.18 * s, -0.22 * s);
  g.add(heel);
  return g;
}

// ---------------------------------------------------------------- fur & hair clumps
/** Soft, slightly curved lock of fur/hair: rounded base, tapered tip, bent toward +Z. */
let _lockBase = null;
function lockBase() {
  if (_lockBase) return _lockBase;
  const prof = [[0.0, -0.06], [0.7, 0.0], [1.0, 0.1], [0.88, 0.26], [0.64, 0.46], [0.4, 0.66], [0.2, 0.83], [0.06, 0.96], [0.0, 1.0]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), 6);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setZ(i, pos.getZ(i) + 0.55 * y * y); // bend along the flow
  }
  g.computeVertexNormals();
  _lockBase = g;
  return g;
}

/**
 * Merge many soft locks into one vertex-coloured geometry.
 * items: [{pos, dir (lock axis), flow (bend direction), len, r, color, tip, flat}]
 */
let _blobBase = null;
function blobBase() {
  if (!_blobBase) { _blobBase = new THREE.IcosahedronGeometry(1, 2); _blobBase.translate(0, 0.5, 0); _blobBase.scale(1, 0.5, 1); }
  return _blobBase;
}

export function clumpGeometry(items, blob = false) {
  const base = blob ? blobBase() : lockBase();
  const geos = [];
  const m = new THREE.Matrix4();
  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
  for (const it of items) {
    const g = base.clone();
    Y.copy(it.dir).normalize();
    Z.copy(it.flow || new THREE.Vector3(0, -1, 0));
    Z.addScaledVector(Y, -Z.dot(Y));
    if (Z.lengthSq() < 1e-6) Z.set(1, 0, 0).addScaledVector(Y, -Y.x);
    Z.normalize();
    X.crossVectors(Y, Z).normalize();
    const flat = it.flat ?? 0.8;
    m.makeBasis(X.multiplyScalar(it.r), Y.multiplyScalar(it.len), Z.multiplyScalar(it.r * flat));
    m.setPosition(it.pos);
    g.applyMatrix4(m);
    const col = new Float32Array(g.attributes.position.count * 3);
    const c2 = it.tip || it.color;
    const py = base.attributes.position;
    for (let i = 0; i < g.attributes.position.count; i++) {
      const t = THREE.MathUtils.clamp(py.getY(i), 0, 1);
      col[i * 3] = THREE.MathUtils.lerp(it.color.r, c2.r, t);
      col[i * 3 + 1] = THREE.MathUtils.lerp(it.color.g, c2.g, t);
      col[i * 3 + 2] = THREE.MathUtils.lerp(it.color.b, c2.b, t);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geos.push(g);
  }
  return mergeGeometries(geos, false);
}

/**
 * Scatter clumps over an ellipsoid surface.
 * opts: center, radii, count, len [min,max], r [min,max], palette [hex], flow Vector3,
 * flowK (0..1 blend normal->flow), filter(normal)->bool, seed, tipLighten.
 */
export function furEllipsoid(o) {
  const r = rng(o.seed ?? 1);
  const items = [];
  const c = o.center || new THREE.Vector3();
  const [ax, ay, az] = o.radii;
  const flow = (o.flow || new THREE.Vector3(0, -1, 0)).clone().normalize();
  const pal = o.palette.map((h) => new THREE.Color(h));
  let tries = 0;
  while (items.length < o.count && tries < o.count * 20) {
    tries++;
    const u = r() * 2 - 1, th = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const n = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
    if (o.filter && !o.filter(n)) continue;
    const p = new THREE.Vector3(n.x * ax, n.y * ay, n.z * az).multiplyScalar(o.inset ?? 0.92).add(c);
    const nn = new THREE.Vector3(n.x / ax, n.y / ay, n.z / az).normalize();
    const jit = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(o.jitter ?? 0.35);
    const dir = nn.clone().lerp(flow, o.flowK ?? 0.6).add(jit).normalize();
    const col = (o.colorFn ? o.colorFn(n, r) : pal[(r() * pal.length) | 0]).clone();
    col.offsetHSL(0, 0, (r() - 0.5) * 0.06);
    items.push({
      pos: p, dir, flow: flow.clone().add(jit), len: o.len[0] + r() * (o.len[1] - o.len[0]), r: o.r[0] + r() * (o.r[1] - o.r[0]),
      color: col.clone().multiplyScalar(o.rootDark ?? 0.55), tip: col.clone().offsetHSL(0, -0.03, o.tipLighten ?? 0.05), flat: o.flat,
    });
  }
  return clumpGeometry(items, !!o.blob);
}

export function furMaterial(rough = 0.92) {
  return mat({ vertexColors: true, color: "#ffffff", roughness: rough, sheen: 0.6, sheenColor: "#fff2dc", sheenRoughness: 0.7 });
}

// ---------------------------------------------------------------- contact shadow
export function contactShadow(rx, rz = rx, opacity = 0.55) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: radial(1, 0, 0.35), color: 0x000000, transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(rx * 2, rz * 2, 1);
  m.position.y = 0.0015;
  m.renderOrder = 1;
  m.name = "ContactShadow";
  return m;
}
