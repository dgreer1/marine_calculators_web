import { GRAVITY, SEAWATER_DENSITY } from './constants'
import { deepWaterWavelength, maximumBedOrbitalVelocity } from './waves/linearWave'

export const KINEMATIC_VISCOSITY = 1.36e-6
const rad = (degrees: number) => degrees * Math.PI / 180

export function planarSetup(H: number, T: number, beta: number) {
  const L0 = deepWaterWavelength(T); const xi = beta / Math.sqrt(H / L0); const root = Math.sqrt(H * L0)
  const setup = xi < 0.3 ? 0.016 * root : 0.35 * beta * root
  const runup = xi < 0.3 ? 0.043 * root : 1.1 * (0.35 * beta * root + Math.sqrt(H * L0 * (0.563 * beta ** 2 + 0.004)) / 2)
  return { iribarren: xi, breakerType: xi < 0.5 ? 'Spilling' : xi < 3.3 ? 'Plunging' : 'Surging or Collapsing', setup, runup }
}
export function fringeSetup(depth: number, H: number, T: number, wind: number, width: number) {
  const wave = Math.max(-0.18 * depth + 0.48 * Math.log10(H ** 2 * T) - 5.53 * H / T ** 2, 0)
  const cd = 0.00063 + (0.00723 - 0.00063) * wind / 100
  return { waveSetup: wave, windSetup: width * cd * wind ** 2 / ((100000 / 3) * (depth + wave)) }
}
export function dimensionlessGrain(rhoS: number, rho: number, d: number) { return (GRAVITY * (rhoS / rho - 1) / KINEMATIC_VISCOSITY ** 2) ** (1 / 3) * d }
export function fallVelocity(d: number, rhoS: number, rho: number) {
  const R = (rhoS - rho) / rho; const dStar = dimensionlessGrain(rhoS, rho, d)
  return { fentonChurch: R * GRAVITY * d ** 2 / (18 * KINEMATIC_VISCOSITY + Math.sqrt(0.75 * R * GRAVITY * d ** 3)), soulsby: KINEMATIC_VISCOSITY / d * (Math.sqrt(10.36 ** 2 + 1.049 * dStar ** 3) - 10.36) }
}
export function shields(rhoS: number, rho: number, d: number) { const ds=dimensionlessGrain(rhoS,rho,d); return 0.30/(1+1.2*ds)+0.055*(1-Math.exp(-0.02*ds)) }
export function criticalSediment(d: number, depth: number, period: number, rhoS: number, rho: number) {
  const ds=dimensionlessGrain(rhoS,rho,d); const theta=shields(rhoS,rho,d); const s=rhoS/rho
  return { dStar: ds, shields: theta, shear: theta*GRAVITY*(rhoS-rho)*d, current: 7*(depth/d)**(1/7)*Math.sqrt(GRAVITY*(s-1)*d*theta), orbital: d<0.0005 ? (0.118*GRAVITY*(s-1))**(2/3)*d**(1/3)*period**(1/3) : (1.09*GRAVITY*(s-1))**(4/7)*d**(3/7)*period**(1/7) }
}
export function beachSlope(d: number) { const mm=d*1000; return -0.178*(mm-0.125)**-0.187+0.294 }
export function sedimentDensity(sand:number,silt:number,clay:number,rhoW:number,rhoS:number){const dry=415*clay/100+1120*silt/100+1550*sand/100;return{dry,wet:rhoW+(rhoS-rhoW)/rhoS*dry,porosity:(rhoS-dry)/rhoS}}
export function enclosedWindSetup(wind:number,depth:number,fetch:number){return 0.5*3.5e-6*(wind**2/(GRAVITY*depth))*fetch}
export function bedShear(H:number,T:number,phi:number,U:number,z0:number,depth:number,rho:number){
  const uw=maximumBedOrbitalVelocity(T,H,depth); const A=uw*T/(2*Math.PI); const cd=(0.40/(1+Math.log(z0/depth)))**2; const fw=uw>0?1.39*(A/z0)**-0.52:0; const tauC=rho*cd*U**2; const tauW=0.5*rho*fw*uw**2; const tauM=tauC+tauW>0?tauC*(1+1.2*(tauW/(tauC+tauW))**3.2):0; let angle=Math.abs(phi)%180;if(angle>90)angle=180-angle;const p=rad(angle);return{uw,A,cd,fw,tauC,tauW,tauM,tauMax:Math.hypot(tauM+tauW*Math.cos(p),tauW*Math.sin(p))}}
export function surfSimilarity(H:number,T:number,alpha:number){return (H/deepWaterWavelength(T))**-0.5*Math.tan(rad(alpha))}
export function rockSizing(H:number,T:number,rhoS:number,rhoW:number,S:number,P:number,Nz:number,alpha:number,depth:number,waveAngle:number,safety:number,spectral:boolean){const xi=surfSimilarity(H,T,alpha);const Cpl=spectral?8.4:8.7;const Cs=spectral?1.3:1.4;const xic=((Cpl/Cs)*P**0.31*Math.sqrt(Math.tan(rad(alpha))))**(1/(P+0.5));const depthFactor=Math.min(H/depth>0.3?0.4*(H/depth)+0.58:0.7,0.82);const af=0.5+0.5*Math.cos(rad(waveAngle))**2;const plunge=Cpl/(af*safety)*P**0.18*(S/Math.sqrt(Nz))**0.2*depthFactor*xi**-0.5;const surge=Cs/(af*safety)*P**-0.13*(S/Math.sqrt(Nz))**0.2*depthFactor*Math.sqrt(1/Math.tan(rad(alpha)))*xi**P;const stability=xi<xic||1/Math.tan(rad(alpha))>3.95?plunge:surge;return{xi,wavelength:deepWaterWavelength(T),steepness:H/deepWaterWavelength(T),duration:Nz*T/3600,diameter:H/(stability*(rhoS/rhoW-1))}}
export function overtopping(H:number,T:number,alpha:number,waveAngle:number,runupSafety:number,overtopSafety:number,rough:number,berm:number,Rc:number){const xi=surfSimilarity(H,T,alpha);const af=0.5+0.5*Math.cos(rad(waveAngle))**2;const runup=xi<1.7?1.65*runupSafety*rough*berm*af*xi*H:runupSafety*rough*(4-1.5/Math.sqrt(xi))*H;const q1=overtopSafety*0.067*xi/Math.sqrt(Math.tan(rad(alpha)))*Math.sqrt(GRAVITY*H**3)*Math.exp(-4.3*Rc/(xi*berm*rough*af*H));const q2=overtopSafety*0.2*Math.sqrt(GRAVITY*H**3)*Math.exp(-2.3*Rc/(berm*rough*af*H));const q3=overtopSafety*0.2*Math.sqrt(GRAVITY*H**3)*Math.exp(-1.11*Rc/((0.33+0.022*xi)*berm*rough*af*H));return{xi,runup,rate:1000*(xi<1.8?q1:xi>7?q3:q2),percentage:100*Math.exp(-3.91*Rc**2/runup**2)}}
export function submergedTransmission(H:number,L:number,depth:number,width:number,d50:number){const a=width*depth/(L*d50),b=depth*H/(width*d50);const coefficient=1-(Math.exp(-0.65*depth/H-1.09*H/width)+0.047*a-0.067*b);return{coefficient,reduction:(1-coefficient)*100,inRange:a>=0&&a<=7.08&&b>=0&&b<=2.14}}
export function reefBallTransmission(H:number,L:number,depth:number,width:number){const R=depth/H;const b=width*0.6/Math.sqrt(H*L);const low=(-0.249*Math.min(4,b)+0.9474)**2;const high=1/(1+0.3*R**-1.5*b);const coefficient=R<=0.4?low:R<0.7?(0.7-R)/0.3*low+(R-0.4)/0.3*high:high;return{coefficient,reduction:(1-coefficient)*100}}
