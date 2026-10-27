// World is drawn at 640x360 logical pixels; UI is laid out in 1920x1080 design pixels (see docs/00_overview.md §3).
export const W = 640;
export const H = 360;
export const UW = 1920;
export const UH = 1080;
export const STEP = 1 / 60;

// Design tokens (docs/00_overview.md §4)
export const C = {
  charcoal: '#111217',
  blueblack: '#171C26',
  violetdark: '#241B31',
  blood: '#B3263B',
  gold: '#D8B35E',
  violet: '#7B5CC7',
  cyan: '#59B7C9',
  ivory: '#E9E1D3',
  sub: '#B9B3AA',
  warn: '#D94C3A',
  frame: '#5A4A2E',
  empty: '#2A2733',
  outline: '#0B0B0F',
  hpOk: '#59B7C9',
  hpCaution: '#E0913A',
  hpDanger: '#D94C3A',
  itemP: '#D8B35E',
  itemH: '#5FD1A8',
  itemB: '#B3263B',
  itemS: '#9D86E0',
  goldLight: '#F3E6C4',
  letterbox: '#0B0B0F',
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
