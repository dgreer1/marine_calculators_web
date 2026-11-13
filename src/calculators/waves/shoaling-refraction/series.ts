import { linspace } from '../../../engineering/numeric'
import { calculateShoalingRefraction, type ShoalingRefractionInput } from '../../../engineering/waves/shoalingRefraction'

export type ShoalingSweepInput = 'wavePeriod' | 'deepWaterWaveHeight' | 'waterDepth' | 'deepWaterDirection'
export type ShoalingSweepOutput = 'shoalingCoefficient' | 'refractionCoefficient' | 'shallowWaterWaveHeight'

export const inputLabels: Record<ShoalingSweepInput, string> = {
  wavePeriod: 'Wave period (s)',
  deepWaterWaveHeight: 'Deep-water wave height (m)',
  waterDepth: 'Water depth (m)',
  deepWaterDirection: 'Wave direction (deg)',
}

export const inputUnits: Record<ShoalingSweepInput, string> = {
  wavePeriod: 's', deepWaterWaveHeight: 'm', waterDepth: 'm', deepWaterDirection: '°',
}

export const outputLabels: Record<ShoalingSweepOutput, string> = {
  shoalingCoefficient: 'Shoaling coefficient',
  refractionCoefficient: 'Refraction coefficient',
  shallowWaterWaveHeight: 'Shallow-water wave height (m)',
}

export const outputUnits: Record<ShoalingSweepOutput, string> = {
  shoalingCoefficient: '', refractionCoefficient: '', shallowWaterWaveHeight: 'm',
}

export function buildShoalingSweep(input: ShoalingRefractionInput, varying: ShoalingSweepInput, output: ShoalingSweepOutput, count = 100) {
  let start = input[varying] / 2
  let end = input[varying] * 2
  if (varying === 'wavePeriod') end = Math.min(20, end)
  if (varying === 'deepWaterDirection') { start = 0; end = 90 }
  return linspace(start, end, count).map((x) => ({
    x,
    y: calculateShoalingRefraction({ ...input, [varying]: x })[output],
  }))
}
