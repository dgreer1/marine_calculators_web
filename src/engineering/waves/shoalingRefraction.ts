import { requireFiniteNonNegative, requireFinitePositive } from '../numeric'
import { refractionCoefficient, shoalingCoefficient } from './linearWave'

export interface ShoalingRefractionInput {
  deepWaterWaveHeight: number
  wavePeriod: number
  waterDepth: number
  deepWaterDirection: number
}

export interface ShoalingRefractionResult {
  shoalingCoefficient: number
  refractionCoefficient: number
  shallowWaterWaveHeight: number
}

export function validateShoalingRefractionInput(input: ShoalingRefractionInput): void {
  requireFiniteNonNegative(input.deepWaterWaveHeight, 'Deep-water wave height')
  requireFinitePositive(input.wavePeriod, 'Wave period')
  requireFinitePositive(input.waterDepth, 'Water depth')
  if (!Number.isFinite(input.deepWaterDirection) || input.deepWaterDirection < 0 || input.deepWaterDirection > 90) {
    throw new RangeError('Wave direction must be between 0 and 90 degrees')
  }
}

export function calculateShoalingRefraction(input: ShoalingRefractionInput): ShoalingRefractionResult {
  validateShoalingRefractionInput(input)
  const shoaling = shoalingCoefficient(input.wavePeriod, input.waterDepth)
  const refraction = refractionCoefficient(input.wavePeriod, input.deepWaterDirection, input.waterDepth)
  return {
    shoalingCoefficient: shoaling,
    refractionCoefficient: refraction,
    shallowWaterWaveHeight: input.deepWaterWaveHeight * shoaling * refraction,
  }
}
