import { useEffect, useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { useStore } from '../../store/useStore'
import { Effects } from '../Effects'

const PARTICLE_VERT = /* glsl */`
  attribute float aOffset;
  attribute vec3 aTarget;
  uniform float uProgress;
  uniform float uTime;
  varying float vLife;

  void main() {
    float eased = uProgress * uProgress * (3.0 - 2.0 * uProgress);
    vec3 pos = mix(position, aTarget, eased);
    // Add turbulence during transition
    float turb = sin(uTime * 8.0 + aOffset * 6.28) * 0.3 * (1.0 - eased);
    pos += vec3(turb, turb * 0.7, turb * 0.5);
    vLife = 0.5 + 0.5 * sin(uTime * 3.0 + aOffset * 6.28);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 120.0 * (1.0 / -mvPosition.z) * (0.5 + vLife * 0.5);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const PARTICLE_FRAG = /* glsl */`
  varying float vLife;
  uniform float uProgress;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.0, dist);
    alpha *= alpha;
    float core = smoothstep(0.15, 0.0, dist);
    vec3 color = mix(vec3(0.1, 0.4, 1.0), vec3(0.8, 0.95, 1.0), core);
    float fade = 1.0 - uProgress * 0.5;
    gl_FragColor = vec4(color, alpha * vLife * fade * 0.9);
  }
`

function TransitionParticles({ progress }: { progress: number }) {
  const COUNT = 3000
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const { positions, targets, offsets } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const tgt = new Float32Array(COUNT * 3)
    const off = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      // Start: sphere distribution
      const r = 3 + Math.random() * 4
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      // Target: explode outward
      const scale = 8 + Math.random() * 12
      tgt[i * 3] = pos[i * 3] * scale * (0.5 + Math.random())
      tgt[i * 3 + 1] = pos[i * 3 + 1] * scale * (0.5 + Math.random())
      tgt[i * 3 + 2] = pos[i * 3 + 2] * scale + Math.random() * 20
      off[i] = Math.random() * Math.PI * 2
    }
    return { positions: pos, targets: tgt, offsets: off }
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3))
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1))
    return geo
  }, [positions, targets, offsets])

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.elapsedTime
      matRef.current.uniforms.uProgress.value = progress
    }
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={PARTICLE_VERT}
        fragmentShader={PARTICLE_FRAG}
        uniforms={{
          uProgress: { value: progress },
          uTime: { value: 0 },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function CameraFlight({ onComplete }: { onComplete: () => void }) {
  const { camera } = useThree()
  const progressRef = useRef(0)
  const setTransitionProgress = useStore((s) => s.setTransitionProgress)
  const setScene = useStore((s) => s.setScene)
  const completedRef = useRef(false)

  useEffect(() => {
    if (completedRef.current) return
    camera.position.set(0, 0, 5)
    camera.lookAt(0, 0, 0)

    const tl = gsap.timeline()
    tl.to(progressRef, {
      current: 1,
      duration: 2.0,
      ease: 'power2.inOut',
      onUpdate: () => {
        setTransitionProgress(progressRef.current)
      },
      onComplete: () => {
        if (!completedRef.current) {
          completedRef.current = true
          setScene('products')
          onComplete()
        }
      },
    })
    tl.to(camera.position, {
      z: -5,
      duration: 2.0,
      ease: 'power3.in',
    }, 0)

    return () => { tl.kill() }
  }, [camera, setTransitionProgress, setScene, onComplete])

  return null
}

export function TransitionScene() {
  const transitionProgress = useStore((s) => s.transitionProgress)
  const setScene = useStore((s) => s.setScene)

  return (
    <>
      <ambientLight intensity={0.5} color="#002266" />
      <pointLight position={[0, 0, 2]} intensity={2} color="#0055ff" />
      <TransitionParticles progress={transitionProgress} />
      <CameraFlight onComplete={() => setScene('products')} />
      <Effects bloomIntensity={3.0} bloomThreshold={0.05} chromaticAberration />
    </>
  )
}
