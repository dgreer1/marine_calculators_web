import { GRAVITY } from '../constants'
import { requireFiniteNonNegative, requireFinitePositive } from '../numeric'

export interface HolthuijsenInput { windSpeed: number; fetch: number; waterDepth: number }
export interface CarterInput { windSpeed: number; extent: number }

export function validateHolthuijsen(input: HolthuijsenInput): void {
  requireFinitePositive(input.windSpeed, 'Wind speed')
  requireFiniteNonNegative(input.fetch, 'Fetch')
  requireFinitePositive(input.waterDepth, 'Water depth')
}

export function holthuijsen(input: HolthuijsenInput) {
  validateHolthuijsen(input)
  const fetchMetres = input.fetch * 1000
  const u2 = input.windSpeed ** 2
  const hDepth = Math.tanh(0.343 * (GRAVITY * input.waterDepth / u2) ** 1.14)
  const hFetch = 0.000414 * (GRAVITY * fetchMetres / u2) ** 0.79
  const tDepth = Math.tanh(0.1 * (GRAVITY * input.waterDepth / u2) ** 2.01)
  const tFetch = 0.000000277 * (GRAVITY * fetchMetres / u2) ** 1.45
  return {
    significantWaveHeight: 0.2433 * u2 / GRAVITY * (hDepth * Math.tanh(hFetch / hDepth)) ** 0.572,
    peakPeriod: 7.69 * input.windSpeed / GRAVITY * (tDepth * Math.tanh(tFetch / tDepth)) ** 0.187,
    developmentTime: 77.23 * fetchMetres ** 0.67 / (input.windSpeed ** 0.34 * GRAVITY ** 0.33) / 3600,
  }
}

function validateCarter(input: CarterInput, extentName: string): void {
  requireFiniteNonNegative(input.windSpeed, 'Wind speed')
  requireFiniteNonNegative(input.extent, extentName)
}

export function carterFetch(input: CarterInput) {
  validateCarter(input, 'Fetch')
  const u = input.windSpeed; const f = input.extent
  return {
    significantWaveHeight: Math.min(0.0163 * Math.sqrt(f) * u, 0.0248 * u ** 2),
    peakPeriod: Math.min(0.566 * f ** 0.3 * u ** 0.4, 0.728 * u),
    meanPeriod: Math.min(0.439 * f ** 0.3 * u ** 0.4, 0.566 * u),
  }
}

export function carterDuration(input: CarterInput) {
  validateCarter(input, 'Duration')
  const u = input.windSpeed; const d = input.extent
  return {
    significantWaveHeight: Math.min(0.0146 * u ** (9 / 7) * d ** (5 / 7), 0.0240 * u ** 2),
    peakPeriod: Math.min(0.540 * u ** (4 / 7) * d ** (3 / 7), 0.728 * u),
    meanPeriod: Math.min(0.419 * u ** (4 / 7) * d ** (3 / 7), 0.566 * u),
  }
}

export function cycloneWaves(windSpeed: number) {
  requireFiniteNonNegative(windSpeed, 'Wind speed')
  const significantWaveHeight = 0.25 * windSpeed
  return {
    significantWaveHeight,
    peakPeriod: 4.5 * significantWaveHeight ** 0.48,
    atmosphericPressure: 1012.6 - 0.6077785 * windSpeed - 0.01079967 * windSpeed ** 2,
  }
}
