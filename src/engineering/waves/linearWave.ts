import { GRAVITY, SEAWATER_DENSITY } from '../constants'
import { linspace, requireFiniteNonNegative, requireFinitePositive } from '../numeric'

export interface LinearWaveInput {
  waveHeight: number
  wavePeriod: number
  waterDepth: number
}

export type RelativeDepth = 'Deep water' | 'Transitional' | 'Shallow water' | 'Deep-water breaking' | 'Breaking'

export interface LinearWaveResult {
  wavelength: number
  celerity: number
  groupCelerity: number
  shoalingCoefficient: number
  offshoreWaveHeight: number
  energyDensity: number
  energyFlux: number
  maximumBedOrbitalVelocity: number
  relativeDepth: RelativeDepth
}

export function validateLinearWaveInput(input: LinearWaveInput): void {
  requireFiniteNonNegative(input.waveHeight, 'Wave height')
  requireFinitePositive(input.wavePeriod, 'Wave period')
  requireFinitePositive(input.waterDepth, 'Water depth')
}

export function deepWaterWavelength(wavePeriod: number): number {
  requireFinitePositive(wavePeriod, 'Wave period')
  return (GRAVITY * wavePeriod ** 2) / (2 * Math.PI)
}

/** Fenton & McKee (1990) explicit wavelength approximation used by the R source. */
export function wavelength(wavePeriod: number, waterDepth: number): number {
  requireFinitePositive(wavePeriod, 'Wave period')
  requireFinitePositive(waterDepth, 'Water depth')
  const deep = deepWaterWavelength(wavePeriod)
  const term = (2 * Math.PI * (Math.sqrt(waterDepth / GRAVITY) / wavePeriod)) ** 1.5
  return deep * Math.tanh(term) ** (2 / 3)
}

export function celerity(wavePeriod: number, waterDepth: number): number {
  const waveLength = wavelength(wavePeriod, waterDepth)
  const waveNumber = (2 * Math.PI) / waveLength
  return Math.sqrt((GRAVITY / waveNumber) * Math.tanh(waveNumber * waterDepth))
}

export function groupCelerity(wavePeriod: number, waterDepth: number): number {
  const waveLength = wavelength(wavePeriod, waterDepth)
  const waveNumber = (2 * Math.PI) / waveLength
  const ratio = (2 * waveNumber * waterDepth) / Math.sinh(2 * waveNumber * waterDepth)
  return 0.5 * (1 + ratio) * celerity(wavePeriod, waterDepth)
}

export function shoalingCoefficient(wavePeriod: number, waterDepth: number): number {
  return Math.sqrt((0.5 * 1.56 * wavePeriod) / groupCelerity(wavePeriod, waterDepth))
}

export function refractionCoefficient(wavePeriod: number, deepWaterDirection: number, waterDepth: number): number {
  requireFinitePositive(wavePeriod, 'Wave period')
  requireFinitePositive(waterDepth, 'Water depth')
  if (!Number.isFinite(deepWaterDirection) || deepWaterDirection < 0 || deepWaterDirection > 90) {
    throw new RangeError('Wave direction must be between 0 and 90 degrees')
  }
  const deepWaterCelerity = 1.56 * wavePeriod
  const shallowWaterCelerity = wavelength(wavePeriod, waterDepth) / wavePeriod
  const sinTheta0 = Math.sin((deepWaterDirection * Math.PI) / 180)
  const sinTheta1 = (shallowWaterCelerity * sinTheta0) / deepWaterCelerity
  return ((1 - sinTheta0 ** 2) / (1 - sinTheta1 ** 2)) ** 0.25
}

export function energyDensity(waveHeight: number): number {
  requireFiniteNonNegative(waveHeight, 'Wave height')
  return (SEAWATER_DENSITY * GRAVITY * waveHeight ** 2) / 8
}

export function energyFlux(wavePeriod: number, waveHeight: number, waterDepth: number): number {
  return energyDensity(waveHeight) * groupCelerity(wavePeriod, waterDepth)
}

export function maximumOrbitalVelocity(
  wavePeriod: number,
  waveHeight: number,
  waterDepth: number,
  heightAboveBed: number,
): number {
  requireFiniteNonNegative(waveHeight, 'Wave height')
  requireFiniteNonNegative(heightAboveBed, 'Height above bed')
  if (heightAboveBed > waterDepth) throw new RangeError('Height above bed cannot exceed water depth')
  const waveNumber = (2 * Math.PI) / wavelength(wavePeriod, waterDepth)
  return ((Math.PI * waveHeight) / wavePeriod)
    * (Math.cosh(waveNumber * heightAboveBed) / Math.sinh(waveNumber * waterDepth))
}

export function maximumBedOrbitalVelocity(wavePeriod: number, waveHeight: number, waterDepth: number): number {
  if (waveHeight === 0) return 0
  const waveNumber = (2 * Math.PI) / wavelength(wavePeriod, waterDepth)
  return (waveHeight * Math.PI) / (wavePeriod * Math.sinh(waveNumber * waterDepth))
}

export function maximumOrbitalExcursion(
  wavePeriod: number,
  waveHeight: number,
  waterDepth: number,
  heightAboveBed: number,
): number {
  requireFiniteNonNegative(waveHeight, 'Wave height')
  requireFiniteNonNegative(heightAboveBed, 'Height above bed')
  if (heightAboveBed > waterDepth) throw new RangeError('Height above bed cannot exceed water depth')
  const waveNumber = (2 * Math.PI) / wavelength(wavePeriod, waterDepth)
  return waveHeight
    * (Math.cosh(waveNumber * heightAboveBed) / Math.sinh(waveNumber * waterDepth))
}

export function classifyRelativeDepth(input: LinearWaveInput): RelativeDepth {
  validateLinearWaveInput(input)
  const waveLength = wavelength(input.wavePeriod, input.waterDepth)
  let classification: RelativeDepth = input.waterDepth > 0.5 * waveLength
    ? 'Deep water'
    : input.waterDepth >= 0.05 * waveLength ? 'Transitional' : 'Shallow water'

  if (input.waveHeight / waveLength > 0.17) classification = 'Deep-water breaking'
  if (input.waveHeight / input.waterDepth > 0.78) classification = 'Breaking'
  return classification
}

export function calculateLinearWave(input: LinearWaveInput): LinearWaveResult {
  validateLinearWaveInput(input)
  const waveLength = wavelength(input.wavePeriod, input.waterDepth)
  const group = groupCelerity(input.wavePeriod, input.waterDepth)
  const shoaling = shoalingCoefficient(input.wavePeriod, input.waterDepth)
  const density = energyDensity(input.waveHeight)
  return {
    wavelength: waveLength,
    celerity: celerity(input.wavePeriod, input.waterDepth),
    groupCelerity: group,
    shoalingCoefficient: shoaling,
    offshoreWaveHeight: input.waveHeight / shoaling,
    energyDensity: density,
    energyFlux: density * group,
    maximumBedOrbitalVelocity: maximumBedOrbitalVelocity(input.wavePeriod, input.waveHeight, input.waterDepth),
    relativeDepth: classifyRelativeDepth(input),
  }
}

export function orbitalProfile(input: LinearWaveInput, count = 100) {
  validateLinearWaveInput(input)
  return linspace(input.waterDepth * 0.001, input.waterDepth, count).map((heightAboveBed) => ({
    heightAboveBed,
    velocity: maximumOrbitalVelocity(input.wavePeriod, input.waveHeight, input.waterDepth, heightAboveBed),
    excursion: maximumOrbitalExcursion(input.wavePeriod, input.waveHeight, input.waterDepth, heightAboveBed),
  }))
}
