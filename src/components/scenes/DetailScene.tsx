import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Text } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { useStore } from '../../store/useStore'
import { Effects } from '../Effects'

const BG_VERT = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  varying float vNoise;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    float a = hash(i); float b = hash(i + vec2(1,0));
    float c = hash(i + vec2(0,1)); float d = hash(i + vec2(1,1));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0; float amp = 0.5;
    for(int i=0;i<5;i++){v+=amp*noise(p);amp*=0.5;p*=2.1;}
    return v;
  }

  void main() {
    vUv = uv;
    float n = fbm(uv * 3.0 + uTime * 0.1);
    vNoise = n;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const BG_FRAG = /* glsl */`
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uAccent;
  varying vec2 vUv;
  varying float vNoise;

  void main() {
    float t = uTime * 0.08;
    float n = vNoise;

    vec3 col = mix(uColor * 0.5, uColor, n);
    col = mix(col, uAccent * 0.4, pow(n, 3.0));

    // Radial glow from center
    float dist = length(vUv - 0.5) * 1.8;
    float glow = exp(-dist * dist * 2.0);
    col += uAccent * glow * 0.3;

    // Flowing lines
    float line = abs(sin((n * 6.0 + t) * 3.14159));
    line = pow(line, 10.0) * 0.2;
    col += uAccent * line;

    // Edge vignette
    float vign = smoothstep(1.0, 0.3, dist);
    col *= vign;

    gl_FragColor = vec4(col, 1.0);
  }
`

function DetailBackground({ color, accentColor }: { color: string; accentColor: string }) {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
    uAccent: { value: new THREE.Color(accentColor) },
  }), [color, accentColor])

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.elapsedTime
    }
  })

  return (
    <mesh position={[0, 0, -2]}>
      <planeGeometry args={[30, 20, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={BG_VERT}
        fragmentShader={BG_FRAG}
        uniforms={uniforms}
      />
    </mesh>
  )
}

function DetailCard({ color, accentColor }: { color: string; accentColor: string }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.05
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 0, -0.5]}>
      <planeGeometry args={[5, 3, 1, 1]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function FloatingOrbs({ accentColor }: { accentColor: string }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.1
      groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.07) * 0.1
    }
  })

  const orbs = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2
      const r = 2.5 + Math.sin(i * 1.7) * 0.5
      return {
        pos: [r * Math.cos(angle), r * Math.sin(angle) * 0.4, (Math.random() - 0.5) * 2] as [number, number, number],
        scale: 0.04 + Math.random() * 0.06,
      }
    })
  }, [])

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.pos}>
          <sphereGeometry args={[orb.scale, 8, 8]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  )
}

export function DetailScene() {
  const selectedProduct = useStore((s) => s.selectedProduct)
  const goBack = useStore((s) => s.goBack)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!overlayRef.current) return
    const el = overlayRef.current
    el.style.opacity = '0'
    el.style.transform = 'translateY(30px)'
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: 'power3.out',
      delay: 0.3,
    })
  }, [selectedProduct])

  if (!selectedProduct) return null

  return (
    <>
      <DetailBackground color={selectedProduct.color} accentColor={selectedProduct.accentColor} />
      <DetailCard color={selectedProduct.color} accentColor={selectedProduct.accentColor} />
      <FloatingOrbs accentColor={selectedProduct.accentColor} />

      <Effects bloomIntensity={2.5} bloomThreshold={0.1} chromaticAberration />

      <Html fullscreen>
        <div className="w-full h-full flex flex-col items-center justify-center relative">
          {/* Animated content */}
          <div
            ref={overlayRef}
            style={{ textAlign: 'center', maxWidth: '600px', padding: '0 24px' }}
          >
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '11px',
              letterSpacing: '0.5em',
              color: selectedProduct.accentColor,
              opacity: 0.8,
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}>
              {selectedProduct.category}
            </p>

            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(32px, 6vw, 64px)',
              fontWeight: 300,
              letterSpacing: '0.1em',
              color: 'rgba(245,232,210,0.95)',
              lineHeight: 1.1,
              marginBottom: '8px',
            }}>
              {selectedProduct.name}
            </h1>

            <p style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(14px, 2vw, 18px)',
              fontStyle: 'italic',
              color: 'rgba(210,185,140,0.6)',
              letterSpacing: '0.08em',
              marginBottom: '28px',
            }}>
              {selectedProduct.nameEn}
            </p>

            <div style={{
              width: '40px',
              height: '1px',
              background: selectedProduct.accentColor,
              margin: '0 auto 28px',
              opacity: 0.6,
            }} />

            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 'clamp(13px, 1.6vw, 15px)',
              fontWeight: 300,
              color: 'rgba(220,200,170,0.72)',
              lineHeight: 1.8,
              letterSpacing: '0.02em',
              marginBottom: '32px',
            }}>
              {selectedProduct.description}
            </p>

            <p style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(22px, 3.5vw, 36px)',
              fontWeight: 300,
              color: selectedProduct.accentColor,
              letterSpacing: '0.1em',
            }}>
              {selectedProduct.price}
            </p>
          </div>

          {/* Back button */}
          <button
            onClick={goBack}
            style={{
              position: 'absolute',
              top: '32px',
              left: '32px',
              background: 'transparent',
              border: `1px solid ${selectedProduct.accentColor}44`,
              color: `${selectedProduct.accentColor}`,
              padding: '10px 24px',
              fontSize: '11px',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              opacity: 0.8,
            }}
          >
            ← Back
          </button>

          {/* Product ID */}
          <div style={{
            position: 'absolute',
            bottom: '32px',
            right: '32px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '10px',
            letterSpacing: '0.4em',
            color: 'rgba(180,150,100,0.3)',
          }}>
            No.{selectedProduct.id}
          </div>
        </div>
      </Html>
    </>
  )
}
