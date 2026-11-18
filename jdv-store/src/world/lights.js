// Lighting: low golden-hour sun through the glazing, warm track spots on the
// walls and goods, the green pendant over the table, sky fill.
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { TRACKS, F, ROOM, GLAZING } from "../layout.js";
import { M } from "../materials.js";
import { cyl, cbox } from "../geo.js";
import { SUN_DIR } from "./terrace.js";

export function buildLights(ctx) {
  const { scene } = ctx;
  RectAreaLightUniformsLib.init();

  // sun
  const sun = new THREE.DirectionalLight(0xffb978, 3.0);
  sun.position.copy(SUN_DIR).multiplyScalar(22).add(new THREE.Vector3(0, 0, -2.5));
  sun.target.position.set(0, 0, -2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -11; sc.right = 11; sc.top = 9; sc.bottom = -9; sc.near = 4; sc.far = 45;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0xffe2c0, 0x5a4a3a, 0.28);
  scene.add(hemi);

  // daylight spilling in through the glazing
  const rect = new THREE.RectAreaLight(0xffd2a0, 1.1, GLAZING.x1 - GLAZING.x0, 2.6);
  rect.position.set((GLAZING.x0 + GLAZING.x1) / 2, 1.4, ROOM.z0 + 0.02);
  rect.lookAt(rect.position.x, 1.2, 0);
  scene.add(rect);

  // pendant over the table (casts shadows)
  const P = F.pendant;
  const pend = new THREE.SpotLight(0xffc988, 9, 7, 1.0, 0.7, 2);
  pend.position.set(P.x, P.y - 0.12, P.z);
  pend.target.position.set(P.x, 0, P.z);
  pend.castShadow = true;
  pend.shadow.mapSize.set(1024, 1024);
  pend.shadow.bias = -0.0006; pend.shadow.normalBias = 0.02; pend.shadow.radius = 4;
  pend.shadow.camera.near = 0.1; pend.shadow.camera.far = 4;
  scene.add(pend, pend.target);
  const pendFill = new THREE.PointLight(0xffd29c, 1.0, 3, 2);
  pendFill.position.set(P.x, P.y + 0.15, P.z);
  scene.add(pendFill);

  // track spots: [track, z, target, real light?, intensity]
  const spots = [
    [0, 2.7, [-3.5, 2.25, 1.95], true, 30],   // mascot on the mural
    [0, 0.9, [-3.5, 1.8, 0.0], true, 30],     // lettering + record crates
    [0, 3.45, [-3.45, 1.75, 3.35], true, 14], // wall shelf by the entrance
    [0, -0.6, [-3.25, 0.95, -0.55], false],   // turntable
    [0, -2.0, [-3.48, 1.5, -1.9], true, 22],  // pegboard
    [0, -3.0, [-2.25, 1.15, -3.0], false],    // rack
    [1, -3.1, [2.12, 1.4, -3.78], true, 26],  // steel shelf
    [1, -1.6, [1.05, 0.9, -1.95], true, 18],  // new arrivals
    [1, -0.4, [3.45, 1.85, -0.6], false],     // frames
    [1, 2.0, [2.0, 1.05, 2.3], true, 16],     // coffee bar
    [1, 2.9, [3.45, 1.85, 1.9], true, 14],    // menu board + coffee shelves
  ];
  for (const [ti, z, tgt, real, inten] of spots) {
    const t = TRACKS[ti];
    const pos = new THREE.Vector3(t.x, 2.78, z);
    const target = new THREE.Vector3(...tgt);
    // fixture
    const head = new THREE.Group();
    head.position.copy(pos);
    const adapter = cbox(0.03, 0.05, 0.05, M.blackMetal, 0, 0.07, 0, { uv: false });
    head.add(adapter);
    const can = new THREE.Group();
    const body = cyl(0.042, 0.042, 0.14, M.blackMetal, 20); body.rotation.x = Math.PI / 2; can.add(body);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.032, 20), M.spotLens); lens.position.z = 0.0705; can.add(lens);
    const fin = cyl(0.045, 0.045, 0.02, M.blackMetal, 20); fin.rotation.x = Math.PI / 2; fin.position.z = -0.06; can.add(fin);
    head.add(can);
    can.lookAt(target.clone().sub(pos).add(new THREE.Vector3()));
    can.lookAt(target);
    head.updateMatrixWorld();
    scene.add(head);
    // aim: lookAt in local space of head (head has no rotation)
    can.lookAt(target);
    if (real) {
      const s = new THREE.SpotLight(0xffd09a, inten * 0.32, 7, 0.44, 0.85, 2);
      s.position.copy(pos);
      s.target.position.copy(target);
      scene.add(s, s.target);
    }
  }
  ctx.sun = sun;
  return { sun, hemi, rect, pend };
}
