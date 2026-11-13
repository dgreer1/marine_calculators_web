import { describe, expect, it } from 'vitest'
import { chooseWaveTheory } from '../src/engineering/waves/theorySelection'

describe('wave-theory guidance', () => {
  it('identifies a small deep-water wave as linear', () => expect(chooseWaveTheory({ waveHeight: .2, wavePeriod: 5, waterDepth: 50 }).theory).toBe('Airy (linear)'))
  it('selects Stokes for a moderate intermediate-depth wave', () => expect(chooseWaveTheory({ waveHeight: 1, wavePeriod: 6, waterDepth: 15 }).theory).toBe('Stokes'))
  it('selects cnoidal theory for a long shallow wave', () => expect(chooseWaveTheory({ waveHeight: .5, wavePeriod: 15, waterDepth: 3 }).theory).toBe('Cnoidal'))
  it('flags a depth-limited breaking case', () => expect(chooseWaveTheory({ waveHeight: 2.5, wavePeriod: 10, waterDepth: 3 }).theory).toContain('Breaking'))
  it('returns the expected dimensionless parameters', () => { const r=chooseWaveTheory({waveHeight:2,wavePeriod:10,waterDepth:10}); expect(r.relativeHeight).toBeCloseTo(.2); expect(r.ursell).toBeCloseTo(17.626,3) })
})
