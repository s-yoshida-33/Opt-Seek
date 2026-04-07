import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { useStore } from './store/useStore'
import { IdlingScene } from './components/scenes/IdlingScene'
import { TransitionScene } from './components/scenes/TransitionScene'
import { ProductScene } from './components/scenes/ProductScene'
import { DetailScene } from './components/scenes/DetailScene'

function SceneRouter() {
  const scene = useStore((s) => s.scene)

  return (
    <>
      {scene === 'idling' && <IdlingScene />}
      {scene === 'transition' && <TransitionScene />}
      {scene === 'products' && <ProductScene />}
      {scene === 'detail' && <DetailScene />}
    </>
  )
}

export default function App() {
  return (
    <div id="stage">
      <Canvas
        gl={{ antialias: true }}
        camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 0, 5] }}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          // Ensure canvas captures all pointer events
          gl.domElement.style.touchAction = 'none'
        }}
      >
        <color attach="background" args={['#000308']} />
        <Suspense fallback={null}>
          <SceneRouter />
        </Suspense>
      </Canvas>
    </div>
  )
}
