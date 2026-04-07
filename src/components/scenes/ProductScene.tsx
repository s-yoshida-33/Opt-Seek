import { useRef, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
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
  uniform float uFade;          // 1.0=visible  0.0=transparent (phase-2 fade)
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

    float alpha = (0.80 + border*0.18 + uHover*0.12) * uFade;
    gl_FragColor = vec4(color, alpha);
  }
`

// ─── Product card with fly-toward-camera animation ───────────────────────────
interface CardProps {
  product:   Product
  position:  [number, number, number]
  baseScale: number
  tilt:      [number, number, number]
}

function ProductCard({ product, position, baseScale, tilt }: CardProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef  = useRef<THREE.Mesh>(null)
  const matRef   = useRef<THREE.ShaderMaterial>(null)
  const [hovered,  setHovered]  = useState(false)
  const [animating, setAnimating] = useState(false)
  const startCardTransition = useStore((s) => s.startCardTransition)
  const { camera }          = useThree()
  const scaleVec = useRef(new THREE.Vector3(baseScale, baseScale, baseScale))

  const texture = useMemo(() => {
    if (!product.imageUrl || product.imageUrl.startsWith('#')) return null
    return new THREE.TextureLoader().load(product.imageUrl)
  }, [product.imageUrl])

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uHover:      { value: 0 },
    uFade:       { value: 1.0 },   // phase-2 fade-out
    uTexture:    { value: texture ?? new THREE.Texture() },
    uHasTexture: { value: texture ? 1.0 : 0.0 },
  }), [texture])

  // Face center + irregular tilt
  const quaternion = useMemo(() => {
    const dummy = new THREE.Object3D()
    dummy.position.set(...position)
    dummy.lookAt(0, 0, 0)
    dummy.rotateY(Math.PI)
    dummy.rotateX(tilt[0])
    dummy.rotateZ(tilt[2])
    return dummy.quaternion.clone()
  }, [position, tilt])

  useFrame(({ clock }) => {
    if (!matRef.current || !meshRef.current) return
    matRef.current.uniforms.uTime.value  = clock.elapsedTime
    matRef.current.uniforms.uHover.value +=
      ((hovered && !animating ? 1.0 : 0.0) - matRef.current.uniforms.uHover.value) * 0.08
    if (!animating) {
      scaleVec.current.setScalar(hovered ? baseScale * 1.07 : baseScale)
      meshRef.current.scale.lerp(scaleVec.current, 0.07)
    }
  })

  const handleClick = () => {
    if (animating) return
    setAnimating(true)
    setHovered(false)

    const group = groupRef.current
    if (!group) return

    // ── Target position: 1.8 units in front of camera ─────────────────────
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    const centerPos = camera.position.clone().add(forward.multiplyScalar(1.8))

    // ── Target quaternion: card aligned with screen (faces camera straight) ─
    const dummy = new THREE.Object3D()
    dummy.position.copy(centerPos)
    dummy.lookAt(camera.position)
    dummy.rotateY(Math.PI)          // flip front face toward camera
    const centerQuat = dummy.quaternion.clone()

    const tl = gsap.timeline()

    // ── Phase 1 (0 → 0.55 s): fly to center, straighten, medium scale ──────
    tl.to(group.position, {
      x: centerPos.x, y: centerPos.y, z: centerPos.z,
      duration: 0.55, ease: 'power2.out',
    }, 0)
    tl.to(group.quaternion, {
      x: centerQuat.x, y: centerQuat.y,
      z: centerQuat.z, w: centerQuat.w,
      duration: 0.55, ease: 'power2.out',
    }, 0)
    tl.to(group.scale, {
      x: 2.6, y: 2.6, z: 2.6,
      duration: 0.55, ease: 'power2.out',
    }, 0)

    // ── Phase 2 (0.55 → 0.90 s): expand + fade out ──────────────────────────
    tl.to(group.scale, {
      x: 10, y: 10, z: 10,
      duration: 0.35, ease: 'power2.in',
    })
    tl.to(uniforms.uFade, {
      value: 0,
      duration: 0.35, ease: 'power1.in',
    }, '-=0.35')

    // ── Trigger black curtain at start of phase 2 ──────────────────────────
    tl.call(() => startCardTransition(product), [], 0.55)
  }

  return (
    <group ref={groupRef} position={position} quaternion={quaternion}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerEnter={() => { if (!animating) { setHovered(true);  document.body.style.cursor = 'pointer' } }}
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

    // Radii for 3 layers
    // Layer names match the client brief:
    //   wall  = カメラから最も遠い  (R 14–16)
    //   shelf = 壁より少し手前      (R  9–11)
    //   float = さらに手前          (R  5–7)
    const rWall  = count > 50 ? 16.0 : count > 20 ? 15.0 : 14.0
    const rShelf = count > 50 ? 11.0 : count > 20 ? 10.0 :  9.5
    const rFloat = count > 50 ?  7.0 : count > 20 ?  6.5 :  5.5

    return products.map((_, i) => {
      // Fibonacci base angles (even coverage) + jitter (irregular feel)
      const jitterScale = 0.45
      const basePhi   = Math.acos(Math.max(-1, Math.min(1, 1 - 2*(i+0.5)/count)))
      const baseTheta = i * PHI

      const phi   = Math.max(0.18, Math.min(Math.PI - 0.18,
                      basePhi  + (rand()-0.5) * jitterScale))
      const theta = baseTheta + (rand()-0.5) * jitterScale * 2

      // Layer assignment: ~60% wall, ~25% shelf, ~15% float
      const layer = rand()
      const r = layer < 0.60 ? rWall  + rand()*1.5   // wall:  14–17.5
              : layer < 0.85 ? rShelf + rand()*1.2   // shelf:  9–12.2
              :                rFloat + rand()*1.0   // float:  5–8

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.cos(phi)
      const z = r * Math.sin(phi) * Math.sin(theta)

      // Card scale: larger to compensate for greater distance
      const distFactor = r / 9.0   // wall cards get bigger to stay readable
      const baseScale  = (Math.max(0.55, 1.20 - count * 0.004) + rand() * 0.35) * distFactor
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

// ─── Main scene ───────────────────────────────────────────────────────────────
export function ProductScene() {
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
        enableZoom
        zoomSpeed={1.2}
        minDistance={0.5}   // camera near center — see full panorama
        maxDistance={12}    // zoom in toward shelf/float layers
        enableDamping
        dampingFactor={0.04}
        autoRotate
        autoRotateSpeed={0.28}
        makeDefault
      />

      <Effects bloomIntensity={1.5} bloomThreshold={0.10} />
    </>
  )
}
