import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { products, type Product } from '../../data/products'
import { Effects } from '../Effects'

// ─── Card shader — wedding invitation style ───────────────────────────────────
const CARD_VERT = /* glsl */`
  uniform float uTime;
  uniform float uHover;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // subtle floating wave, dampened when hovered
    pos.z += sin(uTime * 0.8 + pos.x * 1.5) * 0.015 * (1.0 - uHover * 0.7);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const CARD_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uHover;
  uniform sampler2D uTexture;
  uniform float uHasTexture;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // ── Base: dark warm glass ─────────────────────────────────────────
    vec3 base = vec3(0.055, 0.038, 0.020);

    // ── Image texture (shown when registered) ─────────────────────────
    if (uHasTexture > 0.5) {
      vec3 tex = texture2D(uTexture, uv).rgb;
      base = mix(base, tex, 0.92);
    }

    // ── Thin gold border ──────────────────────────────────────────────
    float bw = 0.022;
    float bx = max(smoothstep(bw, 0.0, uv.x), smoothstep(1.0 - bw, 1.0, uv.x));
    float by = max(smoothstep(bw, 0.0, uv.y), smoothstep(1.0 - bw, 1.0, uv.y));
    float border = max(bx, by);

    // ── Corner ornaments (wedding invitation style) ───────────────────
    float cSize = 0.20;
    float c00 = smoothstep(cSize, 0.0, length(uv - vec2(0.0, 0.0)));
    float c10 = smoothstep(cSize, 0.0, length(uv - vec2(1.0, 0.0)));
    float c01 = smoothstep(cSize, 0.0, length(uv - vec2(0.0, 1.0)));
    float c11 = smoothstep(cSize, 0.0, length(uv - vec2(1.0, 1.0)));
    float corners = (c00 + c10 + c01 + c11) * 0.35;

    // ── Shimmer: diagonal pearl sheen on hover ────────────────────────
    float shimmer = sin((uv.x - uv.y) * 12.0 + uTime * 0.6) * 0.5 + 0.5;
    shimmer = pow(shimmer, 8.0) * 0.06 * uHover;

    // ── Champagne gold color ──────────────────────────────────────────
    vec3 gold = vec3(0.84, 0.64, 0.24);
    vec3 pearl = vec3(0.97, 0.93, 0.86);

    vec3 color = base;
    color += border  * mix(gold, pearl, uHover) * (0.55 + uHover * 1.2);
    color += corners * gold * 0.45;
    color += shimmer * pearl;

    // soft vignette inside card when no texture
    if (uHasTexture < 0.5) {
      float vign = 1.0 - length((uv - 0.5) * 1.4);
      color *= 0.6 + vign * 0.4;
    }

    float alpha = 0.80 + border * 0.18 + uHover * 0.12;
    gl_FragColor = vec4(color, alpha);
  }
`

// ─── Product card ─────────────────────────────────────────────────────────────
interface ProductCardProps {
  product: Product
  position: [number, number, number]
  index: number
}

function ProductCard({ product, position, index }: ProductCardProps) {
  const meshRef  = useRef<THREE.Mesh>(null)
  const matRef   = useRef<THREE.ShaderMaterial>(null)
  const [hovered, setHovered] = useState(false)
  const goToDetail = useStore((s) => s.goToDetail)
  const scaleVec = useRef(new THREE.Vector3(1, 1, 1))

  // Load texture if product has an imageUrl that's a real path (not placeholder)
  const texture = useMemo(() => {
    if (!product.imageUrl || product.imageUrl.startsWith('#')) return null
    const loader = new THREE.TextureLoader()
    return loader.load(product.imageUrl)
  }, [product.imageUrl])

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uHover:      { value: 0 },
    uTexture:    { value: texture ?? new THREE.Texture() },
    uHasTexture: { value: texture ? 1.0 : 0.0 },
  }), [texture])

  useFrame(({ clock }) => {
    if (!matRef.current || !meshRef.current) return
    matRef.current.uniforms.uTime.value = clock.elapsedTime + index * 0.7

    const targetH = hovered ? 1.0 : 0.0
    matRef.current.uniforms.uHover.value +=
      (targetH - matRef.current.uniforms.uHover.value) * 0.08

    scaleVec.current.setScalar(hovered ? 1.07 : 1.0)
    meshRef.current.scale.lerp(scaleVec.current, 0.08)

    // Gentle vertical drift
    meshRef.current.position.y =
      position[1] + Math.sin(clock.elapsedTime * 0.5 + index * 1.1) * 0.07
  })

  // Card always faces camera (billboard per-card, not global)
  // (OrbitControls rotates the whole group, so cards face inward naturally)

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={() => goToDetail(product)}
        onPointerEnter={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'default' }}
      >
        <planeGeometry args={[1.6, 1.0, 1, 1]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={CARD_VERT}
          fragmentShader={CARD_FRAG}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Product label — only shown when no image */}
      {!texture && (
        <>
          <Text
            position={[0, 0.18, 0.02]}
            fontSize={0.075}
            color="#c9a84c"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.4}
          >
            {product.nameEn.toUpperCase()}
          </Text>
          <Text
            position={[0, 0.03, 0.02]}
            fontSize={0.13}
            color="#f5ede0"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.4}
          >
            {product.name}
          </Text>
          <Text
            position={[0, -0.14, 0.02]}
            fontSize={0.065}
            color="rgba(200,175,130,0.65)"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.4}
          >
            {product.category}
          </Text>
          <Text
            position={[0, -0.30, 0.02]}
            fontSize={0.09}
            color="#c9a84c"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.4}
          >
            {product.price}
          </Text>
        </>
      )}
    </group>
  )
}

// ─── Venue atmosphere — dark hall with floating gold motes ────────────────────
const VENUE_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const VENUE_FRAG = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p){ p=fract(p*vec2(127.1,311.7)); return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<4;i++){v+=a*noise(p);a*=.5;p*=2.1;} return v; }

  void main(){
    vec2 uv = vUv;
    float t = uTime * 0.05;

    float n = fbm(uv * 2.5 + vec2(t, t * 0.7));

    // Warm dark base: deep amber-black
    vec3 base  = vec3(0.038, 0.025, 0.010);
    vec3 mist  = vec3(0.180, 0.115, 0.040); // warm amber mist
    vec3 glow  = vec3(0.520, 0.370, 0.120); // champagne glow

    vec3 color = mix(base, mist, n * 0.5);
    color = mix(color, glow, pow(n, 4.0) * 0.25);

    // Soft radial glow — centre of venue
    float d = length(uv - 0.5) * 2.0;
    float radial = exp(-d * d * 1.4) * 0.18;
    color += glow * radial;

    // Very subtle top-light (chandelier above)
    float top = smoothstep(1.0, 0.0, abs(uv.x - 0.5) * 3.0) * smoothstep(1.0, 0.6, uv.y);
    color += vec3(0.4, 0.28, 0.08) * top * 0.12;

    // Vignette
    color *= 1.0 - d * d * 0.35;

    gl_FragColor = vec4(color, 1.0);
  }
`

function VenueAtmosphere() {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame(({ clock }) => { uniforms.uTime.value = clock.getElapsedTime() })
  return (
    <mesh position={[0, 0, -12]}>
      <planeGeometry args={[60, 60, 1, 1]} />
      <shaderMaterial vertexShader={VENUE_VERT} fragmentShader={VENUE_FRAG} uniforms={uniforms} />
    </mesh>
  )
}

// ─── Floating gold motes (dust in candlelight) ────────────────────────────────
const MOTE_VERT = /* glsl */`
  attribute float aPhase;
  uniform float uTime;
  varying float vAlpha;
  void main(){
    vec3 pos = position;
    // slow upward drift with gentle sway
    float t = uTime * 0.18 + aPhase;
    pos.y  += mod(t * 0.5, 14.0) - 7.0;   // wrap vertically
    pos.x  += sin(t * 0.9 + aPhase) * 0.3;
    pos.z  += cos(t * 0.7 + aPhase * 1.3) * 0.2;

    vAlpha = sin(t * 0.4) * 0.3 + 0.55;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 2.5 * (200.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`
const MOTE_FRAG = /* glsl */`
  varying float vAlpha;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    if(d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d) * vAlpha * 0.6;
    gl_FragColor = vec4(0.95, 0.78, 0.42, a);
  }
`

function GoldMotes() {
  const COUNT = 1400
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  const { positions, phases } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const ph  = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 18
      pos[i*3+1] = (Math.random() - 0.5) * 14
      pos[i*3+2] = (Math.random() - 0.5) * 10 - 4
      ph[i]      = Math.random() * Math.PI * 2
    }
    return { positions: pos, phases: ph }
  }, [])
  useFrame(({ clock }) => { uniforms.uTime.value = clock.getElapsedTime() })
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aPhase"   args={[phases,    1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={MOTE_VERT}
        fragmentShader={MOTE_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// ─── Card layout on a sphere ──────────────────────────────────────────────────
function ProductCards() {
  const positions = useMemo<[number, number, number][]>(() =>
    products.map((_, i) => {
      const n   = products.length
      const phi = Math.acos(-1 + (2 * i) / n)
      const th  = Math.sqrt(n * Math.PI) * phi
      const r   = 3.8
      return [r * Math.cos(th) * Math.sin(phi), r * Math.sin(th) * Math.sin(phi) * 0.75, r * Math.cos(phi)]
    }), [])

  return <>
    {products.map((p, i) => (
      <ProductCard key={p.id} product={p} position={positions[i]} index={i} />
    ))}
  </>
}

// ─── Drag hint animation (fades after 3 s) ────────────────────────────────────
function DragHint() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 3500)
    return () => clearTimeout(id)
  }, [])
  if (!visible) return null
  return (
    <div style={{
      position: 'absolute',
      bottom: '22%',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      animation: 'hintFade 3.5s ease-out forwards',
      pointerEvents: 'none',
    }}>
      {/* circular drag icon */}
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" stroke="rgba(210,175,110,0.5)" strokeWidth="1"/>
        <path d="M18 8 C24 12 26 18 18 28 C10 18 12 12 18 8Z"
              fill="none" stroke="rgba(210,175,110,0.6)" strokeWidth="1"
              style={{ animation: 'spin 4s linear infinite', transformOrigin: '18px 18px' }} />
      </svg>
      <p style={{
        fontSize: '9px',
        letterSpacing: '0.4em',
        color: 'rgba(210,175,110,0.55)',
        textTransform: 'uppercase',
        fontFamily: 'Inter, sans-serif',
      }}>drag to explore</p>
    </div>
  )
}

// ─── Main scene ───────────────────────────────────────────────────────────────
export function ProductScene() {
  const goBack = useStore((s) => s.goBack)
  const { camera } = useThree()

  useMemo(() => {
    camera.position.set(0, 0, 6.5)
    camera.lookAt(0, 0, 0)
  }, [camera])

  return (
    <>
      {/* Warm dark hall atmosphere */}
      <fogExp2 color="#0d0908" density={0.042} />
      <VenueAtmosphere />
      <GoldMotes />

      {/* Venue lighting */}
      <ambientLight intensity={0.18} color="#2a1805" />
      <pointLight position={[0,  7, 3]}  intensity={2.0} color="#f5d78a" decay={2} />
      <pointLight position={[4, -3, 3]}  intensity={0.9} color="#e8b090" decay={2} />
      <pointLight position={[-5, 2, 2]}  intensity={0.7} color="#d4a060" decay={2} />

      <ProductCards />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={3}
        maxDistance={10}
        autoRotate
        autoRotateSpeed={0.6}
        enableDamping
        dampingFactor={0.06}
        makeDefault
      />

      <Effects bloomIntensity={1.8} bloomThreshold={0.08} />

      <Html fullscreen>
        <div className="w-full h-full pointer-events-none" style={{ position: 'relative' }}>

          {/* Header */}
          <div style={{
            position: 'absolute', top: '7%', left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
          }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(9px, 2vw, 11px)',
              letterSpacing: '0.55em',
              color: 'rgba(210,175,110,0.5)',
              textTransform: 'uppercase',
            }}>Trunk Hotel</p>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(20px, 5vw, 28px)',
              fontWeight: 300,
              letterSpacing: '0.22em',
              color: 'rgba(245,232,205,0.9)',
            }}>Wedding Collection</h1>
            <div style={{ width: '28px', height: '1px', background: 'rgba(210,175,110,0.35)' }} />
          </div>

          {/* Drag hint */}
          <DragHint />

          {/* Bottom instruction */}
          <div style={{
            position: 'absolute', bottom: '6%', left: 0, right: 0,
            display: 'flex', justifyContent: 'center',
          }}>
            <p style={{
              fontSize: '10px',
              letterSpacing: '0.35em',
              color: 'rgba(210,175,110,0.38)',
              textTransform: 'uppercase',
              fontFamily: 'Inter, sans-serif',
            }}>Touch a card to view details</p>
          </div>

          {/* Back */}
          <button
            onClick={goBack}
            className="pointer-events-auto"
            style={{
              position: 'absolute', top: '7%', left: '6%',
              background: 'transparent',
              border: '1px solid rgba(210,175,110,0.28)',
              color: 'rgba(230,200,150,0.65)',
              padding: '8px 18px',
              fontSize: '10px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            ← Back
          </button>
        </div>

        <style>{`
          @keyframes hintFade { 0%{opacity:0} 15%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        `}</style>
      </Html>
    </>
  )
}
