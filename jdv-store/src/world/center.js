// Centre of the shop: striped rug, glossy forest-green tiled table, green enamel pendant.
import * as THREE from "three";
import { F, ROOM } from "../layout.js";
import { M } from "../materials.js";
import { bx, cbox, cyl, at, lathe } from "../geo.js";
import { galvBox, mug, candle } from "./props.js";

export function buildCenter(ctx) {
  const g = new THREE.Group(); g.name = "centre";
  ctx.scene.add(g);
  const R = F.rug;
  const rug = new THREE.Mesh(new THREE.BoxGeometry(R.x1 - R.x0, 0.008, R.z1 - R.z0), M.rug);
  rug.position.set((R.x0 + R.x1) / 2, 0.004, (R.z0 + R.z1) / 2); rug.receiveShadow = true; g.add(rug);

  // tiled table: top slab, two end blocks, base slab; open tunnel in between
  const Tb = F.table, h = Tb.h, tile = { tile: [0.4, 0.4], round: 0.012 };
  g.add(bx(Tb.x0, h - 0.1, Tb.z0, Tb.x1, h, Tb.z1, M.tile, tile));
  g.add(bx(Tb.x0, 0, Tb.z0, Tb.x0 + 0.2, h - 0.1, Tb.z1, M.tile, tile));
  g.add(bx(Tb.x1 - 0.2, 0, Tb.z0, Tb.x1, h - 0.1, Tb.z1, M.tile, tile));
  g.add(bx(Tb.x0 + 0.2, 0, Tb.z0, Tb.x1 - 0.2, 0.08, Tb.z1, M.tile, tile));
  // inside the tunnel: books + galvanised box
  const zc = (Tb.z0 + Tb.z1) / 2;
  ctx.books.row(Tb.x0 + 0.24, 0.08, zc + 0.02, 0, 0.42, { hMin: 0.2, hMax: 0.27, dMin: 0.16, dMax: 0.2 });
  const gb = galvBox(0.36, 0.2, 0.32); gb.position.set(Tb.x1 - 0.48, 0.08, zc); gb.rotation.y = 0.05; g.add(gb);
  ctx.underTableSpot = new THREE.Vector3(Tb.x0 + 0.78, 0.08, zc + 0.12);

  // on top: book stacks, candle, JDV mug, potted pothos (by plants)
  ctx.books.stack(Tb.x0 + 0.48, h, zc + 0.08, 2, 0.05);
  const stackTop = ctx.books.stack(Tb.x0 + 0.84, h, zc - 0.05, 3, -0.12);
  const cd = candle(); cd.position.set(Tb.x0 + 0.33, h, zc + 0.12); g.add(cd);
  const flame = cd.children.find((c) => c.userData.flame);
  cd.userData.dynamic = true;
  ctx.anim.push((dt, t) => { flame.scale.set(1 + Math.sin(t * 13) * 0.08, 2.2 + Math.sin(t * 7.3) * 0.25 + Math.sin(t * 17) * 0.1, 1); });
  const mg = mug(); mg.position.set(Tb.x0 + 0.86, stackTop, zc - 0.05); mg.rotation.y = 0.5; g.add(mg);
  const coffee = cyl(0.037, 0.037, 0.003, new THREE.MeshPhysicalMaterial({ color: 0x2b1609, roughness: 0.1, clearcoat: 1 }), 20);
  coffee.position.set(mg.position.x, mg.position.y + 0.08, mg.position.z); g.add(coffee);
  ctx.tablePotSpot = new THREE.Vector3(Tb.x1 - 0.42, h, zc - 0.08);
  ctx.interactions.push({
    box: [mg.position.x - 0.07, h, mg.position.z - 0.07, mg.position.x + 0.07, h + 0.2, mg.position.z + 0.07], name: "JDV mug", verb: "Inspect", dist: 2.2,
    inspect: { title: "JDV diner mug", kind: "Ceramic · 350 ml", text: "Thick-walled glossy mug with the JDV mark. This one still has someone's hand drip in it.", details: ["Stoneware", "350 ml", "Dishwasher safe"], make: () => mug() },
  });

  // green enamel pendant over the table
  const P = F.pendant;
  const pend = new THREE.Group(); pend.position.set(P.x, P.y, P.z); g.add(pend);
  pend.add(at(cyl(0.004, 0.004, ROOM.h - 0.34 - P.y, M.blackMatte, 6), 0, (ROOM.h - 0.34 - P.y) / 2, 0));
  pend.add(at(cyl(0.03, 0.026, 0.08, M.enamelGreen, 16), 0, 0.02, 0));
  const shadePts = [[0.028, 0.0], [0.05, -0.01], [0.13, -0.07], [0.2, -0.15], [0.235, -0.2], [0.24, -0.205]];
  const shade = lathe(shadePts, M.enamelGreen, 48); pend.add(shade);
  const inner = new THREE.Mesh(new THREE.LatheGeometry(shadePts.map(([r, y]) => new THREE.Vector2(r * 0.985, y - 0.003)), 48), M.enamelInside); pend.add(inner);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.004, 6, 48), M.enamelGreen); rim.rotation.x = Math.PI / 2; rim.position.y = -0.205; pend.add(rim);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), M.bulb); bulb.position.y = -0.1; pend.add(bulb);
  ctx.pendant = pend;
  return g;
}
