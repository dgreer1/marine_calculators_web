import { describe, expect, it } from 'vitest'
import { carterDuration, carterFetch, cycloneWaves, holthuijsen } from '../src/engineering/waves/windWaves'

describe('wind-wave equations', () => {
  it('ports the Holthuijsen implementation', () => {
    const result = holthuijsen({ windSpeed: 10, fetch: 10, waterDepth: 10 })
    expect(result.significantWaveHeight).toBeCloseTo(0.6370704, 6)
    expect(result.peakPeriod).toBeCloseTo(3.013597, 6)
    expect(result.developmentTime).toBeCloseTo(2.209188, 6)
  })
  it('ports the Carter fetch and duration equations', () => {
    expect(carterFetch({ windSpeed: 10, extent: 10 }).significantWaveHeight).toBeCloseTo(0.5154, 3)
    expect(carterDuration({ windSpeed: 10, extent: 4 }).significantWaveHeight).toBeCloseTo(0.7587697, 6)
  })
  it('applies Carter fully-developed limits', () => {
    expect(carterFetch({ windSpeed: 10, extent: 1e9 }).significantWaveHeight).toBe(2.48)
    expect(carterDuration({ windSpeed: 10, extent: 1e9 }).peakPeriod).toBeCloseTo(7.28, 12)
  })
  it('ports the cyclone regressions', () => {
    const result = cycloneWaves(45)
    expect(result.significantWaveHeight).toBe(11.25)
    expect(result.peakPeriod).toBeCloseTo(14.38023, 5)
    expect(result.atmosphericPressure).toBeCloseTo(963.38, 2)
  })
})
