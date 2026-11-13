import { linspace } from '../../../engineering/numeric'
import {
  celerity,
  energyDensity,
  energyFlux,
  groupCelerity,
  maximumBedOrbitalVelocity,
  wavelength,
  type LinearWaveInput,
} from '../../../engineering/waves/linearWave'

export type SweepInput = 'wavePeriod' | 'waveHeight' | 'waterDepth'
export type SweepOutput = 'celerity' | 'groupCelerity' | 'wavelength' | 'energyDensity' | 'energyFlux' | 'bedVelocity'

export const sweepInputLabels: Record<SweepInput, string> = {
  wavePeriod: 'Wave period (s)',
  waveHeight: 'Wave height (m)',
  waterDepth: 'Water depth (m)',
}

export const sweepInputUnits: Record<SweepInput, string> = {
  wavePeriod: 's',
  waveHeight: 'm',
  waterDepth: 'm',
}

export const sweepOutputLabels: Record<SweepOutput, string> = {
  celerity: 'Wave celerity (m/s)',
  groupCelerity: 'Group celerity (m/s)',
  wavelength: 'Wavelength (m)',
  energyDensity: 'Energy density (J/m²)',
  energyFlux: 'Energy flux (W/m)',
  bedVelocity: 'Maximum bed orbital velocity (m/s)',
}

export const sweepOutputUnits: Record<SweepOutput, string> = {
  celerity: 'm/s',
  groupCelerity: 'm/s',
  wavelength: 'm',
  energyDensity: 'J/m²',
  energyFlux: 'W/m',
  bedVelocity: 'm/s',
}

function outputValue(input: LinearWaveInput, output: SweepOutput): number {
  switch (output) {
    case 'celerity': return celerity(input.wavePeriod, input.waterDepth)
    case 'groupCelerity': return groupCelerity(input.wavePeriod, input.waterDepth)
    case 'wavelength': return wavelength(input.wavePeriod, input.waterDepth)
    case 'energyDensity': return energyDensity(input.waveHeight)
    case 'energyFlux': return energyFlux(input.wavePeriod, input.waveHeight, input.waterDepth)
    case 'bedVelocity': return maximumBedOrbitalVelocity(input.wavePeriod, input.waveHeight, input.waterDepth)
  }
}

export function buildSweep(input: LinearWaveInput, varying: SweepInput, output: SweepOutput, count = 100) {
  const current = input[varying]
  return linspace(current / 2, current * 2, count).map((x) => {
    const scenario = { ...input, [varying]: x }
    return { x, y: outputValue(scenario, output) }
  })
}

export function currentSweepPoint(input: LinearWaveInput, varying: SweepInput, output: SweepOutput) {
  return { x: input[varying], y: outputValue(input, output) }
}
