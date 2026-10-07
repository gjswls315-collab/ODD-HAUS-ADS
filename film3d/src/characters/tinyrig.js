// Shared biped assembly for the small object characters.
// Produces the standard rig hierarchy:
// VisualModel > AnimationPivot > {Body > (face, EyeL, EyeR, LeftArm, RightArm, Props), LeftLeg, RightLeg}
import * as THREE from "three";
import { group, limb, makeGlove, makeSneaker, makeEye } from "../core/geo.js";
import { M } from "../core/mats.js";

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
  for (const [side, name] of [[1, "Left"], [-1, "Right"]]) {
    const hip = limb(L + spec.legR, spec.legR, limbMat, `${name}Leg`);
    hip.position.set(side * spec.hipX, spec.legLen, 0);
    const knee = limb(L + spec.legR, spec.legR * 0.95, limbMat, `${name}Shin`);
    knee.position.y = -L;
    hip.add(knee);
    const foot = group(`${name}Foot`);
    foot.position.y = -L;
    knee.add(foot);
    const shoe = makeSneaker(spec.shoe);
    shoe.rotation.y = side * 0.08;
    foot.add(shoe);
    pivot.add(hip);
  }

  const aL = spec.armLen / 2;
  spec.shoulders.forEach(([x, y, z], i) => {
    const side = i === 0 ? 1 : -1;
    const name = i === 0 ? "Left" : "Right";
    const sh = limb(aL + spec.armR, spec.armR, limbMat, `${name}Arm`);
    sh.position.set(x, y, z);
    sh.rotation.z = side * 0.2;
    const el = limb(aL + spec.armR, spec.armR, limbMat, `${name}ForeArm`);
    el.position.y = -aL;
    sh.add(el);
    const glove = makeGlove(spec.glove);
    glove.name = `${name}Hand`;
    glove.position.y = -aL - spec.armR * 0.5;
    glove.rotation.y = side * -Math.PI / 2;
    el.add(glove);
    body.add(sh);
  });

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
