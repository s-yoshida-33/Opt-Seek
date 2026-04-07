import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { useStore } from '../../store/useStore'
import { products } from '../../data/products'
import { Effects } from '../Effects'

// ── How many cards participate in the cinematic ───────────────────────────────
const N = Math.min(products.length, 14)
const RING_R     = 2.2   // carousel radius
const RING_SPEED = 1.3   // rad/s during rotation phase

// ── Sphere environment shader (identical to ProductScene) ─────────────────────
const SPHERE_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir        = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const SPHERE_FRAG = /* glsl */`
  uniform float uTime;
  varying vec3  vDir;
  float hash3(vec3 p){ p=fract(p*vec3(0.1031,0.1030,0.0973)); p+=dot(p,p.yxz+33.33); return fract((p.x+p.y)*p.z); }
  float noise3(vec3 p){
    vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash3(i),          hash3(i+vec3(1,0,0)),f.x),
                   mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),
                   mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm3(vec3 p){ float v=0.,a=0.5; for(int i=0;i<5;i++){v+=a*noise3(p);a*=0.45;p=p*2.1+vec3(1.7,3.1,2.4);} return v; }
  void main(){
    float t=uTime*0.035; vec3 d=vDir;
    float n =fbm3(d*2.8 +vec3( t,      t*0.55, t*0.30));
    float n2=fbm3(d*5.5 +vec3(-t*0.75, t*0.50, t*1.05)+d*n*0.35);
    float n3=fbm3(d*11.0+vec3( t*1.30,-t*0.80,-t*0.60)+d*n2*0.20);
    float val=n*0.5+n2*0.30+n3*0.12;
    vec3 c0=vec3(0.028,0.016,0.006),c1=vec3(0.090,0.054,0.016),
         c2=vec3(0.240,0.155,0.048),c3=vec3(0.500,0.350,0.115);
    vec3 color=mix(c0,c1,val);
    color=mix(color,c2,pow(n2,2.5)*0.48);
    color=mix(color,c3,pow(val,4.0)*0.22);
    float topGlow=smoothstep(-0.2,1.0,vDir.y)*(1.0-length(vDir.xz)*0.7);
    color+=vec3(0.28,0.18,0.05)*topGlow*0.14;
    gl_FragColor=vec4(color,1.0);
  }
`

// ── Card shader (no hover — simplified for cinematic) ─────────────────────────
const CARD_VERT = /* glsl */`
  varying vec2 vUv;
  void main(){
    vUv         = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const CARD_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uFade;
  varying vec2 vUv;
  void main(){
    vec2 uv = vUv;
    vec3 base = vec3(0.055, 0.038, 0.018);
    float bw  = 0.018;
    float border = max(max(smoothstep(bw,0.,uv.x), smoothstep(1.-bw,1.,uv.x)),
                       max(smoothstep(bw,0.,uv.y), smoothstep(1.-bw,1.,uv.y)));
    float cS = 0.16;
    float corners = smoothstep(cS,0.,length(uv-vec2(0.,0.)))
                  + smoothstep(cS,0.,length(uv-vec2(1.,0.)))
                  + smoothstep(cS,0.,length(uv-vec2(0.,1.)))
                  + smoothstep(cS,0.,length(uv-vec2(1.,1.)));
    float shimmer = pow(sin((uv.x-uv.y)*9.+uTime*0.45)*0.5+0.5,8.)*0.03;
    vec3 gold=vec3(0.84,0.64,0.24), pearl=vec3(0.97,0.93,0.86);
    vec3 color = base;
    color += border  * gold  * 0.55;
    color += corners * gold  * 0.38;
    color += shimmer * pearl;
    float v = 1.-length((uv-.5)*1.4);
    color  *= 0.5 + v*0.5;
    gl_FragColor = vec4(color, (0.80+border*0.18)*uFade);
  }
`

// ── Sphere background ─────────────────────────────────────────────────────────
function CinematicSphere() {
  const u = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame(({ clock }) => { u.uTime.value = clock.getElapsedTime() })
  return (
    <mesh>
      <sphereGeometry args={[18, 80, 48]} />
      <shaderMaterial
        side={THREE.BackSide}
        vertexShader={SPHERE_VERT}
        fragmentShader={SPHERE_FRAG}
        uniforms={u}
      />
    </mesh>
  )
}

// ── Seeded random — must call rand() in the same order as ProductScene ─────────
function seededRand(seed: number) {
  let s = seed
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 | 0
    return (s >>> 0) / 0xffffffff
  }
}

interface FinalLayout {
  pos:   [number, number, number]
  scale: number
  quat:  THREE.Quaternion
}

// Matches ProductScene's layout exactly for the first N products.
// The full loop runs for all `count` products to preserve the random sequence.
function computeFinalLayouts(): FinalLayout[] {
  const rand  = seededRand(7)
  const PHI   = Math.PI * (3 - Math.sqrt(5))
  const count = products.length
  const rWall  = count > 50 ? 16.0 : count > 20 ? 15.0 : 14.0
  const rShelf = count > 50 ? 11.0 : count > 20 ? 10.0 :  9.5
  const rFloat = count > 50 ?  7.0 : count > 20 ?  6.5 :  5.5

  const result: FinalLayout[] = []

  for (let i = 0; i < count; i++) {
    const jS       = 0.45
    const basePhi  = Math.acos(Math.max(-1, Math.min(1, 1 - 2*(i+0.5)/count)))
    const baseTh   = i * PHI

    const phi   = Math.max(0.18, Math.min(Math.PI-0.18, basePhi + (rand()-0.5)*jS))
    const theta = baseTh + (rand()-0.5)*jS*2

    const layer = rand()
    const r = layer < 0.60 ? rWall  + rand()*1.5
             : layer < 0.85 ? rShelf + rand()*1.2
             :                rFloat + rand()*1.0

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.cos(phi)
    const z = r * Math.sin(phi) * Math.sin(theta)

    const distFactor = r / 9.0
    const sc   = (Math.max(0.55, 1.20 - count*0.004) + rand()*0.35) * distFactor
    const tiltX = (rand()-0.5)*0.24
    const tiltZ = (rand()-0.5)*0.18

    if (i < N) {
      const dummy = new THREE.Object3D()
      dummy.position.set(x, y, z)
      dummy.lookAt(0, 0, 0)
      dummy.rotateY(Math.PI)
      dummy.rotateX(tiltX)
      dummy.rotateZ(tiltZ)
      result.push({ pos: [x, y, z], scale: sc, quat: dummy.quaternion.clone() })
    }
  }
  return result
}

// ── Main component ─────────────────────────────────────────────────────────────
export function CinematicScene() {
  const { camera } = useThree()
  const showOverlay = useStore((s) => s.showOverlay)
  const hideOverlay = useStore((s) => s.hideOverlay)
  const setScene    = useStore((s) => s.setScene)

  // Per-card refs
  const groupRefs = useRef<(THREE.Group    | null)[]>(Array(N).fill(null))
  const matRefs   = useRef<(THREE.ShaderMaterial | null)[]>(Array(N).fill(null))

  // Animation state
  const phaseRef    = useRef(0)   // 1=approach 2=fanOut 3=rotating 4=converge 5=flyOut
  const ringAngle   = useRef(0)
  const timeoutIds  = useRef<ReturnType<typeof setTimeout>[]>([])

  // Final positions (matches ProductScene layout for first N cards)
  const finalLayouts = useMemo(computeFinalLayouts, [])

  // Per-card uniforms (one object per card, stable across renders)
  const cardUniforms = useMemo(() =>
    Array.from({ length: N }, () => ({
      uTime: { value: 0 },
      uFade: { value: 0 },
    }))
  , [])

  useEffect(() => {
    // Place camera and reset
    camera.position.set(0, 0, 5)
    camera.lookAt(0, 0, 0)
    phaseRef.current = 1
    ringAngle.current = 0

    const later = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms)
      timeoutIds.current.push(id)
    }

    // ── Phase 1 (0 → 1.5 s): Card 0 zooms from deep background ───────────────
    const g0 = groupRefs.current[0]
    const m0 = matRefs.current[0]
    if (!g0 || !m0) return

    gsap.to(g0.position, { z: 1.2, duration: 1.5, ease: 'power2.out' })
    gsap.to(g0.scale,    { x: 1.5, y: 1.5, z: 1.5, duration: 1.5, ease: 'power2.out' })
    gsap.to(m0.uniforms.uFade, { value: 1.0, duration: 0.8 })

    // ── Phase 2a (1.5 → 2.0 s): Fan all cards to carousel ring ───────────────
    later(() => {
      phaseRef.current = 2
      for (let i = 0; i < N; i++) {
        const g = groupRefs.current[i]
        const m = matRefs.current[i]
        if (!g || !m) continue
        const angle = (i / N) * Math.PI * 2
        gsap.to(g.position, {
          x: RING_R * Math.cos(angle),
          y: 0,
          z: RING_R * Math.sin(angle),
          duration: 0.5, ease: 'power2.out',
        })
        gsap.to(g.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.5 })
        if (i > 0) gsap.to(m.uniforms.uFade, { value: 0.85, duration: 0.4 })
      }

      // ── Phase 2b (2.0 → 3.6 s): Ring rotates — handled by useFrame ──────────
      later(() => {
        phaseRef.current = 3  // useFrame takes over position updates

        // ── Phase 3 (3.6 → 4.2 s): All cards converge to center ──────────────
        later(() => {
          phaseRef.current = 4  // stop ring rotation
          for (let i = 0; i < N; i++) {
            const g = groupRefs.current[i]
            if (!g) continue
            gsap.killTweensOf(g.position)
            gsap.to(g.position, { x: 0, y: 0, z: 0.2, duration: 0.6, ease: 'power3.in' })
            gsap.to(g.scale,    { x: 0.08, y: 0.08, z: 0.08, duration: 0.6, ease: 'power3.in' })
          }

          // ── Phase 4 (4.2 → 5.4 s): Cards launch to sphere wall positions ──
          later(() => {
            phaseRef.current = 5
            for (let i = 0; i < N; i++) {
              const g = groupRefs.current[i]
              const m = matRefs.current[i]
              const fl = finalLayouts[i]
              if (!g || !m || !fl) continue
              const delay = i * 0.04   // slight stagger for cascade effect
              gsap.to(g.position, {
                x: fl.pos[0], y: fl.pos[1], z: fl.pos[2],
                duration: 1.0, ease: 'power3.in', delay,
              })
              gsap.to(g.scale, {
                x: fl.scale, y: fl.scale, z: fl.scale,
                duration: 1.0, delay,
              })
              gsap.to(g.quaternion, {
                x: fl.quat.x, y: fl.quat.y, z: fl.quat.z, w: fl.quat.w,
                duration: 0.9, delay,
              })
              gsap.to(m.uniforms.uFade, { value: 0.82, duration: 0.8, delay })
            }
            // Camera rushes inward — arrives just as scene switches
            gsap.to(camera.position, { z: 0.5, duration: 1.2, ease: 'power2.inOut' })

            // ── Transition to ProductScene ─────────────────────────────────
            later(() => {
              showOverlay()
              later(() => {
                setScene('products')
                later(() => { hideOverlay() }, 350)
              }, 300)
            }, 1200)
          }, 600)
        }, 1600)
      }, 500)
    }, 1500)

    return () => {
      timeoutIds.current.forEach(clearTimeout)
      timeoutIds.current = []
      gsap.killTweensOf(camera.position)
      groupRefs.current.forEach((g) => {
        if (g) { gsap.killTweensOf(g.position); gsap.killTweensOf(g.scale); gsap.killTweensOf(g.quaternion) }
      })
      matRefs.current.forEach((m) => { if (m) gsap.killTweensOf(m.uniforms.uFade) })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-frame updates ────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    // Ring carousel rotation during phase 3
    if (phaseRef.current === 3) {
      ringAngle.current += delta * RING_SPEED
      for (let i = 0; i < N; i++) {
        const g = groupRefs.current[i]
        if (!g) continue
        const a = ringAngle.current + (i / N) * Math.PI * 2
        g.position.x = RING_R * Math.cos(a)
        g.position.y = Math.sin(a * 1.8) * 0.25   // gentle vertical bob
        g.position.z = RING_R * Math.sin(a)
      }
    }
    // Animate uTime for shimmer in every card
    for (let i = 0; i < N; i++) {
      cardUniforms[i].uTime.value += delta
    }
  })

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <CinematicSphere />

      <ambientLight intensity={0.22} color="#2a1808" />
      <pointLight position={[0,  6,  0]} intensity={2.4} color="#f5d78a" decay={2} />
      <pointLight position={[3, -2,  4]} intensity={0.9} color="#e8a880" decay={2} />
      <pointLight position={[-4, 2, -2]} intensity={0.7} color="#d4a060" decay={2} />

      {Array.from({ length: N }, (_, i) => (
        <group
          key={i}
          ref={(el) => { groupRefs.current[i] = el }}
          position={[0, 0, -40]}
          scale={[0.01, 0.01, 0.01]}
        >
          <mesh>
            <planeGeometry args={[1.6, 1.0, 1, 1]} />
            <shaderMaterial
              ref={(el) => { matRefs.current[i] = el as THREE.ShaderMaterial | null }}
              vertexShader={CARD_VERT}
              fragmentShader={CARD_FRAG}
              uniforms={cardUniforms[i]}
              transparent
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      <Effects bloomIntensity={2.2} bloomThreshold={0.08} chromaticAberration />
    </>
  )
}
