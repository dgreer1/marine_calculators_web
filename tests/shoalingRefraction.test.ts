import { describe, expect, it } from 'vitest'
import { calculateShoalingRefraction } from '../src/engineering/waves/shoalingRefraction'
import { buildShoalingSweep } from '../src/calculators/waves/shoaling-refraction/series'

// Expected values were generated from the unmodified R reference implementation.
describe('wave shoaling and refraction numerical parity', () => {
  it('matches the Shiny defaults', () => {
    const result = calculateShoalingRefraction({ deepWaterWaveHeight: 1, wavePeriod: 15, waterDepth: 10, deepWaterDirection: 45 })
    expect(result.shoalingCoefficient).toBeCloseTo(1.1357030949005638, 12)
    expect(result.refractionCoefficient).toBeCloseTo(0.8601720841949334, 12)
    expect(result.shallowWaterWaveHeight).toBeCloseTo(0.9769000981672542, 12)
  })

  it('matches representative R cases', () => {
    expect(calculateShoalingRefraction({ deepWaterWaveHeight: 1, wavePeriod: 5, waterDepth: 2, deepWaterDirection: 0 }).shallowWaterWaveHeight).toBeCloseTo(1.015780437781418, 12)
    expect(calculateShoalingRefraction({ deepWaterWaveHeight: 2, wavePeriod: 8, waterDepth: 20, deepWaterDirection: 30 }).shallowWaterWaveHeight).toBeCloseTo(1.8079218319810855, 12)
    expect(calculateShoalingRefraction({ deepWaterWaveHeight: 3, wavePeriod: 20, waterDepth: 100, deepWaterDirection: 90 }).shallowWaterWaveHeight).toBeCloseTo(0, 12)
  })

  it('rejects invalid directions and singular inputs', () => {
    expect(() => calculateShoalingRefraction({ deepWaterWaveHeight: 1, wavePeriod: 0, waterDepth: 10, deepWaterDirection: 45 })).toThrow(/period/)
    expect(() => calculateShoalingRefraction({ deepWaterWaveHeight: 1, wavePeriod: 10, waterDepth: 10, deepWaterDirection: 91 })).toThrow(/direction/)
  })

  it('builds the same 100-point graph ranges as the source', () => {
    const input = { deepWaterWaveHeight: 1, wavePeriod: 15, waterDepth: 10, deepWaterDirection: 45 }
    const direction = buildShoalingSweep(input, 'deepWaterDirection', 'refractionCoefficient')
    const period = buildShoalingSweep(input, 'wavePeriod', 'shoalingCoefficient')
    expect(direction).toHaveLength(100)
    expect(direction[0].x).toBe(0)
    expect(direction.at(-1)?.x).toBe(90)
    expect(period[0].x).toBe(7.5)
    expect(period.at(-1)?.x).toBe(20)
  })
})
