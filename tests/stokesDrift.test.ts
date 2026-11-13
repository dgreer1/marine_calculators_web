import { describe, expect, it } from 'vitest'
import { calculateStokesDrift, stokesDriftProfile, surfaceStokesDrift } from '../src/engineering/waves/stokesDrift'

describe('Stokes drift', () => {
  it('matches the original surface-drift equation', () => {
    expect(surfaceStokesDrift(1, 10)).toBeCloseTo(0.006321, 5)
  })

  it('returns a depth average below the surface value', () => {
    const result = calculateStokesDrift({ waveHeight: 1, wavePeriod: 10, waterDepth: 10 })
    expect(result.depthAverage).toBeGreaterThan(0)
    expect(result.depthAverage).toBeLessThan(result.surface)
  })

  it('orients the profile from bed to surface', () => {
    const profile = stokesDriftProfile({ waveHeight: 1, wavePeriod: 10, waterDepth: 10 }, 3)
    expect(profile[0].heightAboveBed).toBe(0)
    expect(profile[2].heightAboveBed).toBe(10)
    expect(profile[2].velocity).toBeGreaterThan(profile[0].velocity)
  })
})
