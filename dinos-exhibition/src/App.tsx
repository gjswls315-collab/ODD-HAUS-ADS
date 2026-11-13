import { useEffect, useState } from 'react'
import { ALL_TEXT } from './data/content'
import { useStore, type Mode } from './store'
import { Scene } from './three/Scene'
import { MiniMap, PlanModal } from './ui/FloorPlan'
import { RightPanel } from './ui/RightPanel'

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'walk', label: '자유 이동', hint: 'WASD 이동 · 드래그로 시선 · Shift 빠르게' },
  { id: 'top', label: '조감도', hint: '드래그 회전 · 휠 확대 · 우클릭 이동' },
  { id: 'tour', label: '자동 투어', hint: '입구 → 메인룸 자동 이동' },
  { id: 'front', label: '메인룸 정면', hint: '집행검 중심 시점 · 드래그로 둘러보기' },
  { id: 'hall', label: '컨벤션홀 시점', hint: '행사장에서 본 전시 · 드래그로 둘러보기' },
]
const ZONES = [
  { id: 'entrance', n: '0', en: 'ENTRANCE', ko: '입구 · 인트로' },
  { id: 'history', n: '1', en: 'HISTORY ARCHIVE', ko: '다이노스 역사 기록' },
  { id: 'family', n: '2', en: 'FAMILY DAY ARCHIVE', ko: '패밀리데이 액자 8점' },
  { id: 'uniform', n: '3', en: 'UNIFORM ARCHIVE', ko: '유니폼 20벌 · 개방형' },
  { id: 'legacy', n: '4', en: 'THE LEGACY ROOM', ko: '메인룸 진입부 · 가림막' },
]

function screenshot() {
  const c = document.querySelector('canvas')
  if (!c) return
  const a = document.createElement('a')
  const t = new Date()
  const stamp = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}-${String(t.getHours()).padStart(2, '0')}${String(t.getMinutes()).padStart(2, '0')}${String(t.getSeconds()).padStart(2, '0')}`
  a.download = `dinos15-exhibition-${useStore.getState().mode}-${stamp}.png`
  a.href = c.toDataURL('image/png')
  a.click()
}

export default function App() {
  const [ready, setReady] = useState(false)
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const goTo = useStore((s) => s.goTo)
  const nav = useStore((s) => s.nav)
  const progress = useStore((s) => s.tourProgress)
  const planOpen = useStore((s) => s.planOpen)

  // 캔버스 텍스처가 한글·디스플레이 서체로 그려지도록 폰트를 먼저 로드
  useEffect(() => {
    const fonts = [
      '400 20px "Noto Sans KR"', '500 20px "Noto Sans KR"', '700 20px "Noto Sans KR"',
      '500 20px "Cormorant Garamond"', 'italic 500 20px "Cormorant Garamond"', 'italic 700 20px "Cormorant Garamond"',
    ]
    const timeout = new Promise((r) => setTimeout(r, 4000))
    Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f, ALL_TEXT))), timeout])
      .catch(() => {}).finally(() => setReady(true))
  }, [])

  const hint = MODES.find((m) => m.id === mode)!.hint
  return (
    <div className="relative w-full h-full select-none">
      <div className="absolute inset-0">{ready && <Scene />}</div>
      {!ready && <div className="absolute inset-0 flex items-center justify-center text-warm/60 text-sm">전시 공간을 불러오는 중…</div>}

      <div className="absolute inset-0 pointer-events-none">
        {/* 상단 바 */}
        <div className="panel absolute top-3 left-3 right-3 h-[46px] flex items-center px-4 gap-4 pointer-events-auto">
          <div className="flex items-baseline gap-2.5 shrink-0">
            <span className="font-display italic text-[21px] leading-none text-warm">NC Dinos 15th Anniversary</span>
            <span className="text-[10px] tracking-[0.22em] text-gold">THE ROAD TO GLORY</span>
          </div>
          <div className="flex-1 flex justify-center gap-1">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`px-3 py-1.5 rounded text-[12px] ${mode === m.id ? 'bg-gold text-navy font-bold' : 'text-warm/75 hover:bg-warm/10'}`}>
                {m.label}
              </button>
            ))}
          </div>
          <button onClick={() => useStore.getState().set({ planOpen: true })}
            className="px-3 py-1.5 rounded text-[12px] border border-warm/20 text-warm/80 hover:bg-warm/10">평면도</button>
          <button onClick={screenshot}
            className="px-3 py-1.5 rounded text-[12px] border border-gold/60 text-gold hover:bg-gold/15">스크린샷 저장</button>
        </div>

        {/* 좌측 구역 이동 */}
        <div className="panel absolute left-3 top-[68px] w-[212px] p-2.5 pointer-events-auto">
          <div className="text-[10px] tracking-[0.18em] text-gold/80 px-1.5 pb-2">ZONES · 전시 구역 이동</div>
          {ZONES.map((z) => {
            const on = mode === 'walk' && nav.id === z.id && nav.n > 0
            return (
              <button key={z.id} onClick={() => goTo(z.id)}
                className={`w-full flex items-center gap-2.5 px-1.5 py-2 rounded text-left ${on ? 'bg-gold/15' : 'hover:bg-warm/5'}`}>
                <span className={`w-6 h-6 shrink-0 rounded-full border text-[11px] flex items-center justify-center ${on ? 'border-gold bg-gold text-navy font-bold' : 'border-gold/50 text-gold'}`}>{z.n}</span>
                <span>
                  <span className="block text-[11px] tracking-wide text-warm">{z.en}</span>
                  <span className="block text-[10px] text-warm/50">{z.ko}</span>
                </span>
              </button>
            )
          })}
          <div className="border-t border-gold/15 mt-2 pt-2 px-1.5 text-[10px] text-warm/50 leading-relaxed">{hint}</div>
          {mode === 'tour' && (
            <div className="mx-1.5 mt-2 h-1 bg-warm/10 rounded overflow-hidden">
              <div className="h-full bg-gold" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </div>

        <RightPanel />
        {!planOpen && <MiniMap />}
        <PlanModal />
      </div>
    </div>
  )
}
