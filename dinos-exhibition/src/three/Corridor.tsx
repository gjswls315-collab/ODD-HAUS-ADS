import { useMemo } from 'react'
import * as THREE from 'three'
import { HISTORY_BODY } from '../data/content'
import { PLINTH_D, type Layout } from '../layout'
import { ArmSpot, C, Glow, Graphic, Selectable, shared, TextPlane } from './parts'
import {
  F, historyPanelTexture, jerseyTexture, photoPlaceholder, plateTexture, textTexture,
  useCanvasTexture, useSlotTexture,
} from './textures'

type Hist = Layout['history'][number]
type Frame = Layout['frames'][number]
type Uni = Layout['uniforms'][number]

function HistoryPanel({ h }: { h: Hist }) {
  const bg = useCanvasTexture(() => historyPanelTexture(h.year, h.title, HISTORY_BODY), [h.year, h.title])
  const photo = useSlotTexture(h.id, h.image, () => photoPlaceholder(h.year, '사진 교체 슬롯', 384, 280), [h.year])
  return (
    <Selectable id={h.id} size={[h.w, h.h, 0.06]} position={[h.cx, h.cy, 0.03]}>
      <mesh position={[0, 0, -0.012]}>
        <boxGeometry args={[h.w, h.h, 0.024]} />
        <meshStandardMaterial color={C.navyDeep} roughness={0.8} />
      </mesh>
      <Graphic map={bg} size={[h.w, h.h]} position={[0, 0, 0.002]} />
      <Graphic map={photo} size={[h.w * 0.82, 0.54]} position={[0, -0.054, 0.006]} emissive={0.6} />
      <Glow map={shared.wash} size={[h.w * 1.5, h.h * 1.25]} position={[0, 0.12, 0.012]} opacity={0.22} />
    </Selectable>
  )
}

function FamilyFrame({ f }: { f: Frame }) {
  const photo = useSlotTexture(f.id, f.image, () => photoPlaceholder(f.year, 'FAMILY DAY', 384, Math.round(384 * f.h / f.w)), [f.year])
  const plate = useCanvasTexture(() => plateTexture(`${f.year} FAMILY DAY`, '패밀리데이 기념 액자'), [f.year])
  return (
    <Selectable id={f.id} size={[f.w + 0.08, f.h + 0.08, 0.08]} position={[f.cx, f.cy, 0.03]}>
      <mesh>
        <boxGeometry args={[f.w + 0.07, f.h + 0.07, 0.035]} />
        <meshStandardMaterial color="#9c8253" metalness={0.75} roughness={0.38} emissive="#2a2110" emissiveIntensity={0.6} />
      </mesh>
      <Graphic map={photo} size={[f.w, f.h]} position={[0, 0, 0.019]} emissive={0.6} />
      <Graphic map={plate} size={[0.13, 0.08]} position={[0, -f.h / 2 - 0.13, -0.02]} emissive={0.35} />
      <Glow map={shared.wash} size={[f.w * 1.9, f.h * 1.5]} position={[0, 0.14, 0.024]} opacity={0.2} />
    </Selectable>
  )
}

// ── 남성 상반신 토르소 + 유니폼 (모든 토르소 동일 형상, 공유 지오메트리) ──
const UV_X = 0.37, UV_Y0 = -0.02, UV_H = 0.64
function planarUV(g: THREE.BufferGeometry) {
  const pos = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    let u = (pos.getX(i) + UV_X) / (UV_X * 2)
    if (pos.getZ(i) < 0) u = 1 - u // 뒷면도 정방향으로 읽히도록
    uv.setXY(i, u, (pos.getY(i) - UV_Y0) / UV_H)
  }
  uv.needsUpdate = true
  return g
}
const v2 = (a: number[][]) => a.map(([x, y]) => new THREE.Vector2(x, y))
const bustGeo = (() => {
  const g = new THREE.LatheGeometry(v2([
    [0, 0], [0.15, 0], [0.165, 0.05], [0.17, 0.15], [0.185, 0.28], [0.2, 0.38], [0.212, 0.46],
    [0.195, 0.52], [0.13, 0.56], [0.07, 0.585], [0.052, 0.62], [0.052, 0.67], [0, 0.67],
  ]), 36)
  g.scale(1, 1, 0.56)
  return g
})()
const jerseyGeo = (() => {
  const g = new THREE.LatheGeometry(v2([
    [0.172, -0.02], [0.18, 0.05], [0.184, 0.15], [0.198, 0.28], [0.213, 0.38], [0.226, 0.46],
    [0.208, 0.525], [0.14, 0.567], [0.085, 0.588],
  ]), 36)
  g.scale(1, 1, 0.6)
  return planarUV(g)
})()
const sleeveGeo = (side: number) => {
  const g = new THREE.CylinderGeometry(0.062, 0.08, 0.2, 18, 1, true)
  g.applyMatrix4(new THREE.Matrix4().makeRotationZ(side * 0.95))
  g.applyMatrix4(new THREE.Matrix4().makeTranslation(side * 0.265, 0.425, 0))
  return planarUV(g)
}
const sleeveL = sleeveGeo(-1), sleeveR = sleeveGeo(1)
const poleGeo = new THREE.CylinderGeometry(0.014, 0.014, 1, 10)
const baseGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.018, 32)
const metalBlack = new THREE.MeshStandardMaterial({ color: '#0c0d10', roughness: 0.45, metalness: 0.7 })
const BUST_Y = 0.98

function UniformTorso({ u }: { u: Uni }) {
  const map = useSlotTexture(u.id, u.image, () => jerseyTexture(u), [u.id])
  const plate = useCanvasTexture(() => plateTexture(u.name, '명칭 · 연도 입력'), [u.name])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.3, roughness: 0.9, side: THREE.DoubleSide,
  }), [map])
  return (
    <Selectable id={u.id} size={[0.62, 1.72, 0.5]} center={[0, 0.86, 0]} position={[u.x, 0, u.z]} rotation={[0, Math.PI, 0]}>
      <mesh geometry={baseGeo} material={metalBlack} position={[0, 0.009, 0]} />
      <mesh geometry={poleGeo} material={metalBlack} position={[0, BUST_Y / 2, 0]} scale={[1, BUST_Y, 1]} />
      <group position={[0, BUST_Y, 0]}>
        <mesh geometry={bustGeo} material={metalBlack} />
        <mesh geometry={jerseyGeo} material={mat} />
        <mesh geometry={sleeveL} material={mat} />
        <mesh geometry={sleeveR} material={mat} />
      </group>
      {/* 정보 명패 (통로 쪽) */}
      <group position={[0, 0, 0.3]}>
        <mesh geometry={poleGeo} material={metalBlack} position={[0, 0.4, 0]} scale={[0.6, 0.8, 0.6]} />
        <mesh position={[0, 0.005, 0]} material={metalBlack}><cylinderGeometry args={[0.07, 0.07, 0.01, 20]} /></mesh>
        <group position={[0, 0.82, 0.01]} rotation={[-0.75, 0, 0]}>
          <mesh material={metalBlack}><boxGeometry args={[0.2, 0.125, 0.008]} /></mesh>
          <Graphic map={plate} size={[0.19, 0.118]} position={[0, 0, 0.005]} emissive={0.45} />
        </group>
      </group>
    </Selectable>
  )
}

export function Corridor({ layout }: { layout: Layout }) {
  const { L, W, p, history, frames, uniforms, intro, plinth, histCx, framesCx, histStart, frStart } = layout
  const H = p.wallH
  const introTex = useCanvasTexture(() => textTexture([
    { t: 'NC DINOS', font: F.serif(92), color: C.warm },
    { t: '15TH', font: F.serif(128), color: C.warm },
    { t: 'ANNIVERSARY', font: F.serif(84), color: C.warm },
    { t: '', font: F.sans(10) },
    { t: 'THE ROAD TO GLORY', font: F.sans(34, 500), color: C.gold, ls: 8 },
  ], 640, 720), [])
  const histTitle = useCanvasTexture(() => textTexture([
    { t: 'HISTORY ARCHIVE', font: F.serif(88), color: C.warm },
    { t: '다이노스 히스토리 아카이브', font: F.sans(38, 400), color: 'rgba(232,226,214,0.8)' },
  ], 1024, 190), [])
  const famTitle = useCanvasTexture(() => textTexture([
    { t: 'FAMILY DAY ARCHIVE', font: F.serif(88), color: C.warm },
    { t: '역대 패밀리데이 아카이브', font: F.sans(38, 400), color: 'rgba(232,226,214,0.8)' },
  ], 1024, 190), [])
  const titleY = H - 0.24
  const plinthW = plinth.x1 - plinth.x0
  const plinthCx = (plinth.x0 + plinth.x1) / 2

  return (
    <group>
      {/* 기존 벽면 위 네이비 그래픽 마감 (길목 구간) */}
      <mesh position={[(L - 0.3) / 2, H / 2, -0.05]}>
        <boxGeometry args={[L + 0.3, H, 0.1]} />
        <meshStandardMaterial color={C.navy} roughness={0.92} />
      </mesh>

      {/* 인트로 타이틀 */}
      <TextPlane map={introTex} size={[intro.x1 - intro.x0, (intro.x1 - intro.x0) * 1.125]}
        position={[(intro.x0 + intro.x1) / 2, 1.55, 0.004]} />
      <Glow map={shared.wash} size={[1.8, 2.4]} position={[(intro.x0 + intro.x1) / 2, 1.6, 0.003]} opacity={0.14} />

      {/* ① 역사 기록 */}
      <TextPlane map={histTitle} size={[2.1, 0.39]} position={[histStart + 1.05, titleY, 0.004]} />
      {history.map((h) => <HistoryPanel key={h.id} h={h} />)}
      {history.map((h) => <ArmSpot key={h.id} position={[h.cx, H + 0.03, 0]} />)}
      <mesh position={[plinthCx, 0.4, PLINTH_D / 2]}>
        <boxGeometry args={[plinthW, 0.8, PLINTH_D]} />
        <meshStandardMaterial color={C.black} roughness={0.75} />
      </mesh>
      <mesh position={[plinthCx, 0.03, PLINTH_D + 0.004]} raycast={() => null}>
        <planeGeometry args={[plinthW, 0.025]} />
        <meshBasicMaterial color="#ffcf96" toneMapped={false} />
      </mesh>
      <Glow map={shared.strip} size={[plinthW, 0.9]} position={[plinthCx, 0.012, PLINTH_D + 0.45]} rotation={[Math.PI / 2, 0, 0]} opacity={0.4} />
      {/* 실물 자료용 소형 아크릴 케이스 */}
      {history.filter((_, i) => i % 2 === 0).map((h, i) => (
        <group key={h.id} position={[h.cx, 0.8, PLINTH_D / 2]}>
          <mesh position={[0, 0.11, 0]} renderOrder={3}>
            <boxGeometry args={[0.5, 0.22, 0.3]} />
            <meshStandardMaterial color="#cfe0ee" transparent opacity={0.1} roughness={0.05} depthWrite={false} />
          </mesh>
          {i === 0 ? (
            <mesh position={[0, 0.045, 0]}>
              <sphereGeometry args={[0.037, 20, 14]} />
              <meshStandardMaterial color="#efe9dc" roughness={0.7} emissive="#5c5546" emissiveIntensity={0.4} />
            </mesh>
          ) : (
            <mesh position={[0, 0.012, 0]} rotation={[0, 0.15, 0]}>
              <boxGeometry args={[0.3, 0.018, 0.21]} />
              <meshStandardMaterial color="#d9d2c0" roughness={0.9} emissive="#5c5546" emissiveIntensity={0.35} />
            </mesh>
          )}
        </group>
      ))}

      {/* ② 패밀리데이 액자 8점 */}
      <TextPlane map={famTitle} size={[2.1, 0.39]} position={[frStart + 1.05, titleY, 0.004]} />
      {frames.map((f) => <FamilyFrame key={f.id} f={f} />)}
      {frames.filter((_, i) => i % 2 === 0).map((f, i) => (
        <ArmSpot key={f.id} position={[(f.cx + frames[i * 2 + 1].cx) / 2, H + 0.03, 0]} />
      ))}
      <mesh position={[framesCx, 0.03, 0.006]} raycast={() => null}>
        <planeGeometry args={[layout.frEnd - frStart + 0.4, 0.025]} />
        <meshBasicMaterial color="#ffcf96" toneMapped={false} />
      </mesh>
      <Glow map={shared.strip} size={[layout.frEnd - frStart + 0.4, 0.9]} position={[framesCx, 0.5, 0.008]} opacity={0.3} />
      <Glow map={shared.strip} size={[layout.frEnd - frStart + 0.4, 0.9]} position={[framesCx, 0.012, 0.45]} rotation={[Math.PI / 2, 0, 0]} opacity={0.35} />

      {/* ③ 유니폼 아카이브 — 뒤 가벽 없음 */}
      {uniforms.map((u) => <UniformTorso key={u.id} u={u} />)}
      {uniforms.filter((_, i) => i % 4 === 1).map((u) => (
        <Glow key={u.id} map={shared.glow} size={[3.2, 2.2]} position={[u.x + layout.p.uniformGap, 0.011, W - 0.2]}
          rotation={[-Math.PI / 2, 0, 0]} opacity={0.1} />
      ))}

      {/* 길목 조명 (3000K) */}
      {[0.14, 0.38, 0.62, 0.86].map((t) => (
        <pointLight key={t} position={[L * t, 2.35, W * 0.45]} color={C.light} intensity={7} distance={7.5} decay={2} />
      ))}
      <pointLight position={[histCx, 1.5, 1.1]} color={C.light} intensity={2} distance={5} decay={2} />
    </group>
  )
}
