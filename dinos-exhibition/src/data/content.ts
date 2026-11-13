// 전시 콘텐츠 데이터.
// image 에 public/assets 아래 경로(예: 'assets/history-2011.jpg')를 넣으면
// 플레이스홀더 대신 실제 이미지가 표시됩니다. (앱 안에서 업로드로도 교체 가능)

export interface HistoryEntry {
  id: string
  year: string
  title: string
  image?: string
}

// 공개적으로 널리 알려진 구단 주요 연혁만 표기. 세부 문안·수치는 구단 확인 후 입력.
export const HISTORY: HistoryEntry[] = [
  { id: 'h-2011', year: '2011', title: '창단' },
  { id: 'h-2013', year: '2013', title: 'KBO 1군 리그 진입' },
  { id: 'h-2014', year: '2014', title: '첫 포스트시즌 진출' },
  { id: 'h-2016', year: '2016', title: '첫 한국시리즈 진출' },
  { id: 'h-2019', year: '2019', title: '창원NC파크 개장' },
  { id: 'h-2020', year: '2020', title: '창단 첫 통합 우승' },
]
export const HISTORY_BODY = '세부 기록 · 문안\n구단 확인 후 입력'

export interface FrameEntry {
  id: string
  year: string
  w: number // m
  h: number // m
  cy: number // 액자 중심 높이 (m)
  image?: string
}

// 패밀리데이 기념 액자 8점 — 모두 세로형, 크기·높이 상이 (실측 전 임시 치수)
export const FRAMES: FrameEntry[] = [
  { id: 'f-2014', year: '2014', w: 0.42, h: 0.6, cy: 1.52 },
  { id: 'f-2015', year: '2015', w: 0.5, h: 0.72, cy: 1.58 },
  { id: 'f-2016', year: '2016', w: 0.46, h: 0.66, cy: 1.47 },
  { id: 'f-2017', year: '2017', w: 0.56, h: 0.8, cy: 1.55 },
  { id: 'f-2020', year: '2020', w: 0.6, h: 0.9, cy: 1.6 },
  { id: 'f-2021', year: '2021', w: 0.44, h: 0.62, cy: 1.5 },
  { id: 'f-2022', year: '2022', w: 0.52, h: 0.76, cy: 1.56 },
  { id: 'f-2023', year: '2023', w: 0.48, h: 0.7, cy: 1.49 },
]

export interface UniformEntry {
  id: string
  name: string
  base: string
  sleeve: string
  trim: string
  text: string
  pinstripe?: boolean
  image?: string // 유니폼 정면 이미지 (교체 슬롯)
}

const U = (
  n: number, base: string, sleeve: string, trim: string, text: string, pinstripe = false,
): UniformEntry => ({
  id: `u-${String(n).padStart(2, '0')}`,
  name: `유니폼 ${String(n).padStart(2, '0')}`,
  base, sleeve, trim, text, pinstripe,
})

// 색상은 배치 확인용 플레이스홀더. 실제 20벌 목록·이미지는 구단 제공분으로 교체.
export const UNIFORMS: UniformEntry[] = [
  U(1, '#f1ede4', '#f1ede4', '#1b2b4d', '#1b2b4d'),
  U(2, '#1b2b4d', '#1b2b4d', '#b89b69', '#e8e2d6'),
  U(3, '#f1ede4', '#1b2b4d', '#b89b69', '#1b2b4d', true),
  U(4, '#8fb6dc', '#8fb6dc', '#1b2b4d', '#1b2b4d'),
  U(5, '#c9c4b8', '#c9c4b8', '#1b2b4d', '#1b2b4d'),
  U(6, '#1b2b4d', '#b89b69', '#b89b69', '#b89b69'),
  U(7, '#f1ede4', '#f1ede4', '#b89b69', '#1b2b4d'),
  U(8, '#22252c', '#22252c', '#b89b69', '#b89b69'),
  U(9, '#f1ede4', '#8fb6dc', '#1b2b4d', '#1b2b4d'),
  U(10, '#2c4f86', '#2c4f86', '#e8e2d6', '#e8e2d6'),
  U(11, '#d8c9a6', '#d8c9a6', '#1b2b4d', '#1b2b4d'),
  U(12, '#f1ede4', '#f1ede4', '#2c4f86', '#2c4f86', true),
  U(13, '#1b2b4d', '#1b2b4d', '#8fb6dc', '#8fb6dc'),
  U(14, '#8fb6dc', '#1b2b4d', '#e8e2d6', '#1b2b4d'),
  U(15, '#f1ede4', '#22252c', '#b89b69', '#22252c'),
  U(16, '#5d6b63', '#5d6b63', '#e8e2d6', '#e8e2d6'),
  U(17, '#f1ede4', '#f1ede4', '#1b2b4d', '#b89b69'),
  U(18, '#1b2b4d', '#e8e2d6', '#b89b69', '#e8e2d6'),
  U(19, '#c9c4b8', '#1b2b4d', '#b89b69', '#1b2b4d', true),
  U(20, '#f1ede4', '#1b2b4d', '#b89b69', '#1b2b4d'),
]

export interface BudgetRow {
  id: string
  item: string
  note: string
  estimate: number // 추정 금액 (만원, VAT 포함)
  quote: number | null // 실제 견적 (만원, VAT 포함) — 미수령 시 null
}

// 시안 기준 추정치. 실제 견적 수령 시 '실제 견적' 칸에 입력.
export const BUDGET_DEFAULT: BudgetRow[] = [
  { id: 'b1', item: '가벽 · 구조 · 마감', note: '메인룸 모듈 가벽, 입구 루버 가림막, 암막 천장', estimate: 550, quote: null },
  { id: 'b2', item: '쇼케이스 대여', note: '집행검 1, 트로피 2, 기념품 전시대 2, 소형 케이스', estimate: 350, quote: null },
  { id: 'b3', item: '그래픽 제작 · 출력', note: '연혁 패널, 타이틀, 배경 사진, 명패', estimate: 220, quote: null },
  { id: 'b4', item: '유니폼 토르소 대여', note: '남성 상반신 토르소 20개 + 스탠드', estimate: 180, quote: null },
  { id: 'b5', item: '조명 · 전기', note: '클립형 스포트, 간접 LED 바 (기존 홀 조명 활용)', estimate: 180, quote: null },
  { id: 'b6', item: '운송 · 설치 · 철수', note: '', estimate: 220, quote: null },
  { id: 'b7', item: '예비비', note: '현장 조정', estimate: 100, quote: null },
]
export const BUDGET_LIMIT = 2000

// 캔버스 텍스처에 쓰이는 글자를 미리 로드하기 위한 문자열
export const ALL_TEXT =
  JSON.stringify([HISTORY, FRAMES, UNIFORMS.map((u) => u.name), HISTORY_BODY]) +
  '다이노스 히스토리 아카이브 역대 패밀리데이 유니폼 사진 교체 슬롯 이미지 양의지 선수 집행검 세리머니 원본 ' +
  '우승 트로피 반지 기념품 주년 명칭 입력 퀴즈 팬사인회 운영 구역 임시 배치 창단 통합 한국시리즈 당시 ' +
  '0123456789 THE ROAD TO GLORY LEGACY ROOM CHAMPIONS ANNIVERSARY FAMILY DAY HISTORY UNIFORM ARCHIVE NC DINOS OX'
