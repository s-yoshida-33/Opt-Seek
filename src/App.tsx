import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { useStore } from './store/useStore'
import { IdlingScene }     from './components/scenes/IdlingScene'
import { CinematicScene }  from './components/scenes/CinematicScene'
import { ProductScene }    from './components/scenes/ProductScene'
import { DetailScene }     from './components/scenes/DetailScene'

// ─── Scene router (Three.js only, no HTML overlays) ──────────────────────────
function SceneRouter() {
  const scene = useStore((s) => s.scene)
  return (
    <>
      {scene === 'idling'     && <IdlingScene />}
      {scene === 'cinematic'  && <CinematicScene />}
      {scene === 'products'   && <ProductScene />}
      {scene === 'detail'     && <DetailScene />}
    </>
  )
}

// ─── UI layer: entirely outside <Canvas> so it never blocks OrbitControls ────
function AppUI() {
  const scene           = useStore((s) => s.scene)
  const goBack          = useStore((s) => s.goBack)
  const cardTransition  = useStore((s) => s.cardTransition)
  const selectedProduct = useStore((s) => s.selectedProduct)

  const showBack = scene === 'products' || scene === 'detail'

  // Detail scene: inherit the product accent color for the back button
  const isDetail   = scene === 'detail' && !!selectedProduct
  const btnColor   = isDetail ? selectedProduct!.accentColor       : 'rgba(230,200,150,0.65)'
  const btnBorder  = isDetail ? `1px solid ${selectedProduct!.accentColor}44` : '1px solid rgba(210,175,110,0.30)'

  return (
    <>
      {/* Card-select fade — black curtain while card flies toward camera */}
      <div
        aria-hidden
        style={{
          position:   'absolute',
          inset:       0,
          background: '#000',
          opacity:    cardTransition ? 1 : 0,
          transition: cardTransition
            ? 'opacity 0.50s cubic-bezier(0.4, 0, 1, 1)'
            : 'opacity 0.55s cubic-bezier(0, 0, 0.6, 1)',
          pointerEvents: 'none',
          zIndex: 30,
        }}
      />

      {/* Single back button — works for both products and detail scenes */}
      {showBack && (
        <button
          onClick={goBack}
          style={{
            position:      'absolute',
            top:           '6%',
            left:          '6%',
            zIndex:         40,
            background:    'transparent',
            border:        btnBorder,
            color:         btnColor,
            padding:       '8px 18px',
            fontSize:      '10px',
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            cursor:        'pointer',
            fontFamily:    'Inter, sans-serif',
            opacity:       0.85,
            transition:    'border-color 0.4s, color 0.4s',
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
