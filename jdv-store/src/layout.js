// JEON DE VERO floor plan — the single source of truth for the shop's geometry.
//
// Units are metres. Facing the terrace from the street entrance: +x is right,
// -z is toward the terrace, +y is up. Every mesh, every collider and the
// M-key floor plan read their positions from here, so the room cannot change
// shape depending on where the player looks.
//
//   z=-9.4 ┌──────────── planters · trees · string-light poles ─────────────┐
//          │ bench                      TERRACE (deck)              fence  │
//          │        table            table               table           │
//   z=-4.2 └────────────┬──── glass doors ────┬────────────────────────────┘
//   z=-4.0  ┌───────────┤ fixed │ doors │fixed├── lightbox ── steel shelf ─[col]┐
//           │ rack      ·                                           vitrine  │
//           │ pegboard                         new-arrivals island           │
//           │ sideboard (turntable, lamp)                            bench    │
//           │ ═════ MURAL ═════      green tile table                frames  │
//           │ record cabinet + crates   (rug, pendant)        ┃bar┃ back bar │
//           │ stool                                           ┃   ┃ espresso │
//           │ wall shelf      front window        entrance    ┃   ┃          │
//   z=+4.0  └────────────────────────────────────────────────────────────────┘
//         x=-3.5                                                        x=+3.5

export const ROOM = { x0: -3.5, x1: 3.5, z0: -4.0, z1: 4.0, h: 3.3, wall: 0.22 };
export const EYE = 1.62;
export const PLAYER_R = 0.24;

// Back wall: steel-framed glazing with a pair of doors to the terrace.
export const GLAZING = { x0: -2.6, x1: 0.8, top: 2.86, doorX0: -1.7, doorX1: -0.1, doorTop: 2.34 };
// Front wall: reeded-glass shop window + entrance door.
export const FRONT_WINDOW = { x0: -2.9, x1: -0.45, sill: 0.62, top: 2.62 };
export const ENTRANCE = { x0: 0.25, x1: 1.35, top: 2.32 };

export const TERRACE = { x0: -4.6, x1: 4.6, z0: -9.4, z1: ROOM.z0 - ROOM.wall };

// Ceiling beams (downstands) and track lighting rails both run along z.
export const BEAMS = [-0.95, 1.98];
export const TRACKS = [{ x: -2.15, z0: -3.7, z1: 3.6 }, { x: 1.25, z0: -3.7, z1: 3.3 }];

// Furniture footprints. x0/x1/z0/z1 are the floor footprint; h is height.
export const F = {
  // left wall (mural wall), back to front
  rack: { x: -2.25, z0: -3.62, z1: -2.42, h: 1.62 },
  pegboard: { z0: -2.42, z1: -1.36, y0: 0.94, y1: 2.14 },
  sideboard: { x0: -3.5, x1: -3.0, z0: -1.3, z1: 0.0, h: 0.8 },
  cabinet: { x0: -3.5, x1: -2.9, z0: 0.0, z1: 2.62, h: 0.76 },
  crates: [{ z: 0.62 }, { z: 1.04 }, { z: 1.46 }, { z: 1.88 }], // record crates on the cabinet
  wallShelf: { x0: -3.5, x1: -3.24, z0: 2.86, z1: 3.86, ys: [1.66, 2.1] },
  stool: { x: -2.42, z: 2.98, r: 0.19, h: 0.62 },
  mural: { zc: 0.72, w: 3.5, y0: 1.28 }, // logo decal on the wall (mascot toward the entrance)

  // centre
  rug: { x0: -2.45, x1: 0.55, z0: -0.38, z1: 1.86 },
  table: { x0: -1.85, x1: -0.05, z0: 0.36, z1: 1.1, h: 0.5 },
  pendant: { x: -0.95, z: 0.73, y: 2.18 },
  island: { x0: 0.45, x1: 1.65, z0: -2.28, z1: -1.58, h: 0.84 },

  // back wall, right of the glazing
  lightbox: { x: 1.27, y: 2.5, w: 0.86, h: 0.56 },
  steelShelf: { x0: 1.5, x1: 2.75, z0: -3.98, z1: -3.53, levels: [0.1, 0.56, 1.02, 1.48, 1.96] },
  column: { x0: 2.85, x1: 3.5, z0: -4.0, z1: -3.35 },

  // right wall
  vitrine: { x0: 3.04, x1: 3.5, z0: -2.95, z1: -1.75, h: 1.96 },
  bench: { x0: 3.08, x1: 3.5, z0: -1.48, z1: 0.28, h: 0.46 },
  frames: { z0: -1.42, z1: 0.24, y0: 1.32 },
  barFront: { x0: 1.72, x1: 2.3, z0: 0.95, z1: 4.0, h: 1.03 },
  barBack: { x0: 2.95, x1: 3.5, z0: 0.45, z1: 4.0, h: 0.92 },
  barStools: [{ x: 1.3, z: 1.7 }, { x: 1.3, z: 2.8 }],

  // front wall
  windowLedge: { x0: -2.9, x1: -0.45, z0: 3.66, z1: 4.0, h: 0.6 },
};

// Terrace furniture
export const T = {
  awning: { x0: -2.85, x1: 1.05, depth: 1.25, y: 2.98 },
  tables: [{ x: -2.55, z: -6.15 }, { x: 0.35, z: -6.75 }, { x: 2.75, z: -5.75 }],
  bench: { x0: -4.6, x1: -4.08, z0: -8.6, z1: -6.6 },
  planters: { z0: -9.4, z1: -8.85, h: 0.55 },
  trees: [{ x: -3.55, z: -8.15, s: 1.0 }, { x: 3.45, z: -8.3, s: 1.1 }, { x: 0.9, z: -10.3, s: 1.25 }],
  olive: { x: 3.9, z: -4.95 },
  poles: [{ x: -4.25, z: -8.7 }, { x: 0.0, z: -8.7 }, { x: 4.25, z: -8.7 }],
  fenceX: 4.6,
  wallX: -4.6,
};

export const SPAWN = { x: 0.82, z: 3.42, yaw: 0.64, pitch: -0.07 };

// Named zones for the location label (first match wins).
export const ZONES = [
  { name: "Terrace", test: (x, z) => z < ROOM.z0 - 0.05 },
  { name: "Coffee bar", test: (x, z) => x > 0.9 && z > 0.45 },
  { name: "Collector's corner", test: (x, z) => x > 0.2 && z < 0.45 },
  { name: "Accessory wall", test: (x, z) => x < -1.2 && z < -1.3 },
  { name: "Record wall", test: (x, z) => x < -1.95 && z >= -1.3 },
  { name: "Entrance", test: (x, z) => z > 2.7 && x > -1.0 },
  { name: "Listening table", test: () => true },
];

// ---------------------------------------------------------------------------
// Colliders: axis-aligned boxes in the XZ plane, shared by physics and the map.
// kind: wall | glass | furniture | door | outdoor
// ---------------------------------------------------------------------------
export function buildColliders() {
  const c = [];
  const add = (x0, z0, x1, z1, kind, label, id) => c.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), kind, label, id });
  const W = ROOM.wall;

  // shell
  add(ROOM.x0 - W, ROOM.z0 - W, ROOM.x0, ROOM.z1 + W, "wall");
  add(ROOM.x1, ROOM.z0 - W, ROOM.x1 + W, ROOM.z1 + W, "wall");
  add(ROOM.x0 - W, ROOM.z1, ROOM.x1 + W, ROOM.z1 + W, "wall");
  add(TERRACE.x0 - 0.3, ROOM.z0 - W, GLAZING.x0, ROOM.z0, "wall");
  add(GLAZING.x0, ROOM.z0 - W, GLAZING.doorX0, ROOM.z0, "glass");
  add(GLAZING.doorX1, ROOM.z0 - W, GLAZING.x1, ROOM.z0, "glass");
  add(GLAZING.x1, ROOM.z0 - W, TERRACE.x1 + 0.3, ROOM.z0, "wall");
  add(GLAZING.doorX0, ROOM.z0 - W, GLAZING.doorX1, ROOM.z0, "door", null, "terraceDoors");

  // interior furniture
  add(F.cabinet.x0, F.cabinet.z0, F.cabinet.x1, F.cabinet.z1, "furniture", "Records");
  add(F.sideboard.x0, F.sideboard.z0, F.sideboard.x1, F.sideboard.z1, "furniture", "Turntable");
  add(F.wallShelf.x0, F.wallShelf.z0, F.wallShelf.x1, F.wallShelf.z1, "furniture");
  add(F.stool.x - 0.2, F.stool.z - 0.2, F.stool.x + 0.2, F.stool.z + 0.2, "furniture");
  add(-3.5, F.pegboard.z0, -3.28, F.pegboard.z1, "furniture", "Pegboard");
  add(F.rack.x - 0.33, F.rack.z0 - 0.05, F.rack.x + 0.33, F.rack.z1 + 0.05, "furniture", "Rack");
  add(F.table.x0, F.table.z0, F.table.x1, F.table.z1, "furniture", "Table");
  add(F.island.x0, F.island.z0, F.island.x1, F.island.z1, "furniture", "New arrivals");
  add(F.steelShelf.x0 - 0.03, F.steelShelf.z0, F.steelShelf.x1 + 0.03, F.steelShelf.z1, "furniture", "Shelf");
  add(F.column.x0, F.column.z0, F.column.x1, F.column.z1, "wall");
  add(F.vitrine.x0, F.vitrine.z0, F.vitrine.x1, F.vitrine.z1, "furniture", "Vitrine");
  add(F.bench.x0, F.bench.z0, F.bench.x1, F.bench.z1, "furniture");
  add(F.barFront.x0, F.barFront.z0, F.barFront.x1, F.barFront.z1, "furniture", "Coffee bar");
  add(F.barBack.x0, F.barBack.z0, F.barBack.x1, F.barBack.z1, "furniture");
  for (const s of F.barStools) add(s.x - 0.19, s.z - 0.19, s.x + 0.19, s.z + 0.19, "furniture");
  add(F.windowLedge.x0, F.windowLedge.z0, F.windowLedge.x1, F.windowLedge.z1, "furniture");
  add(-0.34, 3.46, 0.14, 4.0, "furniture"); // fiddle-leaf fig by the entrance

  // terrace boundary + furniture
  add(TERRACE.x0 - 0.3, TERRACE.z0 - 0.3, T.wallX, TERRACE.z1, "wall");
  add(T.fenceX, TERRACE.z0 - 0.3, TERRACE.x1 + 0.3, TERRACE.z1, "wall");
  add(TERRACE.x0, T.planters.z0 - 0.3, TERRACE.x1, T.planters.z1, "outdoor", "Planters");
  add(T.bench.x0, T.bench.z0, T.bench.x1, T.bench.z1, "outdoor");
  for (const t of T.tables) add(t.x - 0.78, t.z - 0.42, t.x + 0.78, t.z + 0.42, "outdoor");
  for (const t of T.trees) if (t.z > T.planters.z0) add(t.x - 0.22, t.z - 0.22, t.x + 0.22, t.z + 0.22, "outdoor");
  add(T.olive.x - 0.36, T.olive.z - 0.36, T.olive.x + 0.36, T.olive.z + 0.36, "outdoor");
  add(T.wallX, -6.0, T.wallX + 0.55, -4.75, "outdoor"); // potted figs along the neighbour wall
  for (const p of T.poles) add(p.x - 0.08, p.z - 0.08, p.x + 0.08, p.z + 0.08, "outdoor");
  return c;
}
