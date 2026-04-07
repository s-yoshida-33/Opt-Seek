import { useRef, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { products, type Product } from '../../data/products'
import { Effects } from '../Effects'

const CARD_VERT = /* glsl */`
  uniform float uTime;
  uniform float uHover;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.z += sin(uTime * 1.5 + pos.x * 2.0) * 0.02 * (1.0 - uHover);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const CARD_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uHover;
  uniform vec3 uColor;
  uniform vec3 uAccent;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Border glow
    float border = 0.0;
    float bw = 0.03;
    border = max(border, smoothstep(bw, 0.0, uv.x));
    border = max(border, smoothstep(1.0 - bw, 1.0, uv.x));
    border = max(border, smoothstep(bw, 0.0, uv.y));
    border = max(border, smoothstep(1.0 - bw, 1.0, uv.y));

    // Animated scan line
    float scanY = mod(uTime * 0.3, 1.2) - 0.1;
    float scan = exp(-abs(uv.y - scanY) * 20.0) * 0.3;

    // Corner accent
    float corner = smoothstep(0.15, 0.0, length(uv - vec2(0.0, 1.0)));
    corner += smoothstep(0.15, 0.0, length(uv - vec2(1.0, 1.0)));

    vec3 base = uColor;
    vec3 color = base;
    color += border * uAccent * (1.0 + uHover * 2.0);
    color += scan * uAccent;
    color += corner * uAccent * 0.5;

    float alpha = 0.85 + border * 0.15 + uHover * 0.1;
    gl_FragColor = vec4(color, alpha);
  }
`

interface ProductCardProps {
  product: Product
  position: [number, number, number]
  index: number
}

function ProductCard({ product, position, index }: ProductCardProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const [hovered, setHovered] = useState(false)
  const goToDetail = useStore((s) => s.goToDetail)
  const targetScale = useRef(1.0)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uHover: { value: 0 },
    uColor: { value: new THREE.Color(product.color) },
    uAccent: { value: new THREE.Color(product.accentColor) },
  }), [product.color, product.accentColor])

  useFrame(({ clock }) => {
    if (!matRef.current || !meshRef.current) return
    matRef.current.uniforms.uTime.value = clock.elapsedTime + index * 0.5

    const targetH = hovered ? 1.0 : 0.0
    matRef.current.uniforms.uHover.value += (targetH - matRef.current.uniforms.uHover.value) * 0.1

    targetScale.current = hovered ? 1.08 : 1.0
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale.current, targetScale.current, targetScale.current), 0.1)

    // Gentle floating
    meshRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.6 + index) * 0.08
  })

  const accentColor = product.accentColor

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={() => goToDetail(product)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
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
      {/* Product text overlay */}
      <Text
        position={[0, 0.22, 0.01]}
        fontSize={0.09}
        color={accentColor}
        anchorX="center"
        anchorY="middle"
        font={undefined}
        maxWidth={1.4}
        overflowWrap="break-word"
      >
        {product.nameEn.toUpperCase()}
      </Text>
      <Text
        position={[0, 0.05, 0.01]}
        fontSize={0.14}
        color="white"
        anchorX="center"
        anchorY="middle"
        font={undefined}
        maxWidth={1.4}
        overflowWrap="break-word"
      >
        {product.name}
      </Text>
      <Text
        position={[0, -0.13, 0.01]}
        fontSize={0.07}
        color="rgba(180,220,255,0.7)"
        anchorX="center"
        anchorY="middle"
        font={undefined}
        maxWidth={1.4}
        overflowWrap="break-word"
      >
        {product.category}
      </Text>
      <Text
        position={[0, -0.32, 0.01]}
        fontSize={0.1}
        color={accentColor}
        anchorX="center"
        anchorY="middle"
        font={undefined}
        maxWidth={1.4}
        overflowWrap="break-word"
      >
        {product.price}
      </Text>
    </group>
  )
}

function StarField() {
  const COUNT = 800
  const geoRef = useRef<THREE.BufferGeometry>(null)

  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10
    }
    return pos
  }, [])

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#8ab4d4" transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

function ProductCards() {
  const cardPositions: [number, number, number][] = useMemo(() => {
    // Arrange in a sphere/orbital layout
    return products.map((_, i) => {
      const total = products.length
      const phi = Math.acos(-1 + (2 * i) / total)
      const theta = Math.sqrt(total * Math.PI) * phi
      const r = 3.5
      return [
        r * Math.cos(theta) * Math.sin(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(phi),
      ]
    })
  }, [])

  return (
    <>
      {products.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          position={cardPositions[i]}
          index={i}
        />
      ))}
    </>
  )
}

export function ProductScene() {
  const goBack = useStore((s) => s.goBack)
  const { camera } = useThree()

  // Reset camera position
  useMemo(() => {
    camera.position.set(0, 0, 6)
    camera.lookAt(0, 0, 0)
  }, [camera])

  return (
    <>
      <ambientLight intensity={0.3} color="#001133" />
      <pointLight position={[5, 5, 5]} intensity={1.5} color="#0055ff" />
      <pointLight position={[-5, -5, 3]} intensity={1.0} color="#004499" />

      <StarField />
      <ProductCards />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={3}
        maxDistance={10}
        autoRotate
        autoRotateSpeed={0.3}
        makeDefault
      />

      <Effects bloomIntensity={1.5} bloomThreshold={0.15} />

      <Html fullscreen>
        <div className="w-full h-full pointer-events-none">
          {/* Header */}
          <div className="absolute top-8 left-0 right-0 flex flex-col items-center pointer-events-none">
            <p style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(10px, 1.2vw, 12px)',
              letterSpacing: '0.5em',
              color: 'rgba(120,180,255,0.5)',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              Trunk Hotel
            </p>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(22px, 3vw, 32px)',
              fontWeight: 300,
              letterSpacing: '0.2em',
              color: 'rgba(220,235,255,0.9)',
            }}>
              Wedding Collection
            </h1>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none">
            <p style={{
              fontSize: '11px',
              letterSpacing: '0.3em',
              color: 'rgba(100,160,220,0.5)',
              textTransform: 'uppercase',
            }}>
              Drag to explore · Touch to select
            </p>
          </div>

          {/* Back button */}
          <button
            onClick={goBack}
            className="pointer-events-auto absolute top-8 left-8"
            style={{
              background: 'transparent',
              border: '1px solid rgba(100,160,255,0.3)',
              color: 'rgba(150,200,255,0.7)',
              padding: '8px 20px',
              fontSize: '11px',
              letterSpacing: '0.3em',
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
