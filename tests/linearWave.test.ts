import { describe, expect, it } from 'vitest'
import {
  calculateLinearWave,
  classifyRelativeDepth,
  deepWaterWavelength,
  maximumBedOrbitalVelocity,
  orbitalProfile,
  wavelength,
} from '../src/engineering/waves/linearWave'
import { buildSweep } from '../src/calculators/waves/linear-wave/series'

// Expected values were generated from the unmodified R reference implementation.
describe('linear wave numerical parity', () => {
  it('matches the Shiny defaults', () => {
    const result = calculateLinearWave({ waveHeight: 2, wavePeriod: 12, waterDepth: 100 })
    expect(result.wavelength).toBeCloseTo(220.888006916084, 10)
    expect(result.celerity).toBeCloseTo(18.5080839041302, 10)
    expect(result.groupCelerity).toBeCloseTo(9.610240910553, 10)
    expect(result.offshoreWaveHeight).toBeCloseTo(2.02655879758407, 10)
    expect(result.energyDensity).toBeCloseTo(5027.625, 6)
    expect(result.energyFlux).toBeCloseTo(48316.687457919, 8)
    expect(result.maximumBedOrbitalVelocity).toBeCloseTo(0.0611145368959057, 10)
    expect(result.relativeDepth).toBe('Transitional')
  })

  it('preserves the deep-water wavelength equation', () => {
    expect(deepWaterWavelength(10)).toBeCloseTo(156.130999, 5)
  })

  it('matches representative shallow and transitional cases', () => {
    expect(wavelength(8, 5)).toBeCloseTo(53.9588812506335, 10)
    expect(classifyRelativeDepth({ waveHeight: 1, wavePeriod: 8, waterDepth: 5 })).toBe('Transitional')
    expect(classifyRelativeDepth({ waveHeight: 0.1, wavePeriod: 12, waterDepth: 1 })).toBe('Shallow water')
  })

  it('returns zero bed velocity for zero wave height', () => {
    expect(maximumBedOrbitalVelocity(10, 0, 20)).toBe(0)
  })

  it('rejects singular and non-finite inputs', () => {
    expect(() => calculateLinearWave({ waveHeight: 1, wavePeriod: 0, waterDepth: 10 })).toThrow(/Wave period/)
    expect(() => calculateLinearWave({ waveHeight: -1, wavePeriod: 10, waterDepth: 10 })).toThrow(/Wave height/)
    expect(() => calculateLinearWave({ waveHeight: 1, wavePeriod: 10, waterDepth: Number.NaN })).toThrow(/Water depth/)
  })

  it('uses the calculation library for profiles and 100-point sweeps', () => {
    const input = { waveHeight: 2, wavePeriod: 12, waterDepth: 100 }
    const profile = orbitalProfile(input)
    const sweep = buildSweep(input, 'wavePeriod', 'celerity')
    expect(profile).toHaveLength(100)
    expect(profile[0].heightAboveBed).toBeCloseTo(0.1)
    expect(profile.at(-1)?.heightAboveBed).toBeCloseTo(100)
    expect(profile.at(-1)!.velocity).toBeGreaterThan(profile[0].velocity)
    expect(profile.at(-1)!.excursion).toBeGreaterThan(profile[0].excursion)
    expect(sweep).toHaveLength(100)
    expect(sweep[0].x).toBe(6)
    expect(sweep.at(-1)?.x).toBe(24)
  })
})
