import { abaddonArm, abaddonBell, abaddonBody, ghostFaces } from './art/bosses';
import { batFrames, candleFrames, clericFrames, gravenFrames, sentinelFrames, skeletonFrames } from './art/enemies';
import { heroFrames, HeroId, heroKeyArt, heroPortrait } from './art/heroines';
import { bulletSprites, glowTexture, itemFrames, shotSprites } from './art/items';
import { silhouette } from './pix';

// Central sprite registry, filled once at boot.

type Frames = HTMLCanvasElement[];

export const ART = {
  hero: {} as Record<HeroId, Frames>,
  heroFlash: {} as Record<HeroId, Frames>,
  heroBig: {} as Record<HeroId, HTMLCanvasElement>,
  heroKey: {} as Record<HeroId, HTMLCanvasElement>,
  heroCard: {} as Record<HeroId, HTMLCanvasElement>,
  enemy: {} as Record<string, Frames>,
  enemyFlash: {} as Record<string, Frames>,
  boss: {} as {
    body: HTMLCanvasElement;
    bodyFlash: HTMLCanvasElement;
    bell: HTMLCanvasElement[];
    faces: HTMLCanvasElement[];
    arm: Record<string, HTMLCanvasElement>;
    armBack: HTMLCanvasElement;
  },
  item: {} as Record<string, Frames>,
  bullet: {} as Record<string, HTMLCanvasElement>,
  shot: {} as Record<string, HTMLCanvasElement>,
  glow: {} as Record<string, HTMLCanvasElement>,
};

export const GLOW_COLORS = {
  gold: '#FFD47A',
  red: '#FF3A50',
  violet: '#9A6BFF',
  cyan: '#5FE0FF',
  white: '#FFFFFF',
  pink: '#FF7AC8',
  silver: '#C8D8FF',
  orange: '#FF8A3A',
  green: '#6AFFC0',
} as const;
export type GlowColor = keyof typeof GLOW_COLORS;

export function buildArt() {
  for (const id of ['seraphine', 'noctis', 'morgana'] as HeroId[]) {
    ART.hero[id] = heroFrames(id);
    ART.heroFlash[id] = ART.hero[id].map((c) => silhouette(c, '#FFFFFF'));
    ART.heroBig[id] = heroPortrait(id, 4);
    ART.heroKey[id] = heroKeyArt(id, 5, -0.22);
    ART.heroCard[id] = heroKeyArt(id, 2.5, -0.22);
  }
  ART.enemy.bat = batFrames();
  ART.enemy.candle = candleFrames();
  ART.enemy.skeleton = skeletonFrames();
  ART.enemy.cleric = clericFrames();
  ART.enemy.sentinel = sentinelFrames();
  ART.enemy.graven = gravenFrames();
  for (const k of Object.keys(ART.enemy)) ART.enemyFlash[k] = ART.enemy[k].map((c) => silhouette(c, '#FFFFFF'));
  const body = abaddonBody();
  ART.boss = {
    body,
    bodyFlash: silhouette(body, '#FFFFFF'),
    bell: [0, 1, 2, 3].map((n) => abaddonBell(n)),
    faces: [ghostFaces(0), ghostFaces(1)],
    arm: { down: abaddonArm('down'), raise: abaddonArm('raise'), reach: abaddonArm('reach') },
    armBack: abaddonArm('down', true),
  };
  for (const k of ['P', 'H', 'B', 'S'] as const) ART.item[k] = itemFrames(k);
  ART.bullet = bulletSprites();
  ART.shot = shotSprites();
  for (const [k, c] of Object.entries(GLOW_COLORS)) ART.glow[k] = glowTexture(c);
}
