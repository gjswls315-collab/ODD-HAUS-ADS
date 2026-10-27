import { HeroId } from '../gfx/art/heroines';
import { GlowColor } from '../gfx/sprites';

// Character and enemy data (docs/00 §6, docs/05 §5). Values are the documented initial proposals.

export interface CharDef {
  id: HeroId;
  name: string;
  nameKr: string;
  title: string;
  titleKr: string;
  role: string;
  roleKr: string;
  speed: number;
  hp: number;
  fireInterval: number;
  dpsMul: number;
  basic: string;
  charge: string;
  bomb: string;
  bombEn: string;
  bombInvuln: number;
  color: string;
  glow: GlowColor;
  sigil: 'cross' | 'moon' | 'rune';
  stats: [number, number, number, number];
  difficulty: number;
  difficultyLabel: string;
  tip: string;
  line: string;
}

export const CHARS: CharDef[] = [
  {
    id: 'seraphine', name: 'SERAPHINE', nameKr: '세라핀', title: 'Lance of Bound Light', titleKr: '빛을 잇는 성창',
    role: 'Balanced', roleKr: '밸런스형', speed: 180, hp: 3, fireInterval: 0.15, dpsMul: 1.0,
    basic: '직선형 성광탄 2연발', charge: '관통 성창 → 2중 대성창', bomb: '황금 성역', bombEn: 'GOLDEN SANCTUM', bombInvuln: 1.8,
    color: '#D8B35E', glow: 'gold', sigil: 'cross', stats: [6, 6, 7, 7], difficulty: 1, difficultyLabel: '입문 추천',
    tip: '초보자에게 추천하는 균형 잡힌 성기사', line: '빛이 꺼진 밤이라도, 나는 길을 잇는다.',
  },
  {
    id: 'noctis', name: 'NOCTIS', nameKr: '녹티스', title: 'Hunter of the Night', titleKr: '밤의 추적자',
    role: 'Speed', roleKr: '고속형', speed: 215, hp: 3, fireInterval: 0.12, dpsMul: 0.9,
    basic: '좁은 고속 3연사', charge: '직선 관통탄 → 그림자 낫 투척', bomb: '흑익 폭풍', bombEn: 'BLACKWING TEMPEST', bombInvuln: 1.5,
    color: '#7B5CC7', glow: 'silver', sigil: 'moon', stats: [6, 9, 6, 9], difficulty: 3, difficultyLabel: '숙련',
    tip: '빠르게 파고들어 먼저 베어라', line: '사냥은 이미 시작됐어.',
  },
  {
    id: 'morgana', name: 'MORGANA', nameKr: '모르가나', title: 'Witch of Ashes', titleKr: '재의 마녀',
    role: 'Spread', roleKr: '확산형', speed: 160, hp: 4, fireInterval: 0.18, dpsMul: 1.2,
    basic: '3갈래 확산 마탄 (Lv3 5갈래)', charge: '추적 영혼 3 → 영혼 구체 7', bomb: '망자의 합창', bombEn: 'CHOIR OF THE DEPARTED', bombInvuln: 2.0,
    color: '#A8326E', glow: 'pink', sigil: 'rune', stats: [8, 4, 9, 4], difficulty: 2, difficultyLabel: '중급',
    tip: '가까이 붙을수록 저주는 깊어진다', line: '잠들지 못한 자들이여, 노래하라.',
  },
];

export type EnemyKind = 'bat' | 'candle' | 'skeleton' | 'cleric' | 'sentinel';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  nameKr: string;
  hp: number;
  score: number;
  r: number;
  frames: number;
  fps: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  bat: { kind: 'bat', name: 'Wraith Bat', nameKr: '망령 박쥐', hp: 20, score: 100, r: 8, frames: 4, fps: 10 },
  candle: { kind: 'candle', name: 'Candle Revenant', nameKr: '악령 촛대', hp: 50, score: 200, r: 9, frames: 4, fps: 8 },
  skeleton: { kind: 'skeleton', name: 'Bell Acolyte', nameKr: '종지기 해골', hp: 150, score: 500, r: 14, frames: 2, fps: 0 },
  cleric: { kind: 'cleric', name: 'Scythe Cleric', nameKr: '흑사제', hp: 120, score: 600, r: 12, frames: 2, fps: 0 },
  sentinel: { kind: 'sentinel', name: 'Grave Sentinel', nameKr: '묘역 기사', hp: 500, score: 1500, r: 22, frames: 4, fps: 0 },
};

/** Bullet catalogue (docs/05 §6): hit radius, sprite, glow colour. */
export const BULLETS = {
  B01: { r: 3, spr: 'B01', glow: 'red' as GlowColor, gs: 10 },
  B02: { r: 4, spr: 'B02', glow: 'violet' as GlowColor, gs: 12 },
  B02r: { r: 4, spr: 'B02r', glow: 'red' as GlowColor, gs: 12 },
  B03: { r: 2, spr: 'B03', glow: 'red' as GlowColor, gs: 12 },
  B04: { r: 4, spr: 'B04', glow: 'cyan' as GlowColor, gs: 16 },
  B05: { r: 7, spr: 'B05', glow: 'violet' as GlowColor, gs: 22 },
  B06: { r: 5, spr: 'B06', glow: 'cyan' as GlowColor, gs: 14 },
} as const;
export type BulletType = keyof typeof BULLETS;

export const SCORE = {
  wipe: 2000,
  graze: 10,
  soul: 200,
  mote: 10,
  midboss: 10000,
  boss: 30000,
  phaseBonus: 5000,
  noMiss: 10000,
  noBomb: 10000,
  overflow: 5000,
  powerMax: 1000,
};
