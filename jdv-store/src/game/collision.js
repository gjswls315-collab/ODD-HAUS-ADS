// Circle-vs-AABB collision in the floor plane, using the layout's collider list.
import { GLAZING, ROOM } from "../layout.js";

export class Collision {
  constructor(list) {
    this.list = list;
    this.doorOpen = 0;
    const zc = ROOM.z0 - ROOM.wall / 2;
    // open door leaves (swung out onto the terrace)
    this.leaves = [
      { x0: GLAZING.doorX0 - 0.03, z0: zc - 0.86, x1: GLAZING.doorX0 + 0.16, z1: zc + 0.02 },
      { x0: GLAZING.doorX1 - 0.16, z0: zc - 0.86, x1: GLAZING.doorX1 + 0.03, z1: zc + 0.02 },
    ];
  }
  resolve(p, r) {
    for (let it = 0; it < 3; it++) {
      for (const b of this.list) {
        if (b.kind === "door" && this.doorOpen > 0.75) continue;
        this.push(p, r, b);
      }
      if (this.doorOpen > 0.4) for (const b of this.leaves) this.push(p, r, b);
    }
  }
  push(p, r, b) {
    const cx = Math.max(b.x0, Math.min(p.x, b.x1)), cz = Math.max(b.z0, Math.min(p.z, b.z1));
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return;
    if (d2 > 1e-10) {
      const d = Math.sqrt(d2);
      p.x += (dx / d) * (r - d); p.z += (dz / d) * (r - d);
    } else {
      const pl = p.x - b.x0, pr = b.x1 - p.x, pb = p.z - b.z0, pf = b.z1 - p.z, m = Math.min(pl, pr, pb, pf);
      if (m === pl) p.x = b.x0 - r; else if (m === pr) p.x = b.x1 + r; else if (m === pb) p.z = b.z0 - r; else p.z = b.z1 + r;
    }
  }
}
