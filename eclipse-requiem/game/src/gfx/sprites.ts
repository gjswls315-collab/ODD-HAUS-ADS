import { PAL } from './palette';

// Sheet keys and shared art types. All graphics are files under game/assets (see assets/README.md);
// this module only names them.

export type HeroId = 'seraphine' | 'noctis' | 'morgana';
export const HEROES: HeroId[] = ['seraphine', 'noctis', 'morgana'];

export const SHEET = {
  hero: (id: HeroId) => 'sprites/hero_' + id,
  heroFx: (id: HeroId) => 'sprites/hero_' + id + '_fx',
  enemies: 'sprites/enemies',
  boss: 'sprites/boss_abaddon',
  bullets: 'sprites/bullets',
  items: 'sprites/items',
  fx: 'sprites/fx',
  hud: 'ui/hud',
  portraits: 'ui/portraits',
  logo: 'ui/logo',
} as const;

/** Accent ramps per character / effect (palette ramp ids). Kept as a name for older call sites. */
export type GlowColor = 'gold' | 'red' | 'violet' | 'cyan' | 'white' | 'pink' | 'silver' | 'orange' | 'green';

/** Light, mid and dark accent of each effect colour, from the palette. */
export const ACCENT: Record<GlowColor, [string, string, string]> = {
  gold: [PAL.G4, PAL.G2, PAL.G1],
  red: [PAL.R5, PAL.R3, PAL.R1],
  violet: [PAL.M2, PAL.M0, PAL.S4],
  cyan: [PAL.A4, PAL.A2, PAL.A1],
  white: [PAL.N11, PAL.N9, PAL.N6],
  pink: [PAL.V4, PAL.V2, PAL.V1],
  silver: [PAL.A4, PAL.A3, PAL.A1],
  orange: [PAL.R6, PAL.R4, PAL.R2],
  green: [PAL.V4, PAL.V2, PAL.V1],
};
