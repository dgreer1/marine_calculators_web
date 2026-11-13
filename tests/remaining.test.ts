import { describe, expect, it } from 'vitest'
import { beachSlope, criticalSediment, enclosedWindSetup, fallVelocity, fringeSetup, planarSetup, reefBallTransmission, submergedTransmission } from '../src/engineering/remaining'

describe('remaining Shiny calculator ports', () => {
  it('matches the planar and reef setup defaults', () => {
    const planar=planarSetup(1,10,.05); expect(planar.setup).toBeCloseTo(.2186667,6); expect(planar.runup).toBeCloseTo(.7458988,6)
    const reef=fringeSetup(.5,1,10,15,300); expect(reef.waveSetup).toBeCloseTo(.3347,6); expect(reef.windSetup).toBeCloseTo(.003930155,8)
  })
  it('matches the two fall velocity defaults', () => { const x=fallVelocity(.0003,2650,1027); expect(x.fentonChurch).toBeCloseTo(.03306474,7); expect(x.soulsby).toBeCloseTo(.03720445,7) })
  it('matches critical sediment defaults', () => { expect(criticalSediment(.0002,10,10,2650,1027).shear).toBeCloseTo(.1762665,6); expect(criticalSediment(.0001,10,10,2650,1027).current).toBeCloseTo(.4269794,6); expect(criticalSediment(.0002,10,10,2650,1027).orbital).toBeCloseTo(.1884557,6) })
  it('matches beach and enclosed-water defaults', () => { expect(beachSlope(.001)).toBeCloseTo(.1114993,6); expect(enclosedWindSetup(25,1,4000)).toBeCloseTo(.4459735,6) })
  it('matches transmission defaults', () => { expect(submergedTransmission(2,150,.5,15,.5).coefficient).toBeCloseTo(.2691955,6); expect(reefBallTransmission(1.5,150,.5,15).coefficient).toBeCloseTo(.636804,6) })
})
