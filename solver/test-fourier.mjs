import createFourier from '../public/wasm/fourier.js'
import { fileURLToPath } from 'node:url'

const wasmPath = fileURLToPath(new URL('../public/wasm/fourier.wasm', import.meta.url))
const module = await createFourier({ locateFile: name => name.endsWith('.wasm') ? wasmPath : name, print: () => {}, printErr: console.error })
module.FS.writeFile('Data.dat', `Browser validation
0.3
Period
10
1
0
20
1
FINISH
`)
module.FS.writeFile('Convergence.dat', `Control file
40
1.e-5
`)
module.FS.writeFile('Points.dat', `Control output
40
16
20
`)
module.callMain([])
const solution = module.FS.readFile('Solution.res', { encoding: 'utf8' })
const length = Number(solution.match(/Length\/Depth:\s*([\d.]+)/)?.[1])
const speedLine = solution.split('\n').find(line => line.includes('Wave speed')) ?? ''
const speed = Number(speedLine.trim().split(/\s+/).at(-1))
if (Math.abs(length - 9.69) > 0.01 || Math.abs(speed - 0.9690) > 1e-4) throw new Error(`Unexpected result: L/d=${length}, c=${speed}`)
console.log(JSON.stringify({ length, speed, surfaceBytes: module.FS.stat('Surface.res').size, flowfieldBytes: module.FS.stat('Flowfield.res').size }))
