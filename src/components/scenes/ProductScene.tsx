import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { products, type Product } from '../../data/products'
import { Effects } from '../Effects'

// ─── Sphere interior atmosphere shader ───────────────────────────────────────
const SPHERE_VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv     = uv;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const SPHERE_FRAG = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p){ p=fract(p*vec2(127.1,311.7)); return fract(sin(dot(p,vec2(12.98,78.23)))*43758.5); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){v+=a*noise(p);a*=.45;p*=2.2;} return v; }

  void main(){
    float t  = uTime * 0.04;
    float n  = fbm(vUv * 3.0 + vec2(t, t * 0.6));
    float n2 = fbm(vUv * 6.0 - vec2(t * 0.8, t * 1.1) + n * 0.4);

    // Warm dark interior: near-black amber → faint champagne mist
    vec3 c0 = vec3(0.030, 0.018, 0.007);   // near-black warm
    vec3 c1 = vec3(0.095, 0.058, 0.018);   // dark amber
    vec3 c2 = vec3(0.260, 0.170, 0.055);   // warm amber mist
    vec3 c3 = vec3(0.550, 0.390, 0.140);   // champagne veil

    vec3 color = mix(c0, c1, n);
    color = mix(color, c2, pow(n2, 2.5) * 0.45);
    color = mix(color, c3, pow(n * n2, 3.0) * 0.20);

    // Subtle top chandelier glow
    float topGlow = smoothstep(0.2, 0.8, vUv.y) * smoothstep(1.0, 0.3, abs(vUv.x - 0.5) * 2.0);
    color += vec3(0.30, 0.20, 0.06) * topGlow * 0.12;

    gl_FragColor = vec4(color, 1.0);
  }
`

function SphereEnvironment() {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame(({ clock }) => { uniforms.uTime.value = clock.getElapsedTime() })
  return (
    // Large sphere, rendered from inside (BackSide)
    <mesh>
      <sphereGeometry args={[16, 64, 32]} />
      <shaderMaterial
        side={THREE.BackSide}
        vertexShader={SPHERE_VERT}
        fragmentShader={SPHERE_FRAG}
        uniforms={uniforms}
      />
    </mesh>
  )
}

// ─── Reduced gold motes ───────────────────────────────────────────────────────
const MOTE_VERT = /* glsl */`
  attribute float aPhase;
  uniform float uTime;
  varying float vAlpha;
  void main(){
    vec3 pos = position;
    float t = uTime * 0.15 + aPhase;
    pos.x  += sin(t * 0.9 + aPhase)       * 0.25;
    pos.y  += mod(t * 0.4, 12.0) - 6.0;
    pos.z  += cos(t * 0.7 + aPhase * 1.3) * 0.18;
    vAlpha  = sin(t * 0.35) * 0.25 + 0.45;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 1.8 * (180.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`
const MOTE_FRAG = /* glsl */`
  varying float vAlpha;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    if(d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d) * vAlpha * 0.5;
    gl_FragColor = vec4(0.96, 0.80, 0.44, a);
  }
`
function GoldMotes() {
  const COUNT = 500   // reduced from 1400
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  const { positions, phases } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const ph  = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      // Place motes inside the sphere
      const r   = 2 + Math.random() * 8
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

// ─── Product card (no text, faces center) ────────────────────────────────────
const CARD_VERT = /* glsl */`
  uniform float uTime;
  uniform float uHover;
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vec3 pos = position;
    pos.z += sin(uTime * 0.7 + pos.x * 1.2) * 0.012 * (1.0 - uHover * 0.6);
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

    // Base: dark warm glass with image if available
    vec3 base = vec3(0.055, 0.038, 0.018);
    if(uHasTexture > 0.5){
      base = mix(base, texture2D(uTexture, uv).rgb, 0.92);
    }

    // Gold border
    float bw = 0.020;
    float border = max(
      max(smoothstep(bw, 0.0, uv.x), smoothstep(1.0-bw, 1.0, uv.x)),
      max(smoothstep(bw, 0.0, uv.y), smoothstep(1.0-bw, 1.0, uv.y))
    );
    // Corner ornaments
    float cS = 0.18;
    float corners = smoothstep(cS,0.,length(uv-vec2(0.,0.)))
                  + smoothstep(cS,0.,length(uv-vec2(1.,0.)))
                  + smoothstep(cS,0.,length(uv-vec2(0.,1.)))
                  + smoothstep(cS,0.,length(uv-vec2(1.,1.)));
    // Pearl shimmer on hover
    float shimmer = sin((uv.x - uv.y)*10. + uTime*0.5)*0.5+0.5;
    shimmer = pow(shimmer, 8.) * 0.05 * uHover;

    vec3 gold  = vec3(0.84, 0.64, 0.24);
    vec3 pearl = vec3(0.97, 0.93, 0.86);

    vec3 color = base;
    color += border  * mix(gold, pearl, uHover) * (0.5 + uHover * 1.3);
    color += corners * gold * 0.40;
    color += shimmer * pearl;

    if(uHasTexture < 0.5){
      float vign = 1.0 - length((uv-0.5)*1.4);
      color *= 0.55 + vign * 0.45;
    }

    float alpha = 0.78 + border*0.20 + uHover*0.12;
    gl_FragColor = vec4(color, alpha);
  }
`

interface CardProps {
  product:  Product
  position: [number, number, number]
  scale:    number
  tiltEuler: [number, number, number]
}

function ProductCard({ product, position, scale, tiltEuler }: CardProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef  = useRef<THREE.ShaderMaterial>(null)
  const [hovered, setHovered] = useState(false)
  const goToDetail = useStore((s) => s.goToDetail)
  const scaleVec   = useRef(new THREE.Vector3(scale, scale, scale))

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

  // Quaternion to face the center (0,0,0), accounting for tilt variation
  const quaternion = useMemo(() => {
    const dummy = new THREE.Object3D()
    dummy.position.set(...position)
    dummy.lookAt(0, 0, 0)
    dummy.rotateY(Math.PI)          // flip plane to show front face inward
    dummy.rotateX(tiltEuler[0])     // irregular tilt
    dummy.rotateZ(tiltEuler[2])
    return dummy.quaternion.clone()
  }, [position, tiltEuler])

  useFrame(({ clock }) => {
    if (!matRef.current || !meshRef.current) return
    matRef.current.uniforms.uTime.value  = clock.elapsedTime
    matRef.current.uniforms.uHover.value +=
      ((hovered ? 1.0 : 0.0) - matRef.current.uniforms.uHover.value) * 0.08

    const targetS = hovered ? scale * 1.06 : scale
    scaleVec.current.setScalar(targetS)
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
        <planeGeometry args={[1.7, 1.1, 1, 1]} />
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

// ─── Irregular card layout on sphere surface ──────────────────────────────────
// Seed-based random for stable layout across renders
function seededRand(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}

function ProductCards() {
  const layouts = useMemo(() => {
    const rand = seededRand(42)
    return products.map((_, i) => {
      // Two layers: odd cards on outer wall (R≈6), even cards floating (R≈4)
      const isWall = i % 2 === 0
      const r = isWall
        ? 5.5 + rand() * 1.2     // wall layer: R 5.5–6.7
        : 3.8 + rand() * 0.8     // float layer: R 3.8–4.6

      // Random spherical coordinates — irregular, covering full sphere
      const theta = rand() * Math.PI * 2
      const phi   = 0.25 + rand() * (Math.PI - 0.5)   // avoid poles

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.cos(phi)
      const z = r * Math.sin(phi) * Math.sin(theta)

      // Irregular scale & tilt
      const scale  = 0.85 + rand() * 0.45
      const tiltX  = (rand() - 0.5) * 0.20
      const tiltZ  = (rand() - 0.5) * 0.16

      return {
        pos: [x, y, z] as [number, number, number],
        scale,
        tilt: [tiltX, 0, tiltZ] as [number, number, number],
      }
    })
  }, [])

  return <>
    {products.map((p, i) => (
      <ProductCard
        key={p.id}
        product={p}
        position={layouts[i].pos}
        scale={layouts[i].scale}
        tiltEuler={layouts[i].tilt}
      />
    ))}
  </>
}

// ─── Fade-in black plane on mount ─────────────────────────────────────────────
function FadeInCurtain() {
  const meshRef  = useRef<THREE.Mesh>(null)
  const alphaRef = useRef(1.0)
  const { camera } = useThree()

  useFrame(() => {
    if (!meshRef.current || alphaRef.current <= 0) return
    alphaRef.current = Math.max(0, alphaRef.current - 0.018) // ~55 frames ≈ 0.9 s
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = alphaRef.current
    if (alphaRef.current <= 0) meshRef.current.visible = false
  })

  // Follow camera so it always covers the viewport
  useFrame(() => {
    if (!meshRef.current || !meshRef.current.visible) return
    meshRef.current.position.copy(camera.position)
    meshRef.current.quaternion.copy(camera.quaternion)
    meshRef.current.translateZ(-0.5)
  })

  return (
    <mesh ref={meshRef} renderOrder={999}>
      <planeGeometry args={[4, 4]} />
      <meshBasicMaterial
        color="#000000"
        transparent
        opacity={1}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}

// ─── Main scene ───────────────────────────────────────────────────────────────
export function ProductScene() {
  const goBack = useStore((s) => s.goBack)
  const { camera } = useThree()

  useMemo(() => {
    camera.position.set(0, 0, 0.5)  // inside the sphere
    camera.lookAt(0, 0, -1)
  }, [camera])

  return (
    <>
      <SphereEnvironment />
      <GoldMotes />
      <FadeInCurtain />

      {/* Warm interior lighting */}
      <ambientLight intensity={0.25} color="#2a1808" />
      <pointLight position={[0,  5, 0]}  intensity={2.5} color="#f5d78a" decay={2} />
      <pointLight position={[3, -2, 3]}  intensity={1.0} color="#e8a880" decay={2} />
      <pointLight position={[-4, 1, -2]} intensity={0.8} color="#d4a060" decay={2} />

      <ProductCards />

      <OrbitControls
        enablePan={false}
        enableZoom={false}      // no zoom — you're inside the sphere
        enableDamping
        dampingFactor={0.04}
        autoRotate
        autoRotateSpeed={0.35}
        makeDefault
      />

      <Effects bloomIntensity={1.6} bloomThreshold={0.10} />

      {/* Minimal UI: back button only */}
      <Html fullscreen>
        <div className="w-full h-full pointer-events-none" style={{ position: 'relative' }}>
          <button
            onClick={goBack}
            className="pointer-events-auto"
            style={{
              position: 'absolute',
              top: '6%', left: '6%',
              background: 'transparent',
              border: '1px solid rgba(210,175,110,0.30)',
              color: 'rgba(230,200,150,0.65)',
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
