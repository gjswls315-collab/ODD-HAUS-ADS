// World is drawn at 640x360 logical pixels; UI is laid out in 1920x1080 design pixels (see docs/00_overview.md §3).
export const W = 640;
export const H = 360;
export const UW = 1920;
export const UH = 1080;
export const STEP = 1 / 60;

// Design tokens (docs/00_overview.md §4)
export const C = {
  // UI colour tokens, mapped onto the v2 palette (assets/palette.json)
  charcoal: '#0E1015', // N1
  blueblack: '#101A27', // S1
  violetdark: '#20242C', // N3 (focus row)
  blood: '#8C1223', // R2
  gold: '#D9AD52', // G2
  violet: '#7F93A8', // M0
  cyan: '#3698D6', // A2
  ivory: '#D9CDB6', // B4
  sub: '#838B97', // N8
  warn: '#FF4152', // R4
  frame: '#2B3039', // N4
  empty: '#161920', // N2
  outline: '#07080B', // N0
  hpOk: '#3698D6', // A2
  hpCaution: '#D9AD52', // G2
  hpDanger: '#FF4152', // R4
  itemP: '#D9AD52',
  itemH: '#349E6E',
  itemB: '#C91C30',
  itemS: '#B7C6D5',
  goldLight: '#F2D58C', // G3
  letterbox: '#07080B',
} as const;

export const T = {
  instant: 0.08,
  fast: 0.12,
  base: 0.2,
  slow: 0.4,
  reveal: 0.8,
} as const;

export const FONT = {
  display: '"Cinzel", "Times New Roman", serif',
  serif: '"Noto Serif KR", "Nanum Myeongjo", "Batang", serif',
  sans: '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
} as const;
