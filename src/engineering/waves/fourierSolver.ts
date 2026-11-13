import { GRAVITY } from '../constants'

export interface FourierInput { waveHeight: number; wavePeriod: number; waterDepth: number; components?: number; heightSteps?: number }
export interface FourierPoint { x: number; elevation: number; pressureCheck: number }
export interface FourierFlowPoint { x: number; y: number; u: number; v: number }
export interface FourierCoefficient { harmonic: number; potential: number; surface: number }
export interface FourierSolution {
  wavelength: number; celerity: number; stokesUrsell: number; heightFractionOfMaximum: number
  surface: FourierPoint[]; flow: FourierFlowPoint[]; coefficients: FourierCoefficient[]
}

type FourierModule = { FS: { writeFile(path:string,data:string):void; readFile(path:string,options:{encoding:'utf8'}):string }; callMain(args:string[]):number }

function numberAfter(text: string, label: RegExp) { const value=text.match(label)?.[1]; return value ? Number(value) : NaN }
function numericRows(text:string){return text.split(/\r?\n/).map(line=>line.trim()).filter(line=>/^[+-]?(?:\d|\.\d)/.test(line)).map(line=>line.split(/\s+/).map(Number))}

export async function solveFourier(input: FourierInput): Promise<FourierSolution> {
  const { waveHeight:H, wavePeriod:T, waterDepth:h }=input
  if (![H,T,h].every(Number.isFinite)||H<=0||T<=0||h<=0) throw new RangeError('Wave height, period and depth must be greater than zero.')
  const components=Math.max(5,Math.min(40,Math.round(input.components??20))); const steps=Math.max(1,Math.min(40,Math.round(input.heightSteps??1)))
  const base=import.meta.env.BASE_URL; const jsUrl=`${base}wasm/fourier.js`; const wasmUrl=`${base}wasm/fourier.wasm`
  const factory=(await import(/* @vite-ignore */ jsUrl)).default as (options:Record<string,unknown>)=>Promise<FourierModule>
  const module=await factory({locateFile:(name:string)=>name.endsWith('.wasm')?wasmUrl:name,print:()=>{},printErr:()=>{}})
  const dimensionlessPeriod=T*Math.sqrt(GRAVITY/h)
  module.FS.writeFile('Data.dat',`Marine Calculators browser solution\n${H/h}\nPeriod\n${dimensionlessPeriod}\n1\n0\n${components}\n${steps}\nFINISH\n`)
  module.FS.writeFile('Convergence.dat','Control file\n40\n1.e-5\n')
  module.FS.writeFile('Points.dat','Control output\n60\n20\n24\n')
  module.callMain([])
  const solution=module.FS.readFile('Solution.res',{encoding:'utf8'}); const surfaceText=module.FS.readFile('Surface.res',{encoding:'utf8'}); const flowText=module.FS.readFile('Flowfield.res',{encoding:'utf8'})
  const lengthDepth=numberAfter(solution,/Length\/Depth:\s*([\d.eE+-]+)/); const speedLine=solution.split(/\r?\n/).find(l=>l.includes('Wave speed'))??''; const speedDepth=Number(speedLine.trim().split(/\s+/).at(-1))
  const stokesUrsell=numberAfter(solution,/Stokes-Ursell number\s+([\d.eE+-]+)/); const maxPercent=numberAfter(solution,/([\d.]+)% of the maximum/)
  const surface=numericRows(surfaceText).filter(r=>r.length>=3&&!(r[0]===0&&r[1]===0)).map(r=>({x:r[0]*h,elevation:(r[1]-1)*h,pressureCheck:r[2]}))
  const coefficientBlock=solution.split('# j, B[j], & E[j], j=1..N')[1]??''; const coefficients=numericRows(coefficientBlock).filter(r=>r.length>=3&&Number.isInteger(r[0])&&r[0]>=1&&r[0]<=components).map(r=>({harmonic:r[0],potential:r[1],surface:r[2]*h/(2*Math.PI/lengthDepth)}))
  const flow:FourierFlowPoint[]=[]; let phase=0
  for(const line of flowText.split(/\r?\n/)){const match=line.match(/# X\/d\s*=\s*([\d.eE+-]+)/);if(match){phase=Number(match[1])*h;continue}const r=line.trim().split(/\s+/).map(Number);if(r.length===9&&r.every(Number.isFinite))flow.push({x:phase,y:r[0]*h,u:r[1]*Math.sqrt(GRAVITY*h),v:r[2]*Math.sqrt(GRAVITY*h)})}
  if(!Number.isFinite(lengthDepth)||!Number.isFinite(speedDepth)||surface.length<20||flow.length<100) throw new Error('The Fourier solver did not return a complete solution.')
  return {wavelength:lengthDepth*h,celerity:speedDepth*Math.sqrt(GRAVITY*h),stokesUrsell,heightFractionOfMaximum:maxPercent,surface,flow,coefficients}
}
