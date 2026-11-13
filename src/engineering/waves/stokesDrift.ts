import { GRAVITY } from '../constants'
import { linspace, requireFiniteNonNegative, requireFinitePositive } from '../numeric'
import { wavelength } from './linearWave'

export interface StokesDriftInput {
  waveHeight: number
  wavePeriod: number
  waterDepth: number
}

export function validateStokesDriftInput(input: StokesDriftInput): void {
  requireFiniteNonNegative(input.waveHeight, 'Wave height')
  requireFinitePositive(input.wavePeriod, 'Wave period')
  requireFinitePositive(input.waterDepth, 'Water depth')
}

export function surfaceStokesDrift(waveHeight: number, wavePeriod: number): number {
  requireFiniteNonNegative(waveHeight, 'Wave height')
  requireFinitePositive(wavePeriod, 'Wave period')
  return (2 * waveHeight ** 2 * Math.PI ** 3) / (GRAVITY * wavePeriod ** 3)
}

export function depthAveragedStokesDrift(input: StokesDriftInput): number {
  validateStokesDriftInput(input)
  const waveNumber = (2 * Math.PI) / wavelength(input.wavePeriod, input.waterDepth)
  const surface = surfaceStokesDrift(input.waveHeight, input.wavePeriod)
  return surface * (1 - Math.exp(-2 * waveNumber * input.waterDepth))
    / (2 * waveNumber * input.waterDepth)
}

export function calculateStokesDrift(input: StokesDriftInput) {
  validateStokesDriftInput(input)
  return {
    surface: surfaceStokesDrift(input.waveHeight, input.wavePeriod),
    depthAverage: depthAveragedStokesDrift(input),
  }
}

export function stokesDriftProfile(input: StokesDriftInput, count = 100) {
  validateStokesDriftInput(input)
  const waveNumber = (2 * Math.PI) / wavelength(input.wavePeriod, input.waterDepth)
  const surface = surfaceStokesDrift(input.waveHeight, input.wavePeriod)
  return linspace(0, input.waterDepth, count).map((heightAboveBed) => {
    const depthBelowSurface = input.waterDepth - heightAboveBed
    return { heightAboveBed, velocity: surface * Math.exp(-2 * waveNumber * depthBelowSurface) }
  })
}
