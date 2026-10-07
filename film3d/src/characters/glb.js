// Preparing a character GLB (from tools/model) for the film: materials by name, eyes on the
// EyeL/EyeR sockets, shadows, and helpers to hang props on bones in character space.
import * as THREE from "three";
import { makeEye } from "../core/geo.js";
import { mat, M } from "../core/mats.js";
import { fabric, knit, plaid, teePrint, mugDecal, stripes, engravedTag } from "../core/textures.js";

function rep(t, r) {
  const c = t.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(r, r);
  c.needsUpdate = true;
  return c;
}

/** Look per material name. Colours default to the GLB's own (already linear). */
const LOOKS = {
  M_Skin: () => ({ roughness: 0.5, sheen: 0.4, sheenColor: "#ff8f78", sheenRoughness: 0.45, clearcoat: 0.04 }),
  M_Hair: () => ({ roughness: 0.4, sheen: 0.8, sheenColor: "#fff1c9", sheenRoughness: 0.32, clearcoat: 0.12, clearcoatRoughness: 0.5 }),
  M_HairDark: () => ({ roughness: 0.45, sheen: 0.7, sheenColor: "#8a8078", sheenRoughness: 0.35, clearcoat: 0.1 }),
  M_Moustache: () => ({ roughness: 0.5, sheen: 0.7, sheenColor: "#6a625c", sheenRoughness: 0.4 }),
  M_RobeTrim: () => ({ roughness: 0.75, sheen: 1.0, sheenColor: "#c03a48", sheenRoughness: 0.45 }),
  M_Fleece: () => ({ roughness: 0.95, sheen: 1.0, sheenColor: "#ffffff", sheenRoughness: 0.7 }),
  M_Brow: () => ({ roughness: 0.6, sheen: 0.5, sheenColor: "#ffe3a8" }),
  M_Teeth: () => ({ roughness: 0.22, clearcoat: 0.6 }),
  M_Shirt: () => ({ map: rep(knit("#2a292c").map, 30), roughness: 0.92, sheen: 0.7, sheenColor: "#5a5a66", sheenRoughness: 0.7 }),
  M_ShirtPrint: () => ({ map: teePrint(), transparent: false, alphaTest: 0.45, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, colorOverride: "#ffffff" }),
  M_Pants: () => ({ map: rep(fabric("#8a8660", 11, 3), 14), roughness: 0.94, sheen: 0.4, sheenColor: "#b7b28a", sheenRoughness: 0.8, colorOverride: "#ffffff" }),
  M_Cap: () => ({ map: rep(fabric("#2a2a2e", 5, 3), 30), roughness: 0.82, sheen: 0.5, sheenColor: "#55555e", colorOverride: "#ffffff" }),
  M_CapStrap: () => ({ roughness: 0.5, clearcoat: 0.3 }),
  M_ShoeCanvas: () => ({ map: rep(fabric("#2b2b30", 3, 2), 40), roughness: 0.85, sheen: 0.4, sheenColor: "#666670", colorOverride: "#ffffff" }),
  M_ShoeRubber: () => ({ roughness: 0.55, clearcoat: 0.15 }),
  M_Lace: () => ({ roughness: 0.85, sheen: 0.4, sheenColor: "#ffffff" }),
  M_Band: () => ({ roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35 }),
  M_Metal: () => ({ roughness: 0.28, metalness: 1 }),
  M_Robe: () => ({ map: rep(plaid("#7a1a22", "#2a0c10", "#c79a6a", 2), 3.2), roughness: 0.9, sheen: 0.8, sheenColor: "#e0606a", sheenRoughness: 0.6, colorOverride: "#ffffff" }),
  M_Shirt2: () => ({ roughness: 0.8, sheen: 0.4, sheenColor: "#ffffff" }),
  M_PJ: () => ({ map: rep(fabric("#3a3f52", 4, 3), 20), roughness: 0.9, sheen: 0.4, sheenColor: "#7c86a8", colorOverride: "#ffffff" }),
  M_Rope: () => ({ map: rep(fabric("#c8a878", 8, 2), 60), roughness: 0.95, colorOverride: "#ffffff" }),
  M_Slipper: () => ({ roughness: 0.8, sheen: 0.8, sheenColor: "#c08a6a", sheenRoughness: 0.6 }),
  M_Ceramic: () => ({ roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
  M_MugDecal: () => ({ map: mugDecal(), roughness: 0.2, clearcoat: 1, colorOverride: "#ffffff" }),
  M_Fur: () => ({ roughness: 0.88, sheen: 0.45, sheenColor: "#c9b8a2", sheenRoughness: 0.55, colorOverride: "#8f8478" }),
  M_Nose: () => ({ roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
  M_Tie: () => ({ map: rep(stripes("#1e3f8f", "#f2c230"), 12), roughness: 0.5, sheen: 0.6, sheenColor: "#9fb6ff", colorOverride: "#ffffff" }),
  M_Collar: () => ({ roughness: 0.8, sheen: 0.5, sheenColor: "#ffffff" }),
  M_Tag: () => ({ map: engravedTag("BUDDY"), roughness: 0.32, metalness: 0.85, colorOverride: "#ffffff" }),
};

export function prepareGLB(vis, def) {
  const swap = new Map();
  vis.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    if (o.isSkinnedMesh) o.frustumCulled = false;
    const src = o.material;
    if (!swap.has(src)) {
      const look = (LOOKS[src.name] || (() => ({})))();
      const { colorOverride, ...rest } = look;
      const color = colorOverride ? new THREE.Color(colorOverride) : src.color.clone();
      const m = new THREE.MeshPhysicalMaterial({
        name: src.name, color, roughness: src.roughness, metalness: src.metalness,
        vertexColors: !!o.geometry.attributes.color, ...rest,
      });
      if (rest.sheenColor) m.sheenColor = new THREE.Color(rest.sheenColor);
      swap.set(src, m);
    }
    o.material = swap.get(src);
    if (o.material.name === "M_ShirtPrint") { o.castShadow = false; o.material.vertexColors = false; }
  });
  // eyes on the sockets (empties carry rx/ry/rz/iris/lid as extras)
  vis.updateMatrixWorld(true);
  const inv = new THREE.Quaternion();
  vis.getWorldQuaternion(inv).invert();
  for (const name of ["EyeL", "EyeR"]) {
    const sock = vis.getObjectByName(name);
    if (!sock) continue;
    const u = sock.userData || {};
    const ws = new THREE.Vector3(); sock.getWorldScale(ws);
    const vs = new THREE.Vector3(); vis.getWorldScale(vs);
    const eo = def.glbMeta?.eye || {};
    const k = (vs.x / ws.x) * (eo.scale ?? 1);
    const eye = makeEye({
      rx: (u.rx ?? 0.02) * k, ry: (u.ry ?? 0.02) * k, rz: (u.rz ?? 0.015) * k, iris: eo.iris ?? u.iris ?? "#5a3a22",
      irisR: u.irisR ?? 0.58, pupilR: u.pupilR ?? 0.3, lidMat: M.skin(u.lid ?? "#efc3a0"), lowerLid: true,
    });
    // face the character's forward axis whatever the socket's own orientation is
    const q = new THREE.Quaternion();
    sock.getWorldQuaternion(q);
    eye.quaternion.copy(q.premultiply(inv).invert());
    if (eo.push) eye.position.copy(new THREE.Vector3(0, eo.lift ?? 0, -eo.push).applyQuaternion(eye.quaternion).multiplyScalar(vs.x / ws.x));
    sock.add(eye);
    sock.userData.eye = eye;
  }
}

/** Parent `obj` to `bone`, placed at a character-space pose (measured at rest). */
export function attachRest(root, bone, obj, pos, euler = [0, 0, 0], scale = 1) {
  root.updateMatrixWorld(true);
  const want = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler)),
    new THREE.Vector3(scale, scale, scale));
  const boneRel = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(bone.matrixWorld);
  const local = boneRel.invert().multiply(want);
  local.decompose(obj.position, obj.quaternion, obj.scale);
  bone.add(obj);
  return obj;
}
