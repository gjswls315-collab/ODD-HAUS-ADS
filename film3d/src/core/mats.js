// Shared physically-based materials. Cached so identical looks share one material.
import * as THREE from "three";

const cache = new Map();

function key(o) {
  return JSON.stringify(o, (k, v) => (v && v.isTexture ? v.uuid : v));
}

/** Standard / physical material factory with sensible defaults. */
export function mat(opts = {}) {
  const k = key(opts);
  if (cache.has(k)) return cache.get(k);
  const { physical = false, ...rest } = opts;
  const params = { roughness: 0.6, metalness: 0, ...rest };
  if (params.color !== undefined) params.color = new THREE.Color(params.color);
  if (params.emissive !== undefined) params.emissive = new THREE.Color(params.emissive);
  if (params.sheenColor !== undefined) params.sheenColor = new THREE.Color(params.sheenColor);
  const m = physical || params.clearcoat || params.sheen || params.transmission
    ? new THREE.MeshPhysicalMaterial(params)
    : new THREE.MeshStandardMaterial(params);
  cache.set(k, m);
  return m;
}

export const M = {
  glove: () => mat({ color: "#f3efe6", roughness: 0.62, sheen: 0.4, sheenColor: "#ffffff", sheenRoughness: 0.6 }),
  limb: () => mat({ color: "#111113", roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.6 }),
  eyeWhite: () => mat({ color: "#fbf9f4", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
  pupil: () => mat({ color: "#070708", roughness: 0.15, clearcoat: 1 }),
  catchlight: () => {
    const k = "catchlight";
    if (!cache.has(k)) cache.set(k, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 1.45) }));
    return cache.get(k);
  },
  skin: (c = "#efc3a0") => mat({ color: c, roughness: 0.52, sheen: 0.35, sheenColor: "#ff9a80", sheenRoughness: 0.5 }),
  cloth: (c, rough = 0.85, extra = {}) => mat({ color: c, roughness: rough, sheen: 0.5, sheenColor: c, sheenRoughness: 0.8, ...extra }),
  rubber: (c = "#f2f0ea") => mat({ color: c, roughness: 0.7 }),
  metal: (c = "#c9c9c9", rough = 0.3) => mat({ color: c, roughness: rough, metalness: 1 }),
  lacquer: (c, extra = {}) => mat({ color: c, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.18, ...extra }),
  plastic: (c, rough = 0.4, extra = {}) => mat({ color: c, roughness: rough, clearcoat: 0.4, clearcoatRoughness: 0.4, ...extra }),
  emissive: (c, intensity = 1) => mat({ color: "#000000", emissive: c, emissiveIntensity: intensity, roughness: 1 }),
};
