// Shared materials. Built once after the brand images and fonts are loaded.
import * as THREE from "three";
import * as TX from "./textures.js";
import * as B from "./brand.js";

const { tex } = TX;
export const M = {};
export const T = {}; // textures that builders need directly

const std = (o) => new THREE.MeshStandardMaterial(o);
const phys = (o) => new THREE.MeshPhysicalMaterial(o);

export function buildMaterials() {
  // --- surfaces ---
  const plasterC = TX.plaster();
  M.plaster = std({ map: tex(plasterC), roughness: 0.93 });
  M.plasterExt = std({ map: tex(TX.plaster("#e4d6bb", 17)), roughness: 0.95 });

  const floorMap = tex(TX.concreteFloor());
  const floorRough = tex(TX.concreteFloorRough(), { srgb: false });
  M.floor = std({ map: floorMap, roughnessMap: floorRough, roughness: 0.95, metalness: 0, envMapIntensity: 1.25 });

  const board = TX.boardConcrete();
  M.ceiling = std({ map: tex(board), roughness: 0.95 });
  M.concrete = std({ map: tex(TX.boardConcrete(37, "#a19a90")), roughness: 0.9 });
  M.concreteWall = std({ map: tex(TX.concreteBlock()), roughness: 0.92 });

  const walnutC = TX.wood({});
  M.walnut = std({ map: tex(walnutC), roughness: 0.48, envMapIntensity: 0.8 });
  M.walnutDark = std({ map: tex(walnutC), color: 0x9c8a80, roughness: 0.5, envMapIntensity: 0.8 });
  const oakC = TX.wood({ dark: "#a9783f", light: "#d9b07a", seed: 47, rings: 14 });
  M.oak = std({ map: tex(oakC), roughness: 0.55 });
  M.deck = std({ map: tex(TX.deck()), roughness: 0.82 });

  const tile = TX.greenTile();
  T.tileMap = tex(tile.map); T.tileNormal = tex(tile.normal, { srgb: false });
  M.tile = phys({ map: T.tileMap, normalMap: T.tileNormal, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2 });

  const brushed = tex(TX.brushedSteel(), { srgb: false });
  M.steel = std({ color: 0xd2d2cf, metalness: 1, roughness: 0.3, roughnessMap: brushed, envMapIntensity: 3.2 });
  M.chrome = std({ color: 0xe6e6e6, metalness: 1, roughness: 0.14, envMapIntensity: 3.0 });
  M.galv = std({ map: tex(TX.galvanized()), metalness: 0.75, roughness: 0.42, envMapIntensity: 2.6 });
  M.brass = std({ color: 0xc8994a, metalness: 1, roughness: 0.28, envMapIntensity: 2.6 });
  M.blackMetal = std({ color: 0x18191a, metalness: 0.55, roughness: 0.42 });
  M.blackMatte = std({ color: 0x121212, roughness: 0.75 });
  M.darkMetal = std({ color: 0x2a2b2d, metalness: 0.7, roughness: 0.35, envMapIntensity: 2.0 });

  M.rug = std({ map: tex(TX.rug(), { wrap: false }), roughness: 1 });
  M.glass = phys({ color: 0xffffff, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.12, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
  M.glassTint = phys({ color: 0xd9e6dc, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.2, envMapIntensity: 1.4, depthWrite: false, side: THREE.DoubleSide });
  M.acrylic = phys({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.16, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
  const reed = tex(TX.reededGlass());
  reed.repeat.set(10, 1);
  M.reeded = std({ color: 0xaab6c6, emissive: 0xc8d4e4, emissiveMap: reed, emissiveIntensity: 0.38, map: reed, roughness: 0.15, transparent: true, opacity: 0.95 });

  M.vinyl = phys({ color: 0x0c0c0c, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const grooves = tex(B.vinylGrooves(), { wrap: false });
  M.vinylGrooves = phys({ map: grooves, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  M.rubber = std({ color: 0x141414, roughness: 0.92 });
  M.ceramic = phys({ color: 0xf3eee3, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  M.ceramicNavy = phys({ color: 0x1f2b45, roughness: 0.25, clearcoat: 0.8 });
  M.terracotta = std({ color: 0xb4643f, roughness: 0.85 });
  M.potCream = phys({ color: 0xe8dcc4, roughness: 0.4, clearcoat: 0.4 });
  M.potConcrete = std({ map: M.concrete.map, color: 0xd0cbc2, roughness: 0.9 });
  M.soil = std({ color: 0x2c1f16, roughness: 1 });
  M.paper = std({ color: 0xf0e9da, roughness: 0.85 });
  M.cardboard = std({ color: 0xb8936a, roughness: 0.9 });
  M.kraft = std({ color: 0xa98457, roughness: 0.9 });
  M.candle = phys({ color: 0xf6efe0, roughness: 0.35, transmission: 0, sheen: 0.3 });
  M.flame = std({ color: 0x000000, emissive: 0xffb150, emissiveIntensity: 6 });
  M.leather = std({ color: 0x5a3320, roughness: 0.6 });
  M.cushion = std({ map: tex(B.fabric("#c9b58f", 3)), roughness: 1 });

  // --- fabric & brand colours ---
  M.navyFabric = std({ map: tex(B.fabric(TX.PAL.navy, 2)), roughness: 0.95 });
  M.creamFabric = std({ map: tex(B.fabric("#efe4cc", 4)), roughness: 0.95 });
  M.burgundyFabric = std({ map: tex(B.fabric(TX.PAL.burgundy, 6)), roughness: 0.95 });
  M.forestFabric = std({ map: tex(B.fabric("#2b4a35", 8)), roughness: 0.95 });
  M.greyFabric = std({ map: tex(B.fabric("#8d8a84", 10)), roughness: 0.95 });
  M.navyPaint = std({ color: 0x1f2b45, roughness: 0.6 });
  M.redPaint = std({ color: 0xa6382a, roughness: 0.6 });
  M.creamPaint = std({ color: 0xefe3c8, roughness: 0.6 });

  // --- brand ---
  M.mural = std({ map: B.muralTexture(), transparent: true, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
  M.stripeRed = std({ color: 0xa6382a, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1 });
  M.stripeNavy = std({ color: 0x1f2b45, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1 });
  const lb = tex(B.lightboxFace(), { wrap: false });
  M.lightbox = std({ map: lb, emissive: 0xffffff, emissiveMap: lb, emissiveIntensity: 0.95, roughness: 0.4 });
  T.capNavy = tex(B.capFront(TX.PAL.cream, TX.PAL.navy), { wrap: false });
  M.capNavy = std({ map: T.capNavy, roughness: 0.9 });
  T.mugPrint = tex(B.mugPrint(), { wrap: false });
  M.mug = phys({ map: T.mugPrint, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.08 });
  M.tote = std({ map: tex(B.toteFace(), { wrap: false }), roughness: 0.98, side: THREE.DoubleSide });
  M.menu = std({ map: tex(B.menuBoard(), { wrap: false }), roughness: 0.7 });
  M.openSign = std({ map: tex(B.openSign(), { wrap: false }), roughness: 0.7 });
  M.windowVinyl = std({ map: tex(B.windowVinyl(), { wrap: false }), transparent: true, roughness: 0.6, depthWrite: false });
  M.coffeeBag = std({ map: tex(B.coffeeBag(), { wrap: false }), roughness: 0.85 });
  M.coffeeBagDark = std({ map: tex(B.coffeeBag("#3a3330"), { wrap: false }), roughness: 0.6 });
  M.valance = std({ map: tex(B.awningValance(), { wrap: false }), roughness: 0.95 });
  M.newArrivals = std({ map: tex(B.newArrivals(), { wrap: false }), roughness: 0.7 });
  M.aBoard = std({ map: tex(B.aBoard(), { wrap: false }), roughness: 0.85 });
  const lbl = tex(B.recordLabel(), { wrap: false });
  M.recordLabel = std({ map: lbl, roughness: 0.6 });
  M.figTop = std({ map: tex(B.figureBoxArt("top"), { wrap: false }), roughness: 0.6 });
  M.figBottom = std({ map: tex(B.figureBoxArt("bottom"), { wrap: false }), roughness: 0.6 });
  M.figBack = std({ map: tex(B.figureBoxArt("back"), { wrap: false }), roughness: 0.75 });
  M.figSide = std({ map: tex(B.figureBoxArt("side"), { wrap: false }), roughness: 0.6 });
  M.figRed = std({ color: 0x9e2f24, roughness: 0.6 });
  for (const k of ["script", "mascot", "jdv", "burgundy"]) M[`print_${k}`] = std({ map: tex(B.sweatPrint(k), { wrap: false }), roughness: 0.95 });

  // records + books
  T.catalogue = B.recordCatalogue(64);
  T.covers = tex(B.coverAtlas(T.catalogue), { wrap: false });
  T.spines = tex(B.spineAtlas(), { wrap: false });
  M.book = std({ map: T.spines, roughness: 0.8 });
  M.bookPages = std({ color: 0xeee5d0, roughness: 0.9 });

  // --- lighting fixtures ---
  M.lampGlass = std({ color: 0xfff4e0, emissive: 0xffd9a0, emissiveIntensity: 1.15, roughness: 0.3 });
  M.lampAmber = phys({ color: 0xd9902e, emissive: 0xffa040, emissiveIntensity: 1.0, roughness: 0.15, clearcoat: 1 });
  M.bulb = std({ color: 0xffffff, emissive: 0xffc77a, emissiveIntensity: 8 });
  M.spotLens = std({ color: 0x000000, emissive: 0xffd7a0, emissiveIntensity: 5 });
  M.enamelGreen = phys({ color: 0x3d6040, roughness: 0.25, metalness: 0.1, clearcoat: 0.8, side: THREE.DoubleSide });
  M.enamelInside = std({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 0.6, roughness: 0.5, side: THREE.BackSide });

  // --- foliage ---
  const leafTex = tex(TX.pothosLeaf(3), { wrap: false });
  M.pothos = std({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, envMapIntensity: 0.6 });
  M.broadLeaf = std({ map: tex(TX.broadLeaf(), { wrap: false }), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.45 });
  M.foliage = std({ map: tex(TX.foliageCluster(5), { wrap: false }), alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.8, emissive: 0x7a8a20, emissiveIntensity: 0.16 });
  M.foliage.emissiveMap = M.foliage.map;
  M.olive = std({ map: tex(TX.foliageCluster(9, 1), { wrap: false }), color: 0xb8c4a8, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.85 });
  M.stem = std({ color: 0x4d6b2a, roughness: 0.7 });
  M.bark = std({ color: 0x5e4c3e, roughness: 0.95 });

  // --- mascot vinyl paint ---
  M.skin = phys({ color: 0xf0c8a0, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  M.hair = phys({ color: 0x2a201c, roughness: 0.5, clearcoat: 0.3 });
  M.eyeWhite = phys({ color: 0xf7f3ea, roughness: 0.3, clearcoat: 0.5 });
  M.ink = std({ color: 0x15161a, roughness: 0.4 });
  M.cheek = std({ color: 0xe39b7d, roughness: 0.5 });
  return M;
}

/** Records InstancedMesh material: per-instance sleeve from the cover atlas. */
export function recordMaterial() {
  const mat = new THREE.MeshStandardMaterial({ map: T.covers, roughness: 0.62, envMapIntensity: 0.6 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float coverIdx;")
      .replace("#include <uv_vertex>", `#include <uv_vertex>
#ifdef USE_MAP
{
  vec2 u = uv; float idx = coverIdx;
  if (u.x > 1.5) { idx = 63.0; u.x -= 2.0; }          // back face: generic back cover
  else if (u.x < -0.5) { u = vec2(0.02 + 0.01 * u.y, u.y); } // edges: sleeve edge colour
  float cx = mod(idx, 8.0), cy = floor(idx / 8.0);
  vMapUv = vec2((cx + clamp(u.x, 0.004, 0.996)) / 8.0, (7.0 - cy + clamp(u.y, 0.004, 0.996)) / 8.0);
}
#endif`);
  };
  return mat;
}

/** Books InstancedMesh material: per-instance spine from the spine atlas. */
export function bookMaterial() {
  const mat = new THREE.MeshStandardMaterial({ map: T.spines, roughness: 0.78 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float spineIdx;")
      .replace("#include <uv_vertex>", `#include <uv_vertex>
#ifdef USE_MAP
{
  vec2 u = uv;
  float cx = mod(spineIdx, 32.0), cy = floor(spineIdx / 32.0);
  if (u.x < -0.5) { vMapUv = vec2((31.0 + 0.2 + u.y * 0.6) / 32.0, 0.5 / 4.0); }       // page block: cell 127 is page paper
  else vMapUv = vec2((cx + u.x) / 32.0, (3.0 - cy + u.y) / 4.0);
}
#endif`);
  };
  return mat;
}
