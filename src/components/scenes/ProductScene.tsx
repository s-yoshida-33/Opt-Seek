import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { products, type Product } from '../../data/products'
import { Effects } from '../Effects'

// ─── Seamless sphere interior shader ─────────────────────────────────────────
// Key: sample noise using the 3D direction vector (normalize(position))
// instead of UV — UV has a seam at θ=2π, but 3D space is fully continuous.
const SPHERE_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir        = normalize(position);   // unit sphere direction, no seam
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const SPHERE_FRAG = /* glsl */`
  uniform float uTime;
  varying vec3  vDir;

  // 3-D value noise — seamless because it samples from continuous 3D space
  float hash3(vec3 p){
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float noise3(vec3 p){
    vec3 i = floor(p), f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(
      mix(mix(hash3(i),             hash3(i+vec3(1,0,0)), f.x),
          mix(hash3(i+vec3(0,1,0)), hash3(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(hash3(i+vec3(0,0,1)), hash3(i+vec3(1,0,1)), f.x),
          mix(hash3(i+vec3(0,1,1)), hash3(i+vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p){
    float v=0., a=0.5;
    for(int i=0;i<5;i++){
      v += a*noise3(p);
      a *= 0.45;
      p  = p*2.1 + vec3(1.7, 3.1, 2.4);
    }
    return v;
  }

  void main(){
    float t  = uTime * 0.035;
    vec3  d  = vDir;

    // Multi-octave FBM entirely in 3D — zero seam anywhere on sphere
    float n  = fbm3(d * 2.8  + vec3( t,       t*0.55,  t*0.30));
    float n2 = fbm3(d * 5.5  + vec3(-t*0.75,  t*0.50,  t*1.05) + d*n*0.35);
    float n3 = fbm3(d * 11.0 + vec3( t*1.30, -t*0.80, -t*0.60) + d*n2*0.20);

    float val = n*0.5 + n2*0.30 + n3*0.12;

    // Warm chapel palette: black → amber → champagne
    vec3 c0 = vec3(0.028, 0.016, 0.006);
    vec3 c1 = vec3(0.090, 0.054, 0.016);
    vec3 c2 = vec3(0.240, 0.155, 0.048);
    vec3 c3 = vec3(0.500, 0.350, 0.115);

    vec3 color = mix(c0, c1, val);
    color = mix(color, c2, pow(n2,  2.5) * 0.48);
    color = mix(color, c3, pow(val, 4.0) * 0.22);

    // Chandelier top-glow — use vDir.y (latitude), continuous on sphere
    float topGlow = smoothstep(-0.2, 1.0, vDir.y) * (1.0 - length(vDir.xz)*0.7);
    color += vec3(0.28, 0.18, 0.05) * topGlow * 0.14;

    gl_FragColor = vec4(color, 1.0);
  }
`

function SphereEnvironment() {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame(({ clock }) => { uniforms.uTime.value = clock.getElapsedTime() })
  return (
    <mesh>
      <sphereGeometry args={[18, 80, 48]} />   {/* higher segments for smooth silhouette */}
      <shaderMaterial
        side={THREE.BackSide}
        vertexShader={SPHERE_VERT}
        fragmentShader={SPHERE_FRAG}
        uniforms={uniforms}
      />
    </mesh>
  )
}

// ─── Minimal gold motes (further reduced) ────────────────────────────────────
const MOTE_VERT = /* glsl */`
  attribute float aPhase;
  uniform float uTime;
  varying float vAlpha;
  void main(){
    vec3 pos = position;
    float t  = uTime * 0.14 + aPhase;
    pos.x   += sin(t * 0.85 + aPhase)       * 0.22;
    pos.y   += mod(t * 0.38, 12.0) - 6.0;
    pos.z   += cos(t * 0.70 + aPhase * 1.3) * 0.16;
    vAlpha   = sin(t * 0.30) * 0.20 + 0.38;
    vec4 mv  = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 1.4 * (160.0 / -mv.z);  // smaller
    gl_Position  = projectionMatrix * mv;
  }
`
const MOTE_FRAG = /* glsl */`
  varying float vAlpha;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    if(d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d) * vAlpha * 0.45;
    gl_FragColor = vec4(0.96, 0.80, 0.44, a);
  }
`
function GoldMotes() {
  const COUNT = 280   // further reduced
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  const { positions, phases } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const ph  = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const r   = 2 + Math.random() * 7
      const th  = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      pos[i*3]   = r * Math.sin(phi) * Math.cos(th)
      pos[i*3+1] = r * Math.cos(phi)
      pos[i*3+2] = r * Math.sin(phi) * Math.sin(th)
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
        transparent depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// ─── Card shader ─────────────────────────────────────────────────────────────
const CARD_VERT = /* glsl */`
  uniform float uTime;
  uniform float uHover;
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vec3 pos = position;
    pos.z += sin(uTime*0.65 + pos.x*1.1) * 0.010 * (1.0 - uHover*0.6);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`
const CARD_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uHover;
  uniform sampler2D uTexture;
  uniform float uHasTexture;
  varying vec2 vUv;
  void main(){
    vec2 uv = vUv;
    vec3 base = vec3(0.055, 0.038, 0.018);
    if(uHasTexture > 0.5) base = mix(base, texture2D(uTexture, uv).rgb, 0.92);

    float bw = 0.018;
    float border = max(max(smoothstep(bw,0.,uv.x), smoothstep(1.-bw,1.,uv.x)),
                       max(smoothstep(bw,0.,uv.y), smoothstep(1.-bw,1.,uv.y)));
    float cS = 0.16;
    float corners = smoothstep(cS,0.,length(uv-vec2(0.,0.)))
                  + smoothstep(cS,0.,length(uv-vec2(1.,0.)))
                  + smoothstep(cS,0.,length(uv-vec2(0.,1.)))
                  + smoothstep(cS,0.,length(uv-vec2(1.,1.)));
    float shimmer = pow(sin((uv.x-uv.y)*9.+uTime*0.45)*0.5+0.5, 8.) * 0.05 * uHover;

    vec3 gold  = vec3(0.84, 0.64, 0.24);
    vec3 pearl = vec3(0.97, 0.93, 0.86);
    vec3 color = base;
    color += border  * mix(gold, pearl, uHover) * (0.48 + uHover*1.25);
    color += corners * gold * 0.38;
    color += shimmer * pearl;
    if(uHasTexture < 0.5){ float v=1.-length((uv-.5)*1.4); color*=0.5+v*0.5; }

    gl_FragColor = vec4(color, 0.80 + border*0.18 + uHover*0.12);
  }
`

// ─── Product card ─────────────────────────────────────────────────────────────
interface CardProps {
  product:   Product
  position:  [number, number, number]
  baseScale: number
  tilt:      [number, number, number]
}

function ProductCard({ product, position, baseScale, tilt }: CardProps) {
  const meshRef  = useRef<THREE.Mesh>(null)
  const matRef   = useRef<THREE.ShaderMaterial>(null)
  const [hovered, setHovered] = useState(false)
  const goToDetail = useStore((s) => s.goToDetail)
  const scaleVec   = useRef(new THREE.Vector3(baseScale, baseScale, baseScale))

  const texture = useMemo(() => {
    if (!product.imageUrl || product.imageUrl.startsWith('#')) return null
    return new THREE.TextureLoader().load(product.imageUrl)
  }, [product.imageUrl])

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uHover:      { value: 0 },
    uTexture:    { value: texture ?? new THREE.Texture() },
    uHasTexture: { value: texture ? 1.0 : 0.0 },
  }), [texture])

  // Quaternion: face center (0,0,0) from sphere surface position + random tilt
  const quaternion = useMemo(() => {
    const dummy = new THREE.Object3D()
    dummy.position.set(...position)
    dummy.lookAt(0, 0, 0)
    dummy.rotateY(Math.PI)        // flip so PlaneGeometry +Z faces inward
    dummy.rotateX(tilt[0])
    dummy.rotateZ(tilt[2])
    return dummy.quaternion.clone()
  }, [position, tilt])

  useFrame(({ clock }) => {
    if (!matRef.current || !meshRef.current) return
    matRef.current.uniforms.uTime.value  = clock.elapsedTime
    matRef.current.uniforms.uHover.value +=
      ((hovered ? 1.0 : 0.0) - matRef.current.uniforms.uHover.value) * 0.08
    scaleVec.current.setScalar(hovered ? baseScale * 1.07 : baseScale)
    meshRef.current.scale.lerp(scaleVec.current, 0.07)
  })

  return (
    <group position={position} quaternion={quaternion}>
      <mesh
        ref={meshRef}
        onClick={() => goToDetail(product)}
        onPointerEnter={() => { setHovered(true);  document.body.style.cursor = 'pointer' }}
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
    </group>
  )
}

// ─── Sphere surface layout — scales to 1–100+ products ───────────────────────
// Strategy: Fibonacci sphere gives even angular distribution; add jitter for
// the irregular/chaotic feel the client wants; 3 radii for depth layering.
function seededRand(seed: number) {
  let s = seed
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 | 0
    return (s >>> 0) / 0xffffffff
  }
}

function ProductCards() {
  const count = products.length

  const layouts = useMemo(() => {
    const rand = seededRand(7)
    const PHI  = Math.PI * (3 - Math.sqrt(5))   // golden angle ≈ 137.5°

    // Radii for 3 layers — scale outward a bit with card count
    const rOuter = count > 30 ? 9.5 : count > 15 ? 8.0 : 6.8
    const rMid   = count > 30 ? 7.0 : count > 15 ? 6.0 : 5.0
    const rInner = count > 30 ? 5.0 : count > 15 ? 4.2 : 3.6

    return products.map((_, i) => {
      // Fibonacci base angles (even coverage) + jitter (irregular feel)
      const jitterScale = 0.45
      const basePhi   = Math.acos(Math.max(-1, Math.min(1, 1 - 2*(i+0.5)/count)))
      const baseTheta = i * PHI

      const phi   = Math.max(0.18, Math.min(Math.PI - 0.18,
                      basePhi  + (rand()-0.5) * jitterScale))
      const theta = baseTheta + (rand()-0.5) * jitterScale * 2

      // Layer assignment: ~60% wall, ~25% mid, ~15% inner
      const layer = rand()
      const r = layer < 0.60 ? rOuter + rand()*1.0
              : layer < 0.85 ? rMid   + rand()*0.8
              :                rInner + rand()*0.6

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.cos(phi)
      const z = r * Math.sin(phi) * Math.sin(theta)

      // Card scale: smaller when there are many cards
      const baseScale = Math.max(0.50, 1.15 - count * 0.006) + rand() * 0.30
      const tiltX     = (rand()-0.5) * 0.24
      const tiltZ     = (rand()-0.5) * 0.18

      return {
        pos:   [x, y, z] as [number, number, number],
        scale: baseScale,
        tilt:  [tiltX, 0, tiltZ] as [number, number, number],
      }
    })
  }, [count])

  return <>
    {products.map((p, i) => (
      <ProductCard
        key={p.id}
        product={p}
        position={layouts[i].pos}
        baseScale={layouts[i].scale}
        tilt={layouts[i].tilt}
      />
    ))}
  </>
}

// ─── CSS fade-in on scene entry ───────────────────────────────────────────────
function FadeInOverlay() {
  const [opacity, setOpacity] = useState(1)
  useEffect(() => {
    const id = setTimeout(() => setOpacity(0), 80)
    return () => clearTimeout(id)
  }, [])
  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#000',
      opacity, transition: 'opacity 1.0s ease',
      pointerEvents: 'none', zIndex: 50,
    }} />
  )
}

// ─── Main scene ───────────────────────────────────────────────────────────────
export function ProductScene() {
  const goBack = useStore((s) => s.goBack)
  const { camera } = useThree()

  useMemo(() => {
    camera.position.set(0, 0, 0.5)
    camera.lookAt(0, 0, -1)
  }, [camera])

  return (
    <>
      <SphereEnvironment />
      <GoldMotes />

      <ambientLight intensity={0.22} color="#2a1808" />
      <pointLight position={[0,  6,  0]} intensity={2.4} color="#f5d78a" decay={2} />
      <pointLight position={[3, -2,  4]} intensity={0.9} color="#e8a880" decay={2} />
      <pointLight position={[-4, 2, -2]} intensity={0.7} color="#d4a060" decay={2} />

      <ProductCards />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.04}
        autoRotate
        autoRotateSpeed={0.30}
        makeDefault
      />

      <Effects bloomIntensity={1.5} bloomThreshold={0.10} />

      <Html fullscreen>
        <FadeInOverlay />
        <div className="w-full h-full pointer-events-none" style={{ position: 'relative' }}>
          <button
            onClick={goBack}
            className="pointer-events-auto"
            style={{
              position: 'absolute', top: '6%', left: '6%',
              background: 'transparent',
              border: '1px solid rgba(210,175,110,0.28)',
              color: 'rgba(230,200,150,0.62)',
              padding: '8px 18px',
              fontSize: '10px',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            ← Back
          </button>
        </div>
      </Html>
    </>
  )
}
