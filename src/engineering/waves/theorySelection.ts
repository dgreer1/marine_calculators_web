import { GRAVITY } from '../constants'
import { wavelength } from './linearWave'

export type WaveTheory = 'Airy (linear)' | 'Stokes' | 'Cnoidal' | 'Fourier / stream function' | 'Breaking / outside steady-wave theory'

export interface TheorySelectionInput {
  waveHeight: number
  wavePeriod: number
  waterDepth: number
}

export interface TheorySelectionResult {
  theory: WaveTheory
  wavelength: number
  waveNumber: number
  relativeDepth: number
  relativeHeight: number
  steepness: number
  ursell: number
  depthParameter: number
  heightParameter: number
  nearBreaking: boolean
  explanation: string
}

export function chooseTheoryFromDimensionless(heightParameter: number, depthParameter: number) {
  const period = 1
  const depth = depthParameter * GRAVITY
  const height = heightParameter * GRAVITY
  return chooseWaveTheory({ waveHeight: height, wavePeriod: period, waterDepth: depth })
}

export function chooseWaveTheory(input: TheorySelectionInput): TheorySelectionResult {
  const { waveHeight: H, wavePeriod: T, waterDepth: h } = input
  if (![H, T, h].every(Number.isFinite) || H < 0 || T <= 0 || h <= 0) throw new RangeError('Wave height must be non-negative; period and depth must be positive.')

  const L = wavelength(T, h)
  const k = 2 * Math.PI / L
  const relativeDepth = h / L
  const relativeHeight = H / h
  const steepness = k * H / 2
  const ursell = H * L ** 2 / h ** 3
  const depthParameter = h / (GRAVITY * T ** 2)
  const heightParameter = H / (GRAVITY * T ** 2)
  const breaking = relativeHeight >= 0.78 || H / L >= 0.14
  const nearBreaking = !breaking && (relativeHeight >= 0.55 || H / L >= 0.10)

  let theory: WaveTheory
  let explanation: string
  if (breaking) {
    theory = 'Breaking / outside steady-wave theory'
    explanation = 'The wave is at or beyond a commonly used depth- or steepness-limited breaking criterion. A steady, non-breaking periodic-wave theory is not appropriate.'
  } else if (nearBreaking || steepness >= 0.15 || relativeHeight >= 0.40) {
    theory = 'Fourier / stream function'
    explanation = 'The wave is strongly nonlinear or approaching the breaking limit. A numerical Fourier or stream-function solution is preferable to a truncated analytical expansion.'
  } else if (relativeHeight <= 0.05 && steepness <= 0.05 && ursell <= 10) {
    theory = 'Airy (linear)'
    explanation = 'Both relative wave height and steepness are small, so linear theory should provide a useful first-order description.'
  } else if (ursell > 40) {
    theory = 'Cnoidal'
    explanation = 'The wave is long relative to the depth and its Ursell number exceeds the approximate Stokes–cnoidal boundary. Cnoidal theory is the more suitable analytical approximation.'
  } else {
    theory = 'Stokes'
    explanation = 'The wave is not especially long and remains below the strongly nonlinear range. A Stokes expansion is the more suitable analytical approximation.'
  }

  return { theory, wavelength: L, waveNumber: k, relativeDepth, relativeHeight, steepness, ursell, depthParameter, heightParameter, nearBreaking, explanation }
}
