import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { Effects } from '../Effects'

// ─── Shared simplex noise GLSL ───────────────────────────────────────────────
const SIMPLEX_GLSL = /* glsl */`
  vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute4(vec4 x){return mod289v4(((x*34.)+1.)*x);}
  vec4 taylorInvSqrt4(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);
    const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod289v3(i);
    vec4 p=permute4(permute4(permute4(
      i.z+vec4(0.,i1.z,i2.z,1.))
      +i.y+vec4(0.,i1.y,i2.y,1.))
      +i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.*x_);
    vec4 x=x_*ns.x+ns.yyyy;
    vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);
    vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.+1.;
    vec4 s1=floor(b1)*2.+1.;
    vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt4(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
    m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
`

// ─── Wedding fluid background shader ─────────────────────────────────────────
const BG_VERT = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  ${SIMPLEX_GLSL}
  void main(){
    vUv = uv;
    vec3 pos = position;
    float n = snoise(vec3(pos.xy * 0.6, uTime * 0.08))  * 0.5
            + snoise(vec3(pos.xy * 1.4, uTime * 0.13))  * 0.2;
    pos.z += n;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const BG_FRAG = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  ${SIMPLEX_GLSL}

  void main(){
    vec2 uv = vUv;
    float t = uTime * 0.07;

    // Layered FBM — warm organic motion
    float n1 = snoise(vec3(uv * 1.8,           t));
    float n2 = snoise(vec3(uv * 3.6 + n1*0.4,  t * 1.2));
    float n3 = snoise(vec3(uv * 7.2 + n2*0.2,  t * 0.6));
    float n4 = snoise(vec3(uv * 14. + n3*0.1,  t * 1.7));

    float val = n1*0.5 + n2*0.25 + n3*0.15 + n4*0.1;
    val = val * 0.5 + 0.5;

    // Veil-like shimmer lines (horizontal, very fine)
    float lines = sin((uv.y * 28.0 + val * 0.6 + t * 0.5) * 3.14159) * 0.5 + 0.5;
    lines = pow(lines, 14.0) * 0.25;

    // Wedding color palette: warm black → deep amber → champagne → pearl
    vec3 c0 = vec3(0.050, 0.038, 0.025);   // warm near-black
    vec3 c1 = vec3(0.110, 0.072, 0.032);   // deep amber shadow
    vec3 c2 = vec3(0.280, 0.185, 0.065);   // aged gold
    vec3 c3 = vec3(0.620, 0.460, 0.195);   // champagne gold
    vec3 c4 = vec3(0.940, 0.880, 0.800);   // warm pearl white

    vec3 color;
    if(val < 0.25)      color = mix(c0, c1, val / 0.25);
    else if(val < 0.5)  color = mix(c1, c2, (val - 0.25) / 0.25);
    else if(val < 0.75) color = mix(c2, c3, (val - 0.5)  / 0.25);
    else                color = mix(c3, c4, (val - 0.75) / 0.25);

    // Rose-gold shimmer on lines
    color += vec3(lines * 0.9, lines * 0.55, lines * 0.35);

    // Soft vignette
    float d = length(uv - 0.5) * 1.8;
    color *= 1.0 - d * d * 0.7;

    gl_FragColor = vec4(color, 1.0);
  }
`

// ─── Background mesh ─────────────────────────────────────────────────────────
function WeddingBackground() {
  const { viewport } = useThree()
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame(({ clock }) => { uniforms.uTime.value = clock.getElapsedTime() })
  return (
    <mesh position={[0, 0, -2]}>
      <planeGeometry args={[viewport.width * 1.3, viewport.height * 1.3, 96, 96]} />
      <shaderMaterial vertexShader={BG_VERT} fragmentShader={BG_FRAG} uniforms={uniforms} />
    </mesh>
  )
}

// ─── Gossamer orbs — 3 depth layers ──────────────────────────────────────────
const ORB_VERT = /* glsl */`
  attribute float aSize;
  attribute float aSpeed;
  attribute float aOffset;
  uniform float uTime;
  varying float vAlpha;
  ${SIMPLEX_GLSL}
  void main(){
    vec3 pos = position;
    // Each orb drifts slowly via noise
    float t = uTime * aSpeed + aOffset;
    pos.x += snoise(vec3(pos.yz * 0.3, t * 0.4)) * 0.4;
    pos.y += snoise(vec3(pos.xz * 0.3, t * 0.35 + 10.)) * 0.4;
    pos.y += t * 0.04; // slow upward drift

    // wrap vertically
    float range = 14.0;
    pos.y = mod(pos.y + range * 0.5, range) - range * 0.5;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;

    // fade with depth
    vAlpha = smoothstep(-14.0, 0.0, pos.z) * 0.9 + 0.1;
  }
`

const ORB_FRAG = /* glsl */`
  uniform float uTime;
  varying float vAlpha;
  void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if(d > 0.5) discard;
    // soft glowing orb
    float core  = smoothstep(0.5, 0.0, d);
    float glow  = smoothstep(0.5, 0.1, d) * 0.4;
    float alpha = (core + glow) * vAlpha;

    // warm gold → rose white
    vec3 warm   = vec3(1.0, 0.88, 0.62);   // champagne
    vec3 bright = vec3(1.0, 0.96, 0.90);   // pearl
    vec3 color  = mix(warm, bright, core);

    gl_FragColor = vec4(color, alpha);
  }
`

function GossamerOrbs({ count, zRange, sizeRange, speedScale }:
  { count: number; zRange: [number, number]; sizeRange: [number, number]; speedScale: number }) {
  const ref = useRef<THREE.Points>(null)

  const { positions, sizes, speeds, offsets } = useMemo(() => {
    const pos   = new Float32Array(count * 3)
    const sz    = new Float32Array(count)
    const sp    = new Float32Array(count)
    const off   = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 16
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14
      pos[i * 3 + 2] = zRange[0] + Math.random() * (zRange[1] - zRange[0])
      sz[i]  = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0])
      sp[i]  = (0.5 + Math.random() * 0.5) * speedScale
      off[i] = Math.random() * 100
    }
    return { positions: pos, sizes: sz, speeds: sp, offsets: off }
  }, [count, zRange, sizeRange, speedScale])

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame(({ clock }) => { uniforms.uTime.value = clock.getElapsedTime() })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize"    args={[sizes,     1]} />
        <bufferAttribute attach="attributes-aSpeed"   args={[speeds,    1]} />
        <bufferAttribute attach="attributes-aOffset"  args={[offsets,   1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={ORB_VERT}
        fragmentShader={ORB_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// ─── Gossamer thread lines connecting nearby orbs ─────────────────────────────
function GossamerThreads() {
  const COUNT = 120
  const ref   = useRef<THREE.LineSegments>(null)

  // fixed anchor points for thread nodes
  const anchors = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < COUNT; i++) {
      pts.push(new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 4 - 1,
      ))
    }
    return pts
  }, [])

  const { geometry, offsets } = useMemo(() => {
    const segs: number[] = []
    const DIST = 2.8
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        if (anchors[i].distanceTo(anchors[j]) < DIST) {
          segs.push(anchors[i].x, anchors[i].y, anchors[i].z)
          segs.push(anchors[j].x, anchors[j].y, anchors[j].z)
        }
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3))
    // random drift offset per vertex pair
    const off = new Float32Array(segs.length / 3)
    for (let i = 0; i < off.length; i++) off[i] = Math.random() * Math.PI * 2
    return { geometry: geo, offsets: off }
  }, [anchors])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const segLen = arr.length / 3

    for (let i = 0; i < segLen; i++) {
      const base = anchors[Math.floor(i / 2) % COUNT]
      const drift = Math.sin(t * 0.3 + offsets[i]) * 0.12
      arr[i * 3]     = base.x + drift
      arr[i * 3 + 1] = base.y + Math.sin(t * 0.2 + offsets[i] + 1) * 0.1
      arr[i * 3 + 2] = base.z
    }
    pos.needsUpdate = true
  })

  return (
    <lineSegments ref={ref} geometry={geometry}>
      <lineBasicMaterial
        color="#d4a955"
        transparent
        opacity={0.08}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  )
}

// ─── Main scene ───────────────────────────────────────────────────────────────
export function IdlingScene() {
  const goToProducts = useStore((s) => s.goToProducts)

  return (
    <>
      {/* Background fluid shader */}
      <WeddingBackground />

      {/* Gossamer thread web */}
      <GossamerThreads />

      {/* Orb layers: far → near */}
      <GossamerOrbs count={1800} zRange={[-14, -6]} sizeRange={[0.8, 2.5]}  speedScale={0.4} />
      <GossamerOrbs count={900}  zRange={[-6,  -2]} sizeRange={[1.5, 4.0]}  speedScale={0.6} />
      <GossamerOrbs count={300}  zRange={[-2,   1]} sizeRange={[3.0, 7.0]}  speedScale={0.9} />

      {/* Warm point light floating above */}
      <pointLight position={[0, 4, 2]}  intensity={1.2} color="#f5d78a" />
      <pointLight position={[3, -3, 1]} intensity={0.5} color="#d4a0a0" />
      <ambientLight intensity={0.15} color="#3a2810" />

      <Effects bloomIntensity={2.8} bloomThreshold={0.05} />

      {/* UI overlay */}
      <Html fullscreen>
        <div
          className="w-full h-full flex flex-col items-center justify-end cursor-pointer select-none"
          style={{ paddingBottom: '12%' }}
          onClick={goToProducts}
        >
          <div className="flex flex-col items-center gap-3" style={{ animation: 'breathe 4s ease-in-out infinite' }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(9px, 1.8vw, 11px)',
              letterSpacing: '0.55em',
              color: 'rgba(210,175,110,0.55)',
              textTransform: 'uppercase',
            }}>
              Trunk Hotel Wedding
            </p>
            <div style={{
              width: '32px',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(210,175,110,0.5), transparent)',
            }} />
            <p style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(16px, 3.5vw, 22px)',
              fontWeight: 300,
              letterSpacing: '0.35em',
              color: 'rgba(245,230,200,0.88)',
              textTransform: 'uppercase',
            }}>
              Touch to Explore
            </p>
          </div>
        </div>

        <style>{`
          @keyframes breathe {
            0%, 100% { opacity: 0.7; transform: translateY(0px); }
            50%       { opacity: 1.0; transform: translateY(-4px); }
          }
        `}</style>
      </Html>
    </>
  )
}
