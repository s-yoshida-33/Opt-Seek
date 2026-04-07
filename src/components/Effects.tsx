import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'

interface EffectsProps {
  bloomIntensity?: number
  bloomThreshold?: number
  chromaticAberration?: boolean
}

export function Effects({
  bloomIntensity = 1.5,
  bloomThreshold = 0.2,
  chromaticAberration = true,
}: EffectsProps) {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.9}
        intensity={bloomIntensity}
        blendFunction={BlendFunction.SCREEN}
      />
      <Vignette
        offset={0.3}
        darkness={0.6}
        blendFunction={BlendFunction.NORMAL}
      />
      {chromaticAberration && (
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new Vector2(0.0008, 0.0008)}
        />
      )}
    </EffectComposer>
  )
}
