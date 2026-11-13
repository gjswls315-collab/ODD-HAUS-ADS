import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Layout, Rect } from '../layout'
import { useStore } from '../store'
import { C, Glow, Graphic, Selectable, shared, Showcase, Sword, TextPlane, Trophy } from './parts'
import {
  desaturate, F, heroPhotoPlaceholder, photoPlaceholder, textTexture, useCanvasTexture, useSlotTexture,
} from './textures'

function WallBox({ r, h, color = C.navy }: { r: Rect; h: number; color?: string }) {
  return (
    <mesh position={[(r.x0 + r.x1) / 2, h / 2, (r.z0 + r.z1) / 2]}>
      <boxGeometry args={[r.x1 - r.x0, h, r.z1 - r.z0]} />
      <meshStandardMaterial color={color} roughness={0.92} />
    </mesh>
  )
}

function SpotAt({ from, to, intensity, angle = 0.4, distance = 8 }: {
  from: [number, number, number]; to: [number, number, number]; intensity: number; angle?: number; distance?: number
}) {
  const light = useMemo(() => new THREE.SpotLight(C.light), [])
  light.position.set(...from)
  light.target.position.set(...to)
  light.intensity = intensity
  light.angle = angle
  light.penumbra = 0.7
  light.distance = distance
  light.decay = 1.6
  return (<><primitive object={light} /><primitive object={light.target} /></>)
}

function Louver({ r, h, transparency }: { r: Rect; h: number; transparency: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const len = r.z1 - r.z0
  const pitch = 0.09
  const n = Math.max(1, Math.floor(len / pitch))
  useEffect(() => {
    const m = new THREE.Matrix4()
    for (let i = 0; i < n; i++) {
      m.makeTranslation((r.x0 + r.x1) / 2, h / 2, r.z0 + (i + 0.5) * (len / n))
      ref.current!.setMatrixAt(i, m)
    }
    ref.current!.instanceMatrix.needsUpdate = true
  }, [n, r.x0, r.x1, r.z0, len, h])
  return (
    <Selectable id="louver" size={[0.12, h, len]} position={[0, 0, 0]} center={[(r.x0 + r.x1) / 2, h / 2, (r.z0 + r.z1) / 2]}>
      <instancedMesh ref={ref} args={[undefined, undefined, n]} key={n}>
        <boxGeometry args={[0.07, h, 0.032]} />
        <meshStandardMaterial color="#1b2233" roughness={0.8} />
      </instancedMesh>
      {/* 반투명 스크림(메쉬 원단) */}
      <mesh position={[r.x1 - 0.012, h / 2, (r.z0 + r.z1) / 2]} rotation={[0, Math.PI / 2, 0]} renderOrder={4}>
        <planeGeometry args={[len, h]} />
        <meshBasicMaterial color="#0a0e17" transparent opacity={1 - transparency} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* 상·하부 레일 */}
      {[0.03, h - 0.03].map((y) => (
        <mesh key={y} position={[(r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2]}>
          <boxGeometry args={[0.1, 0.06, len]} />
          <meshStandardMaterial color={C.black} roughness={0.6} />
        </mesh>
      ))}
    </Selectable>
  )
}

function Slot({ id, label, size, ...props }: {
  id: string; label: string; size: [number, number]
  position: [number, number, number]; rotation?: [number, number, number]
}) {
  const map = useSlotTexture(id, undefined, () => photoPlaceholder(label, '이미지 교체 슬롯', 384, Math.round(384 * size[1] / size[0])), [label])
  return (
    <Selectable id={id} size={[size[0], size[1], 0.05]} {...props}>
      <Graphic map={map} size={size} emissive={0.4} />
    </Selectable>
  )
}

export function LegacyRoom({ layout }: { layout: Layout }) {
  const { room, p, L, door, photo, midZ, showcases } = layout
  const H = p.wallH
  const showWalls = useStore((s) => s.showWalls)
  const showCeiling = useStore((s) => s.showCeiling)
  const mode = useStore((s) => s.mode)
  const transparency = useStore((s) => s.louverTransparency)
  const bright = useStore((s) => s.photoBrightness)
  const spot = useStore((s) => s.spotIntensity)
  const offsets = useStore((s) => s.offsets)

  const hero = useSlotTexture('photo-yang', undefined, heroPhotoPlaceholder, [], desaturate)
  const title15 = useCanvasTexture(() => textTexture([
    { t: '15TH ANNIVERSARY', font: F.serif(84), color: C.warm },
    { t: '다이노스 15주년 기념', font: F.sans(34, 400), color: C.gold },
  ], 900, 180), [])
  const title20 = useCanvasTexture(() => textTexture([
    { t: '2020 THE CHAMPIONS', font: F.serif(84), color: C.warm },
    { t: '2020 통합 우승 기념', font: F.sans(34, 400), color: C.gold },
  ], 900, 180), [])
  const roomTitle = useCanvasTexture(() => textTexture([
    { t: 'THE LEGACY ROOM', font: F.serif(74), color: C.warm },
    { t: '15th Anniversary & 2020 Champions', font: F.serif(34, false), color: C.gold },
  ], 760, 170, 'center'), [])
  const fifteen = useCanvasTexture(() => textTexture([{ t: '15', font: F.serif(150, true, 700), color: C.gold }], 256, 256, 'center'), [])

  const sc = (id: string) => {
    const s = showcases.find((x) => x.id === id)!
    const o = offsets[id] ?? { dx: 0, dz: 0 }
    return { ...s, x: s.x + o.dx, z: s.z + o.dz }
  }
  const sSword = sc('sc-sword'), tL = sc('sc-trophy-l'), tR = sc('sc-trophy-r'), s15 = sc('sc-15th'), s20 = sc('sc-2020')
  const roomW = room.x1 - room.x0
  const zoneCx = room.x0 + roomW * 0.42
  const pv = Math.pow(bright, 1.4)

  return (
    <group>
      {/* 기존 벽면(코너 2면) 네이비 마감 */}
      <WallBox r={{ x0: room.x0, x1: room.x1 + 0.1, z0: -0.1, z1: 0 }} h={H} />
      <WallBox r={{ x0: room.x1, x1: room.x1 + 0.1, z0: 0, z1: room.z1 + 0.1 }} h={H} />

      {showWalls && (
        <>
          {layout.moduleWalls.map((r, i) => <WallBox key={i} r={r} h={H} />)}
          <Louver r={layout.louver} h={H} transparency={transparency} />
          {/* 출입구 상부 헤더 */}
          <mesh position={[L - 0.05, (2.25 + H) / 2, layout.doorMid]}>
            <boxGeometry args={[0.1, H - 2.25, door.z1 - door.z0]} />
            <meshStandardMaterial color={C.navy} roughness={0.92} />
          </mesh>
          {/* 날개벽 안내 타이틀 (길목 끝에서 우측으로 꺾으면 정면) */}
          <TextPlane map={roomTitle} size={[1.05, 0.235]} position={[L - 0.6, 1.72, layout.wing.z0 - 0.004]} rotation={[0, Math.PI, 0]} />
          <Glow map={shared.wash} size={[1.3, 1.6]} position={[L - 0.6, 1.75, layout.wing.z0 - 0.003]} rotation={[0, Math.PI, 0]} opacity={0.2} />
          {showCeiling && mode !== 'top' && (
            <mesh position={[(room.x0 + room.x1) / 2, H + 0.01, room.z1 / 2]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[roomW + 0.2, room.z1 + 0.2]} />
              <meshStandardMaterial color="#07080b" roughness={1} side={THREE.DoubleSide} />
            </mesh>
          )}
        </>
      )}

      {/* 중앙 — 배경 사진 (어둡게, 저채도, 네이비 오버레이) */}
      <Selectable id="photo-yang" size={[0.05, photo.h, photo.w]} position={[room.x1 - 0.012, photo.h / 2 + 0.05, photo.z]}>
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[photo.w, photo.h]} />
          <meshBasicMaterial map={hero} color={new THREE.Color(pv, pv, pv)} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, -Math.PI / 2, 0]} position={[-0.004, 0, 0]} raycast={() => null} renderOrder={1}>
          <planeGeometry args={[photo.w, photo.h]} />
          <meshBasicMaterial color="#0b1222" transparent opacity={0.38} depthWrite={false} />
        </mesh>
      </Selectable>

      {/* 집행검 + 트로피 2 (각각 독립 쇼케이스) */}
      <Selectable id="sc-sword" size={[0.74, 2.2, 0.74]} center={[0, 1.1, 0]} position={[sSword.x, 0, sSword.z]}>
        <Showcase w={0.7} d={0.7} plinthH={0.45} glassH={1.7}><Sword /></Showcase>
        <Glow map={shared.glow} size={[2.6, 2.6]} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} opacity={0.3 * spot} />
      </Selectable>
      {[tL, tR].map((t) => (
        <Selectable key={t.id} id={t.id} size={[0.64, 1.8, 0.64]} center={[0, 0.9, 0]} position={[t.x, 0, t.z]}>
          <Showcase w={0.6} d={0.6} plinthH={0.95} glassH={0.8}><Trophy /></Showcase>
          <Glow map={shared.glow} size={[1.8, 1.8]} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} opacity={0.2 * spot} />
        </Selectable>
      ))}
      <SpotAt from={[sSword.x - 1.5, H - 0.12, sSword.z]} to={[sSword.x, 1.15, sSword.z]} intensity={90 * spot} angle={0.36} />
      <pointLight position={[sSword.x - 0.5, 1.3, sSword.z]} color={C.light} intensity={1.6 * spot} distance={3} decay={2} />
      <SpotAt from={[tL.x - 1.2, H - 0.12, tL.z]} to={[tL.x, 1.25, tL.z]} intensity={36 * spot} angle={0.3} />
      <SpotAt from={[tR.x - 1.2, H - 0.12, tR.z]} to={[tR.x, 1.25, tR.z]} intensity={36 * spot} angle={0.3} />

      {/* 좌측 — 15TH ANNIVERSARY (기존 벽면 쪽) */}
      <TextPlane map={title15} size={[1.9, 0.38]} position={[zoneCx - 0.35, H - 0.3, 0.004]} />
      {[-0.85, 0, 0.85].map((dx, i) => (
        <Slot key={i} id={`m-15th-${i + 1}`} label={`15주년 ${i + 1}`} size={[0.62, 0.8]} position={[zoneCx + dx, 1.72, 0.012]} />
      ))}
      <Glow map={shared.wash} size={[3.4, 1.9]} position={[zoneCx, 1.75, 0.006]} opacity={0.16} />
      <Selectable id="sc-15th" size={[2.64, 1.2, 0.6]} center={[0, 0.6, 0]} position={[s15.x, 0, s15.z]}>
        <Showcase w={2.6} d={0.55} plinthH={0.85} glassH={0.3}>
          <mesh position={[-0.85, 0.09, -0.08]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[0.34, 0.24, 0.02]} />
            <meshStandardMaterial color="#182445" roughness={0.6} emissive="#182445" emissiveIntensity={0.5} />
          </mesh>
          <TextPlane map={fifteen} size={[0.2, 0.2]} position={[-0.85, 0.094, -0.066]} rotation={[-0.35, 0, 0]} />
          <mesh position={[-0.25, 0.037, 0]}>
            <sphereGeometry args={[0.037, 20, 14]} />
            <meshStandardMaterial color="#efe9dc" roughness={0.7} emissive="#5c5546" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0.3, 0.012, 0]} rotation={[0, -0.2, 0]}>
            <boxGeometry args={[0.32, 0.02, 0.23]} />
            <meshStandardMaterial color="#d9d2c0" roughness={0.9} emissive="#5c5546" emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0.9, 0.03, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.012, 28]} />
            <meshStandardMaterial color="#d7b56a" metalness={0.9} roughness={0.3} emissive="#5a4212" emissiveIntensity={0.5} />
          </mesh>
        </Showcase>
      </Selectable>
      <SpotAt from={[zoneCx, H - 0.12, 1.7]} to={[zoneCx, 1.0, 0.3]} intensity={22 * spot} angle={0.75} distance={6} />

      {/* 우측 — 2020 CHAMPIONSHIP MEMORABILIA (모듈 가벽 쪽) */}
      <TextPlane map={title20} size={[1.9, 0.38]} position={[zoneCx + 0.35, H - 0.3, room.z1 - 0.004]} rotation={[0, Math.PI, 0]} />
      {[-0.85, 0, 0.85].map((dx, i) => (
        <Slot key={i} id={`m-2020-${i + 1}`} label={`2020 우승 ${i + 1}`} size={[0.62, 0.8]}
          position={[zoneCx - dx, 1.72, room.z1 - 0.012]} rotation={[0, Math.PI, 0]} />
      ))}
      <Glow map={shared.wash} size={[3.4, 1.9]} position={[zoneCx, 1.75, room.z1 - 0.006]} rotation={[0, Math.PI, 0]} opacity={0.16} />
      <Selectable id="sc-2020" size={[2.64, 1.2, 0.6]} center={[0, 0.6, 0]} position={[s20.x, 0, s20.z]}>
        <Showcase w={2.6} d={0.55} plinthH={0.85} glassH={0.3}>
          {[-0.9, -0.6, -0.3].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh position={[0, 0.025, 0]}>
                <boxGeometry args={[0.1, 0.05, 0.1]} />
                <meshStandardMaterial color="#0b0c0f" roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.085, 0]} rotation={[0.25, 0, 0]}>
                <torusGeometry args={[0.027, 0.011, 10, 24]} />
                <meshStandardMaterial color="#e2c275" metalness={0.95} roughness={0.22} emissive="#6b4e14" emissiveIntensity={0.7} />
              </mesh>
            </group>
          ))}
          <mesh position={[0.25, 0.037, 0]}>
            <sphereGeometry args={[0.037, 20, 14]} />
            <meshStandardMaterial color="#efe9dc" roughness={0.7} emissive="#5c5546" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0.8, 0.012, 0]} rotation={[0, 0.2, 0]}>
            <boxGeometry args={[0.36, 0.02, 0.25]} />
            <meshStandardMaterial color="#d9d2c0" roughness={0.9} emissive="#5c5546" emissiveIntensity={0.35} />
          </mesh>
        </Showcase>
      </Selectable>
      <SpotAt from={[zoneCx, H - 0.12, room.z1 - 1.7]} to={[zoneCx, 1.0, room.z1 - 0.3]} intensity={22 * spot} angle={0.75} distance={6} />

      {/* 하부 간접조명 */}
      <Glow map={shared.strip} size={[roomW - 0.4, 0.7]} position={[room.x0 + roomW / 2, 0.012, 0.36]} rotation={[Math.PI / 2, 0, 0]} opacity={0.22} />
      <Glow map={shared.strip} size={[photo.w, 0.8]} position={[room.x1 - 0.42, 0.012, midZ]} rotation={[Math.PI / 2, 0, -Math.PI / 2]} opacity={0.25} />
      <pointLight position={[room.x0 + roomW * 0.45, 2.2, midZ]} color={C.light} intensity={1.2} distance={7} decay={2} />
    </group>
  )
}
