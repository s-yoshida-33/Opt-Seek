import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { useStore } from './store/useStore'
import { IdlingScene }    from './components/scenes/IdlingScene'
import { TransitionScene } from './components/scenes/TransitionScene'
import { ProductScene }   from './components/scenes/ProductScene'
import { DetailScene }    from './components/scenes/DetailScene'

// ─── Scene router (Three.js only, no HTML overlays) ──────────────────────────
function SceneRouter() {
  const scene = useStore((s) => s.scene)
  return (
    <>
      {scene === 'idling'     && <IdlingScene />}
      {scene === 'transition' && <TransitionScene />}
      {scene === 'products'   && <ProductScene />}
      {scene === 'detail'     && <DetailScene />}
    </>
  )
}

// ─── UI layer: entirely outside <Canvas> so it never blocks OrbitControls ────
function AppUI() {
  const scene          = useStore((s) => s.scene)
  const goBack         = useStore((s) => s.goBack)
  const cardTransition = useStore((s) => s.cardTransition)

  const showBack = scene === 'products' || scene === 'detail'

  return (
    <>
      {/* Card-select fade overlay — black curtain that appears while card flies in */}
      <div
        aria-hidden
        style={{
          position:   'absolute',
          inset:       0,
          background: '#000',
          opacity:    cardTransition ? 1 : 0,
          transition: cardTransition
            ? 'opacity 0.55s cubic-bezier(0.4, 0, 1, 1)'   // fast fade-in
            : 'opacity 0.0s',
          pointerEvents: 'none',
          zIndex: 30,
        }}
      />

      {/* Back button — shown in products + detail scenes */}
      {showBack && (
        <button
          onClick={goBack}
          style={{
            position:   'absolute',
            top:        '6%',
            left:       '6%',
            zIndex:     40,
            background: 'transparent',
            border:     '1px solid rgba(210,175,110,0.30)',
            color:      'rgba(230,200,150,0.65)',
            padding:    '8px 18px',
            fontSize:   '10px',
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            cursor:     'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          ← Back
        </button>
      )}
    </>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <div id="stage">
      <Canvas
        gl={{ antialias: true }}
        camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 0, 5] }}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = 'none'
        }}
      >
        <color attach="background" args={['#000308']} />
        <Suspense fallback={null}>
          <SceneRouter />
        </Suspense>
      </Canvas>

      {/* DOM UI — outside Canvas, never interferes with WebGL events */}
      <AppUI />
    </div>
  )
}
