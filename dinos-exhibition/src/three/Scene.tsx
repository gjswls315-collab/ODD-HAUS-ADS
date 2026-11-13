import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { useLayout } from '../useLayout'
import { CameraRig } from './CameraRig'
import { Corridor } from './Corridor'
import { Hall } from './Hall'
import { LegacyRoom } from './LegacyRoom'

export function Scene() {
  const layout = useLayout()
  const select = useStore((s) => s.select)
  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      dpr={[1, 1.75]}
      camera={{ fov: 66, near: 0.08, far: 120, position: [-2.6, 1.6, 2] }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={['#07090d']} />
      <fog attach="fog" args={['#07090d', 30, 70]} />
      <Hall layout={layout} />
      <Corridor layout={layout} />
      <LegacyRoom layout={layout} />
      <CameraRig layout={layout} />
    </Canvas>
  )
}
