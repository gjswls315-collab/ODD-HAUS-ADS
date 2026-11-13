import { useEffect, useRef } from 'react'
import { HISTORY } from '../data/content'
import { DOOR_W } from '../layout'
import { useStore } from '../store'
import { rig } from '../three/CameraRig'
import { useLayout } from '../useLayout'

const GOLD = '#b89b69'
const WARM = '#e8e2d6'

/** 평면도 (미니맵/전체 평면도 공용). x → 오른쪽, z(홀 안쪽) → 아래 */
export function FloorPlan({ detail = false }: { detail?: boolean }) {
  const l = useLayout()
  const showWalls = useStore((s) => s.showWalls)
  const offsets = useStore((s) => s.offsets)
  const selected = useStore((s) => s.selected)
  const marker = useRef<SVGGElement>(null)
  const { L, W, room, p } = l

  useEffect(() => {
    let raf = 0
    const tick = () => {
      marker.current?.setAttribute('transform', `translate(${rig.x} ${rig.z}) rotate(${(-rig.yaw * 180) / Math.PI})`)
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  const padL = detail ? 5 : 4, padT = detail ? 1.6 : 0.6, padB = detail ? 2.2 : 1.6
  const vb = [-padL, -padT, room.x1 + padL + (detail ? 2.6 : 1), Math.max(p.roomD, W) + padT + padB]
  const sw = detail ? 0.03 : 0.05
  const fs = detail ? 0.3 : 0.42
  const dim = (x1: number, z1: number, x2: number, z2: number, text: string, off = 0.35) => {
    const vert = x1 === x2
    return (
      <g stroke={WARM} strokeOpacity={0.55} strokeWidth={0.02} fill={WARM}>
        <line x1={x1} y1={z1} x2={x2} y2={z2} />
        {vert
          ? <><line x1={x1 - 0.1} y1={z1} x2={x1 + 0.1} y2={z1} /><line x1={x2 - 0.1} y1={z2} x2={x2 + 0.1} y2={z2} /></>
          : <><line x1={x1} y1={z1 - 0.1} x2={x1} y2={z1 + 0.1} /><line x1={x2} y1={z2 - 0.1} x2={x2} y2={z2 + 0.1} /></>}
        <text x={vert ? x1 + off : (x1 + x2) / 2} y={vert ? (z1 + z2) / 2 : z1 + off} fontSize={0.3} stroke="none"
          textAnchor={vert ? 'start' : 'middle'} dominantBaseline="middle">{text}</text>
      </g>
    )
  }
  const label = (x: number, z: number, n: string, t: string) => (
    <g>
      <circle cx={x} cy={z} r={fs * 0.62} fill="#101827" stroke={GOLD} strokeWidth={0.03} />
      <text x={x} y={z} fontSize={fs * 0.8} fill={GOLD} textAnchor="middle" dominantBaseline="central" fontWeight={700}>{n}</text>
      {detail && <text x={x + fs * 0.9} y={z} fontSize={fs} fill={WARM} dominantBaseline="central">{t}</text>}
    </g>
  )

  return (
    <svg viewBox={vb.join(' ')} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* 전시 바닥 영역 */}
      <rect x={-1.2} y={0} width={L + 1.2} height={W + 0.7} fill="#1a2030" />
      <rect x={room.x0} y={0} width={p.roomW} height={p.roomD} fill="#161b29" />
      {/* 기존 벽 (홀 벽체·코너) */}
      <line x1={vb[0]} y1={-0.12} x2={room.x1 + 0.12} y2={-0.12} stroke="#8a8170" strokeWidth={0.22} />
      <line x1={room.x1 + 0.12} y1={-0.22} x2={room.x1 + 0.12} y2={vb[1] + vb[3]} stroke="#8a8170" strokeWidth={0.22} />
      {/* 인트로·역사 패널·받침 */}
      <rect x={l.plinth.x0} y={0} width={l.plinth.x1 - l.plinth.x0} height={l.plinth.z1} fill="#0b0c0f" stroke={WARM} strokeOpacity={0.3} strokeWidth={0.02} />
      <line x1={l.intro.x0} y1={0.04} x2={l.intro.x1} y2={0.04} stroke={WARM} strokeWidth={0.07} />
      {l.history.map((h) => (
        <line key={h.id} x1={h.cx - h.w / 2} y1={0.04} x2={h.cx + h.w / 2} y2={0.04}
          stroke={selected === h.id ? '#ffd27a' : WARM} strokeWidth={0.08} />
      ))}
      {l.frames.map((f) => (
        <line key={f.id} x1={f.cx - f.w / 2} y1={0.05} x2={f.cx + f.w / 2} y2={0.05}
          stroke={selected === f.id ? '#ffd27a' : GOLD} strokeWidth={0.1} />
      ))}
      {/* 유니폼 토르소 20 */}
      {l.uniforms.map((u) => (
        <circle key={u.id} cx={u.x} cy={u.z} r={0.17} fill={selected === u.id ? '#ffd27a' : '#0b0c0f'}
          stroke={l.uniformOverflow && u.x > l.uMax ? '#e0705a' : WARM} strokeWidth={0.03} />
      ))}
      {/* 모듈 가벽·루버·출입구 */}
      {showWalls && l.moduleWalls.map((r, i) => (
        <rect key={i} x={r.x0} y={r.z0} width={r.x1 - r.x0} height={r.z1 - r.z0} fill={GOLD} />
      ))}
      {showWalls && (
        <line x1={L - 0.05} y1={0} x2={L - 0.05} y2={l.louver.z1} stroke={GOLD} strokeWidth={0.12} strokeDasharray="0.06 0.08" />
      )}
      {/* 쇼케이스 */}
      {l.showcases.map((s) => {
        const o = offsets[s.id] ?? { dx: 0, dz: 0 }
        return (
          <rect key={s.id} x={s.x + o.dx - s.w / 2} y={s.z + o.dz - s.d / 2} width={s.w} height={s.d}
            fill={s.id === 'sc-sword' ? GOLD : '#0b0c0f'} fillOpacity={s.id === 'sc-sword' ? 0.85 : 1}
            stroke={selected === s.id ? '#ffd27a' : WARM} strokeWidth={sw} />
        )
      })}
      {/* 배경 사진 */}
      <line x1={room.x1 - 0.04} y1={l.photo.z - l.photo.w / 2} x2={room.x1 - 0.04} y2={l.photo.z + l.photo.w / 2} stroke={WARM} strokeWidth={0.08} />
      {/* 동선 */}
      <path d={`M -1 ${W * 0.55} L ${L - 0.8} ${W * 0.55} L ${L - 0.8} ${l.doorMid} L ${L + 1.2} ${l.doorMid}`}
        fill="none" stroke={WARM} strokeOpacity={0.45} strokeWidth={0.04} strokeDasharray="0.18 0.14" />
      <path d={`M ${L + 1.2} ${l.doorMid} l -0.28 -0.16 v 0.32 z`} fill={WARM} fillOpacity={0.6} />

      {label(l.histCx, W * 0.3, '1', 'HISTORY ARCHIVE')}
      {label(l.framesCx - (detail ? 1.4 : 0), W * 0.3, '2', 'FAMILY DAY ARCHIVE')}
      {label(L * 0.42, W + (detail ? 0.75 : 0.65), '3', 'UNIFORM ARCHIVE (개방형)')}
      {label(room.x0 + (detail ? 0.9 : p.roomW * 0.4), detail ? 1.5 : l.midZ, '4', 'THE LEGACY ROOM')}

      {detail && (
        <>
          {dim(0, -0.8, L, -0.8, `길목 ${L.toFixed(1)} m`, -0.3)}
          {dim(room.x0, -0.8, room.x1, -0.8, `메인룸 ${p.roomW.toFixed(1)} m`, -0.3)}
          {dim(-1.9, 0, -1.9, W, `폭 ${W.toFixed(1)} m`, -1.75)}
          {dim(room.x1 + 0.7, 0, room.x1 + 0.7, p.roomD, `${p.roomD.toFixed(1)} m`, 0.2)}
          <text x={L - 1.35} y={l.doorMid + 0.1} fontSize={0.26} fill={WARM} textAnchor="end">출입구 {DOOR_W} m →</text>
          <text x={L - 0.35} y={l.louver.z1 / 2} fontSize={0.26} fill={GOLD} textAnchor="end">루버 가림막</text>
          <text x={room.x1 - 0.2} y={l.midZ - l.photo.w / 2 - 0.2} fontSize={0.24} fill={WARM} textAnchor="end">배경 사진</text>
          <text x={l.sword.x - 0.55} y={l.midZ + 0.08} fontSize={0.24} fill={GOLD} textAnchor="end">집행검</text>
          <text x={-1.1} y={W * 0.55 - 0.2} fontSize={0.26} fill={WARM}>입구 →</text>
          <text x={L * 0.42} y={W + 1.6} fontSize={0.28} fill={WARM} fillOpacity={0.6} textAnchor="middle">
            ↓ 컨벤션홀 (OX 퀴즈 · 팬사인회 운영 구역)
          </text>
          <text x={l.histCx} y={-0.3} fontSize={0.24} fill={WARM} fillOpacity={0.7} textAnchor="middle">
            역사 패널 {HISTORY.length} + 실물 받침대
          </text>
        </>
      )}
      {/* 현재 위치 */}
      <g ref={marker}>
        <path d="M 0 -0.55 L 0.32 0.3 L 0 0.14 L -0.32 0.3 Z" fill="#ffd27a" stroke="#101827" strokeWidth={0.04}
          transform={detail ? 'scale(0.8)' : 'scale(1.15)'} />
      </g>
    </svg>
  )
}

export function MiniMap() {
  const set = useStore((s) => s.set)
  return (
    <div className="panel absolute bottom-3 left-1/2 -translate-x-1/2 w-[480px] h-[164px] px-1.5 pb-1 pt-6 pointer-events-auto">
      <div className="absolute top-1.5 left-2.5 text-[10px] tracking-widest text-gold/80">PLAN · 현재 위치</div>
      <button onClick={() => set({ planOpen: true })}
        className="absolute top-1 right-1.5 text-[10px] px-2 py-0.5 rounded border border-gold/30 text-warm/80 hover:bg-gold/15">
        평면도 크게 보기
      </button>
      <FloorPlan />
    </div>
  )
}

export function PlanModal() {
  const open = useStore((s) => s.planOpen)
  const set = useStore((s) => s.set)
  const l = useLayout()
  if (!open) return null
  const rows: [string, string][] = [
    ['아카이브 길목', `${l.L.toFixed(1)} × ${l.W.toFixed(1)} m`],
    ['유효 통행 폭', `${l.clearAisle.toFixed(2)} m`],
    ['메인룸', `${l.p.roomW.toFixed(1)} × ${l.p.roomD.toFixed(1)} m`],
    ['가벽 높이', `${l.p.wallH.toFixed(1)} m`],
    ['유니폼 간격', `${Math.round(l.p.uniformGap * 100)} cm × 20벌`],
    ['전시 점유 면적(약)', `${(l.L * (l.W + 0.5) + l.p.roomW * l.p.roomD).toFixed(0)} ㎡`],
  ]
  return (
    <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center pointer-events-auto" onClick={() => set({ planOpen: false })}>
      <div className="panel w-[min(1180px,94vw)] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="font-display italic text-2xl text-warm">Floor Plan</span>
            <span className="ml-3 text-xs text-warm/60">전시물 · 가벽 배치 평면도 — 임시 치수(현장 실측 전)</span>
          </div>
          <button onClick={() => set({ planOpen: false })} className="text-warm/70 hover:text-warm text-sm px-2">닫기 ✕</button>
        </div>
        <div className="h-[46vh] bg-[#0c111c] rounded-md border border-gold/15"><FloorPlan detail /></div>
        <div className="mt-3 flex gap-6 text-xs">
          <div className="grid grid-cols-3 gap-x-6 gap-y-1 flex-1">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-warm/10 py-1">
                <span className="text-warm/60">{k}</span><span className="text-warm tabular-nums">{v}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-warm/75 w-64">
            <div><span className="inline-block w-5 h-1.5 bg-[#8a8170] mr-2 align-middle" />기존 벽체 (홀 벽면 · 코너)</div>
            <div><span className="inline-block w-5 h-1.5 bg-gold mr-2 align-middle" />신규 모듈 가벽</div>
            <div><span className="inline-block w-5 border-t-2 border-dashed border-gold mr-2 align-middle" />루버 가림막 (반투명)</div>
            <div><span className="inline-block w-2.5 h-2.5 rounded-full border border-warm bg-black mr-2 align-middle" />유니폼 토르소 (가벽 없음)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
