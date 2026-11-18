// Interaction targeting: invisible hit boxes, ray from the screen centre.
import * as THREE from "three";

export class Interactions {
  constructor(scene, specs) {
    this.group = new THREE.Group(); this.group.name = "hitboxes";
    this.group.userData.dynamic = true;
    scene.add(this.group);
    this.mat = new THREE.MeshBasicMaterial({ visible: false });
    this.list = [];
    this.ray = new THREE.Raycaster();
    this.ray.far = 4;
    for (const s of specs) this.add(s);
  }
  add(spec) {
    const [x0, y0, z0, x1, y1, z1] = spec.box;
    const m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), this.mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.userData.spec = spec;
    spec.mesh = m;
    this.group.add(m);
    this.list.push(spec);
    return spec;
  }
  remove(spec) {
    this.group.remove(spec.mesh);
    this.list = this.list.filter((s) => s !== spec);
  }
  /** The interaction under the crosshair, or null. */
  pick(camera) {
    this.ray.setFromCamera(_c, camera);
    const hits = this.ray.intersectObjects(this.group.children, false);
    for (const h of hits) {
      const s = h.object.userData.spec;
      if (h.distance <= (s.dist || 2.4)) return s;
      return null; // nearest box is out of reach: don't pick through it
    }
    return null;
  }
}
const _c = new THREE.Vector2(0, 0);
