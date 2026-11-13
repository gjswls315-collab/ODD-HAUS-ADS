import { create } from 'zustand'
import { BUDGET_DEFAULT, type BudgetRow } from './data/content'
import { DEFAULT_PARAMS, type Params } from './layout'

export type Mode = 'walk' | 'top' | 'tour' | 'front' | 'hall'

const BUDGET_KEY = 'dinos15-budget-v1'
function loadBudget(): BudgetRow[] {
  try {
    const s = localStorage.getItem(BUDGET_KEY)
    if (s) return JSON.parse(s)
  } catch { /* ignore */ }
  return BUDGET_DEFAULT
}
function saveBudget(b: BudgetRow[]) {
  try { localStorage.setItem(BUDGET_KEY, JSON.stringify(b)) } catch { /* ignore */ }
}

export interface LightPreset { id: string; label: string; desc: string; photo: number; spot: number; hall: number }
export const PRESETS: LightPreset[] = [
  { id: 'A', label: 'A 몰입', desc: '사진 최소 · 집행검 집중', photo: 0.16, spot: 1.15, hall: 0.15 },
  { id: 'B', label: 'B 균형', desc: '사진 은은 · 기본안', photo: 0.32, spot: 1.0, hall: 0.25 },
  { id: 'C', label: 'C 사진 강조', desc: '사진 밝게 · 조명 완화', photo: 0.7, spot: 0.7, hall: 0.35 },
]

interface State {
  params: Params
  mode: Mode
  nav: { id: string; n: number }
  showWalls: boolean
  showCeiling: boolean
  louverTransparency: number // 0 불투명 ~ 1 완전 투명
  photoBrightness: number
  spotIntensity: number
  hallLight: number
  preset: string | null
  selected: string | null
  offsets: Record<string, { dx: number; dz: number }>
  images: Record<string, string>
  budget: BudgetRow[]
  planOpen: boolean
  tourProgress: number
  setParam: (k: keyof Params, v: number) => void
  resetParams: () => void
  setMode: (m: Mode) => void
  goTo: (id: string) => void
  set: (s: Partial<State>) => void
  applyPreset: (id: string) => void
  select: (id: string | null) => void
  setOffset: (id: string, k: 'dx' | 'dz', v: number) => void
  setImage: (id: string, url: string | null) => void
  setBudget: (b: BudgetRow[]) => void
}

export const useStore = create<State>((set, get) => ({
  params: DEFAULT_PARAMS,
  mode: 'walk',
  nav: { id: 'entrance', n: 0 },
  showWalls: true,
  showCeiling: true,
  louverTransparency: 0.45,
  photoBrightness: 0.32,
  spotIntensity: 1,
  hallLight: 0.25,
  preset: 'B',
  selected: null,
  offsets: {},
  images: {},
  budget: loadBudget(),
  planOpen: false,
  tourProgress: 0,
  setParam: (k, v) => set({ params: { ...get().params, [k]: v } }),
  resetParams: () => set({ params: DEFAULT_PARAMS, offsets: {} }),
  setMode: (m) => set({ mode: m, tourProgress: 0 }),
  goTo: (id) => set({ mode: 'walk', nav: { id, n: get().nav.n + 1 } }),
  set: (s) => set(s),
  applyPreset: (id) => {
    const p = PRESETS.find((x) => x.id === id)
    if (p) set({ preset: id, photoBrightness: p.photo, spotIntensity: p.spot, hallLight: p.hall })
  },
  select: (id) => set({ selected: id }),
  setOffset: (id, k, v) => {
    const cur = get().offsets[id] ?? { dx: 0, dz: 0 }
    set({ offsets: { ...get().offsets, [id]: { ...cur, [k]: v } } })
  },
  setImage: (id, url) => {
    const images = { ...get().images }
    if (url) images[id] = url
    else delete images[id]
    set({ images })
  },
  setBudget: (b) => { saveBudget(b); set({ budget: b }) },
}))
