import { describe, expect, it } from 'vitest'
import { beachSlope, bedShear, criticalSediment, enclosedWindSetup, fallVelocity, fringeSetup, overtopping, planarSetup, reefBallTransmission, rockSizing, sedimentDensity, submergedTransmission } from '../src/engineering/remaining'

describe('remaining Shiny calculator ports', () => {
  it('matches the planar and reef setup defaults', () => {
    const planar=planarSetup(1,10,.05); expect(planar.setup).toBeCloseTo(.2186667,6); expect(planar.runup).toBeCloseTo(.7458988,6)
    const reef=fringeSetup(.5,1,10,15,300); expect(reef.waveSetup).toBeCloseTo(.3347,6); expect(reef.windSetup).toBeCloseTo(.003930155,8)
  })
  it('matches the two fall velocity defaults', () => { const x=fallVelocity(.0003,2650,1027); expect(x.fentonChurch).toBeCloseTo(.03306474,7); expect(x.soulsby).toBeCloseTo(.03720445,7) })
  it('matches critical sediment defaults', () => { expect(criticalSediment(.0002,10,10,2650,1027).shear).toBeCloseTo(.1762665,6); expect(criticalSediment(.0001,10,10,2650,1027).current).toBeCloseTo(.4269794,6); expect(criticalSediment(.0002,10,10,2650,1027).orbital).toBeCloseTo(.1884557,6) })
  it('matches beach and enclosed-water defaults', () => { expect(beachSlope(.001)).toBeCloseTo(.1114993,6); expect(enclosedWindSetup(25,1,4000)).toBeCloseTo(.4459735,6) })
  it('matches transmission defaults', () => { expect(submergedTransmission(2,150,.5,15,.5).coefficient).toBeCloseTo(.2691955,6); expect(reefBallTransmission(1.5,150,.5,15).coefficient).toBeCloseTo(.636804,6) })
  it('matches the bed-shear component defaults', () => {
    const x=bedShear(2,8,45,.5,.002,50,1027)
    expect(x.uw).toBeCloseTo(.06533722,7); expect(x.A).toBeCloseTo(.08318993,7); expect(x.cd).toBeCloseTo(.001920874,8); expect(x.fw).toBeCloseTo(.2000385,7)
    expect(x.tauC).toBeCloseTo(.4931845,6); expect(x.tauW).toBeCloseTo(.4385058,6)
  })
  it('matches engineering and sediment defaults', () => {
    const rock=rockSizing(2.5,16,2700,1025,2,.4,2160,14,3,0,1.1,true)
    expect(rock.waves).toBe(2160); expect(rock.duration).toBeCloseTo(9.6,6); expect(rock.diameter).toBeCloseTo(.959732,6)
    const x=overtopping(2.5,9,20,0,1.1,1.5,.9,1,8.5); expect(x.xi).toBeCloseTo(2.588707,6); expect(x.runup).toBeCloseTo(7.592589,6); expect(x.rate).toBeCloseTo(.6256469,6); expect(x.percentage).toBeCloseTo(.7443327,6)
    const d=sedimentDensity(30,30,40,1025,2650); expect(d.dry).toBeCloseTo(967,6); expect(d.wet).toBeCloseTo(1617.972,3); expect(d.porosity).toBeCloseTo(.6350943,6)
  })
})
