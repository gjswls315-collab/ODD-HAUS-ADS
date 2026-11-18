// Inspect view: the selected item is rebuilt in its own little studio scene and
// drawn over the dimmed shop, where it can be turned with the mouse.
import * as THREE from "three";

export class Inspector {
  constructor(renderer, environment) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.environment = environment;
    this.scene.environmentIntensity = 0.8;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
    this.holder = new THREE.Group();
    this.scene.add(this.holder);
    const key = new THREE.DirectionalLight(0xffe2c0, 3.2); key.position.set(-1.2, 1.6, 2); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xbcd2ff, 1.6); rim.position.set(1.5, 0.8, -1.8); this.scene.add(rim);
    this.scene.add(new THREE.HemisphereLight(0xfff1dc, 0x302820, 0.7));
    // dim layer
    this.dimScene = new THREE.Scene();
    this.dimCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.dimMat = new THREE.MeshBasicMaterial({ color: 0x0b1020, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false });
    this.dimScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.dimMat));
    this.active = false; this.k = 0;
    this.yaw = 0; this.pitch = 0; this.idle = 0;
  }
  open(spec) {
    this.holder.clear();
    const obj = spec.make();
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z) || 1;
    const s = 0.9 / r;
    const pivot = new THREE.Group();
    obj.position.sub(c);
    pivot.add(obj);
    pivot.scale.setScalar(s);
    this.holder.add(pivot);
    this.active = true; this.k = 0;
    this.yaw = -0.6; this.pitch = 0.12; this.idle = 0;
  }
  close() { this.active = false; }
  turn(dx, dy) {
    this.yaw += dx * 0.008; this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch + dy * 0.006)); this.idle = 0;
  }
  render(dt) {
    const target = this.active ? 1 : 0;
    this.k += (target - this.k) * (1 - Math.exp(-dt * 10));
    if (this.k < 0.01 && !this.active) return;
    const R = this.renderer;
    const w = R.domElement.clientWidth, h = R.domElement.clientHeight;
    const narrow = w < 760;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const off = narrow ? 0 : 0.42;
    this.camera.position.set(off, narrow ? -0.25 : 0.02, 2.05);
    this.camera.lookAt(off, narrow ? -0.25 : 0, 0);
    this.idle += dt;
    if (this.idle > 1.2) this.yaw += dt * 0.35;
    this.holder.rotation.set(this.pitch, this.yaw, 0);
    const e = 1 - Math.pow(1 - this.k, 3);
    this.holder.scale.setScalar(0.85 + 0.15 * e);
    this.holder.position.y = (1 - e) * -0.08;
    this.dimMat.opacity = 0.64 * this.k;
    const ac = R.autoClear;
    R.autoClear = false;
    R.setRenderTarget(null);
    R.clearDepth();
    R.render(this.dimScene, this.dimCam);
    if (this.k > 0.05) R.render(this.scene, this.camera);
    R.autoClear = ac;
  }
}
