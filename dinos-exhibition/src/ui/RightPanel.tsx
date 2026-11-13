import { useMemo, useState, type ReactNode } from 'react'
import { BUDGET_DEFAULT, BUDGET_LIMIT } from '../data/content'
import { buildItems } from '../items'
import type { Params } from '../layout'
import { PRESETS, useStore } from '../store'
import { useLayout } from '../useLayout'

function Slider({ label, value, min, max, step, unit = '', onChange, fmt }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string
  onChange: (v: number) => void; fmt?: (v: number) => string
}) {
  return (
    <label className="block py-1.5">
      <div className="flex justify-between text-[11px] mb-1.5">
        <span className="text-warm/75">{label}</span>
        <span className="text-gold tabular-nums">{fmt ? fmt(value) : value.toFixed(step < 0.1 ? 2 : 1)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  )
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex items-center justify-between w-full py-1.5 text-[11px] text-warm/80">
      <span>{label}</span>
      <span className={`w-8 h-4 rounded-full relative transition-colors ${value ? 'bg-gold' : 'bg-warm/20'}`}>
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-navy transition-all ${value ? 'left-4.5' : 'left-0.5'}`} />
      </span>
    </button>
  )
}
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="mb-3">
    <div className="text-[10px] tracking-[0.18em] text-gold/80 uppercase mb-1 pb-1 border-b border-gold/15">{title}</div>
    {children}
  </div>
)
const Warn = ({ children }: { children: ReactNode }) => (
  <div className="text-[11px] text-[#f0a48f] bg-[#5a2a20]/40 border border-[#e0705a]/40 rounded px-2 py-1.5 my-1.5 leading-snug">{children}</div>
)
const pct = (v: number) => `${Math.round(v * 100)}%`

function StructureTab() {
  const p = useStore((s) => s.params)
  const setParam = useStore((s) => s.setParam)
  const reset = useStore((s) => s.resetParams)
  const s = useStore()
  const l = useLayout()
  const P = (k: keyof Params) => (v: number) => setParam(k, v)
  return (
    <>
      <Section title="아카이브 길목">
        <Slider label="길목 길이" value={p.corridorL} min={10} max={20} step={0.5} unit=" m" onChange={P('corridorL')} />
        <Slider label="길목 폭 (벽 ↔ 유니폼 열)" value={p.corridorW} min={2} max={4.5} step={0.1} unit=" m" onChange={P('corridorW')} />
        <Slider label="유니폼 간격" value={p.uniformGap} min={0.45} max={0.9} step={0.01} onChange={P('uniformGap')}
          fmt={(v) => `${Math.round(v * 100)} cm`} />
        <div className="text-[11px] text-warm/60 flex justify-between py-1">
          <span>유효 통행 폭</span><span className="tabular-nums text-warm">{l.clearAisle.toFixed(2)} m</span>
        </div>
        {l.clearAisle < 1.5 && <Warn>통행 폭이 1.5 m 미만입니다. 양방향 관람·휠체어 통행을 위해 1.5 m 이상을 권장합니다.</Warn>}
        {l.uniformOverflow && <Warn>유니폼 20벌 열이 길목 길이를 넘어 메인룸 진입부를 막습니다. 간격을 줄이거나 길목을 늘려 주세요.</Warn>}
      </Section>
      <Section title="메인룸 · 가벽">
        <Slider label="메인룸 가로 (길목 방향)" value={p.roomW} min={5} max={10} step={0.5} unit=" m" onChange={P('roomW')} />
        <Slider label="메인룸 세로 (홀 방향)" value={p.roomD} min={4.5} max={9} step={0.5} unit=" m" onChange={P('roomD')} />
        <Slider label="가벽 높이" value={p.wallH} min={2.4} max={3.3} step={0.1} unit=" m" onChange={P('wallH')} />
        <Toggle label="모듈 가벽 표시" value={s.showWalls} onChange={(v) => s.set({ showWalls: v })} />
        <Toggle label="메인룸 암막 천장 (원단)" value={s.showCeiling} onChange={(v) => s.set({ showCeiling: v })} />
        <Slider label="입구 가림막 투명도" value={s.louverTransparency} min={0} max={1} step={0.05} fmt={pct}
          onChange={(v) => s.set({ louverTransparency: v })} />
      </Section>
      <button onClick={reset} className="w-full text-[11px] py-1.5 rounded border border-warm/20 text-warm/70 hover:bg-warm/10">
        초기 가정 치수로 되돌리기
      </button>
      <p className="text-[10px] text-warm/45 mt-2 leading-relaxed">
        모든 치수는 현장 실측 전 시뮬레이션용 임시 값입니다.
      </p>
    </>
  )
}

function LightTab() {
  const s = useStore()
  return (
    <>
      <Section title="메인룸 연출 비교">
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => { s.applyPreset(p.id); s.setMode('front') }}
              className={`rounded border px-1 py-2 text-center ${s.preset === p.id ? 'border-gold bg-gold/15 text-warm' : 'border-warm/15 text-warm/70 hover:bg-warm/5'}`}>
              <div className="text-[11px] font-bold">{p.label}</div>
              <div className="text-[9px] text-warm/55 mt-0.5 leading-tight">{p.desc}</div>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-warm/45 leading-relaxed">안을 누르면 메인룸 정면 시점으로 이동해 같은 구도로 비교합니다.</p>
      </Section>
      <Section title="세부 조절">
        <Slider label="배경 사진 밝기 (양의지 선수)" value={s.photoBrightness} min={0.05} max={1} step={0.01} fmt={pct}
          onChange={(v) => s.set({ photoBrightness: v, preset: null })} />
        <Slider label="전시물 집중 조명" value={s.spotIntensity} min={0.3} max={1.6} step={0.05} fmt={pct}
          onChange={(v) => s.set({ spotIntensity: v, preset: null })} />
        <Slider label="컨벤션홀 기존 조명" value={s.hallLight} min={0} max={1} step={0.05} fmt={pct}
          onChange={(v) => s.set({ hallLight: v, preset: null })} />
      </Section>
      <p className="text-[10px] text-warm/45 leading-relaxed">
        조명은 3000K 전후 스포트 + 벽 하단 간접조명 기준입니다. 홀 기존 조명을 밝히면 OX 퀴즈·팬사인회 진행 중의 보임새를 확인할 수 있습니다.
      </p>
    </>
  )
}

function ItemsTab() {
  const l = useLayout()
  const items = useMemo(() => buildItems(l), [l])
  const selected = useStore((s) => s.selected)
  const select = useStore((s) => s.select)
  const offsets = useStore((s) => s.offsets)
  const setOffset = useStore((s) => s.setOffset)
  const images = useStore((s) => s.images)
  const setImage = useStore((s) => s.setImage)
  const item = items.find((i) => i.id === selected)
  const groups = [...new Set(items.map((i) => i.group))]
  const o = (item && offsets[item.id]) || { dx: 0, dz: 0 }
  return (
    <>
      <Section title="전시물 선택">
        <select value={selected ?? ''} onChange={(e) => select(e.target.value || null)}
          className="w-full bg-char border border-warm/20 rounded text-[12px] text-warm px-2 py-1.5 my-1">
          <option value="">3D 화면에서 클릭하거나 목록에서 선택</option>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {items.filter((i) => i.group === g).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </optgroup>
          ))}
        </select>
      </Section>
      {item ? (
        <>
          <Section title="속성">
            <div className="text-sm text-warm font-bold mt-1">{item.name}</div>
            <div className="text-[11px] text-gold/90 mt-0.5">{item.group}</div>
            <div className="text-[11px] text-warm/75 mt-2">{item.spec}</div>
            {item.note && <div className="text-[11px] text-warm/55 mt-1.5 leading-relaxed">{item.note}</div>}
          </Section>
          {item.movable && (
            <Section title="쇼케이스 위치">
              <Slider label="길목 방향 (앞 ↔ 뒤)" value={o.dx} min={-1.5} max={1.5} step={0.05} unit=" m" onChange={(v) => setOffset(item.id, 'dx', v)} />
              <Slider label="좌우 (벽 ↔ 홀)" value={o.dz} min={-1.5} max={1.5} step={0.05} unit=" m" onChange={(v) => setOffset(item.id, 'dz', v)} />
            </Section>
          )}
          {item.image && (
            <Section title="이미지 교체">
              <label className="block text-center text-[11px] py-2 rounded border border-dashed border-gold/50 text-warm/80 hover:bg-gold/10 cursor-pointer my-1">
                {images[item.id] ? '다른 이미지로 교체' : '이미지 파일 선택 (JPG · PNG)'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setImage(item.id, URL.createObjectURL(f)) }} />
              </label>
              {images[item.id] && (
                <button onClick={() => setImage(item.id, null)} className="text-[11px] text-warm/60 underline">플레이스홀더로 되돌리기</button>
              )}
              <p className="text-[10px] text-warm/45 mt-1.5 leading-relaxed">
                영구 반영은 public/assets 에 파일을 넣고 src/data/content.ts 의 image 경로를 지정하세요.
              </p>
            </Section>
          )}
        </>
      ) : (
        <p className="text-[11px] text-warm/50 leading-relaxed">
          패널 · 액자 · 유니폼 · 쇼케이스를 클릭하면 규격 확인, 이미지 교체, 쇼케이스 위치 조절을 할 수 있습니다.
        </p>
      )}
    </>
  )
}

function BudgetTab() {
  const budget = useStore((s) => s.budget)
  const setBudget = useStore((s) => s.setBudget)
  const upd = (id: string, patch: object) => setBudget(budget.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const est = budget.reduce((s, r) => s + (r.estimate || 0), 0)
  const quoted = budget.filter((r) => r.quote != null)
  const mixed = budget.reduce((s, r) => s + (r.quote ?? r.estimate ?? 0), 0)
  const num = 'w-14 bg-char border border-warm/15 rounded px-1 py-0.5 text-right tabular-nums text-[11px]'
  return (
    <>
      <Section title="예산표 (만원 · VAT 포함)">
        <table className="w-full text-[11px] mt-1">
          <thead>
            <tr className="text-warm/50 text-[10px]">
              <th className="text-left font-normal pb-1">항목</th>
              <th className="text-right font-normal pb-1">추정</th>
              <th className="text-right font-normal pb-1">실제 견적</th>
            </tr>
          </thead>
          <tbody>
            {budget.map((r) => (
              <tr key={r.id} className="border-t border-warm/10 align-top">
                <td className="py-1.5 pr-1">
                  <input value={r.item} onChange={(e) => upd(r.id, { item: e.target.value })}
                    className="w-full bg-transparent text-warm outline-none focus:bg-char rounded" />
                  <input value={r.note} placeholder="비고" onChange={(e) => upd(r.id, { note: e.target.value })}
                    className="w-full bg-transparent text-[10px] text-warm/45 outline-none focus:bg-char rounded" />
                </td>
                <td className="py-1.5 text-right">
                  <input type="number" value={r.estimate} onChange={(e) => upd(r.id, { estimate: +e.target.value })} className={`${num} text-warm/80`} />
                </td>
                <td className="py-1.5 text-right">
                  <input type="number" value={r.quote ?? ''} placeholder="—"
                    onChange={(e) => upd(r.id, { quote: e.target.value === '' ? null : +e.target.value })} className={`${num} text-gold`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 mt-1.5">
          <button onClick={() => setBudget([...budget, { id: `b${Date.now()}`, item: '새 항목', note: '', estimate: 0, quote: null }])}
            className="flex-1 text-[11px] py-1 rounded border border-warm/20 text-warm/70 hover:bg-warm/10">+ 항목 추가</button>
          <button onClick={() => setBudget(BUDGET_DEFAULT)}
            className="flex-1 text-[11px] py-1 rounded border border-warm/20 text-warm/70 hover:bg-warm/10">초기화</button>
        </div>
      </Section>
      <Section title="합계">
        <div className="text-[11px] space-y-1.5 mt-1.5">
          <div className="flex justify-between"><span className="text-warm/65">추정 합계</span><span className="tabular-nums">{est.toLocaleString()} 만원</span></div>
          <div className="flex justify-between">
            <span className="text-warm/65">견적 반영 합계 <span className="text-warm/40">(견적 {quoted.length}/{budget.length}건)</span></span>
            <span className={`tabular-nums font-bold ${mixed >= BUDGET_LIMIT ? 'text-[#f0a48f]' : 'text-gold'}`}>{mixed.toLocaleString()} 만원</span>
          </div>
          <div className="h-1.5 bg-warm/10 rounded overflow-hidden">
            <div className={`h-full ${mixed >= BUDGET_LIMIT ? 'bg-[#e0705a]' : 'bg-gold'}`} style={{ width: `${Math.min(100, (mixed / BUDGET_LIMIT) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-warm/55">
            <span>한도 {BUDGET_LIMIT.toLocaleString()} 만원 미만</span>
            <span>{mixed < BUDGET_LIMIT ? `여유 ${(BUDGET_LIMIT - mixed).toLocaleString()} 만원` : `초과 ${(mixed - BUDGET_LIMIT).toLocaleString()} 만원`}</span>
          </div>
        </div>
        {mixed >= BUDGET_LIMIT && <Warn>예산 한도(2,000만 원 미만)를 넘었습니다.</Warn>}
        <p className="text-[10px] text-warm/45 mt-2 leading-relaxed">
          추정 금액은 시안 기준 가정치이며 견적이 아닙니다. 대행사 견적을 받으면 '실제 견적' 칸에 입력하세요. 견적이 없는 항목은 추정 금액으로 합산됩니다. 입력 내용은 이 브라우저에 저장됩니다.
        </p>
      </Section>
    </>
  )
}

const TABS = [
  { id: 'structure', label: '구조 · 치수', C: StructureTab },
  { id: 'light', label: '연출', C: LightTab },
  { id: 'items', label: '전시물', C: ItemsTab },
  { id: 'budget', label: '예산', C: BudgetTab },
]

export function RightPanel() {
  const [tab, setTab] = useState('structure')
  const selected = useStore((s) => s.selected)
  const [lastSel, setLastSel] = useState<string | null>(null)
  if (selected !== lastSel) {
    setLastSel(selected)
    if (selected) setTab('items')
  }
  const T = TABS.find((t) => t.id === tab)!.C
  return (
    <div className="panel absolute right-3 top-[68px] bottom-3 w-[312px] flex flex-col pointer-events-auto">
      <div className="flex border-b border-gold/20">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-[11px] ${tab === t.id ? 'text-gold border-b-2 border-gold -mb-px' : 'text-warm/55 hover:text-warm'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto scroll-thin p-3.5"><T /></div>
    </div>
  )
}
