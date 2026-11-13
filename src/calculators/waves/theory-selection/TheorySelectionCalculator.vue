<script setup lang="ts">
import renderMathInElement from 'katex/contrib/auto-render'
import { computed, nextTick, onMounted, ref } from 'vue'
import PlotlyChart from '../../../components/PlotlyChart.vue'
import { chooseTheoryFromDimensionless, chooseWaveTheory } from '../../../engineering/waves/theorySelection'

const waveHeight = ref(2)
const wavePeriod = ref(10)
const waterDepth = ref(10)
const error = computed(() => waveHeight.value < 0 || wavePeriod.value <= 0 || waterDepth.value <= 0 ? 'Wave height must be non-negative; period and depth must be greater than zero.' : '')
const result = computed(() => error.value ? null : chooseWaveTheory({ waveHeight: waveHeight.value, wavePeriod: wavePeriod.value, waterDepth: waterDepth.value }))

const axis = Array.from({ length: 150 }, (_, i) => 10 ** (-4 + i * 3.1 / 149))
const depthAxis = Array.from({ length: 160 }, (_, i) => 10 ** (-3 + i * 2.45 / 159))
const zones = axis.map(y => depthAxis.map(x => {
  const theory = chooseTheoryFromDimensionless(y, x).theory
  return theory === 'Airy (linear)' ? 0 : theory === 'Stokes' ? 1 : theory === 'Cnoidal' ? 2 : theory === 'Fourier / stream function' ? 3 : 4
}))
const zoneColors: Array<[number, string]> = [[0,'#b9def1'],[.249,'#b9def1'],[.25,'#f6c453'],[.499,'#f6c453'],[.5,'#79c987'],[.749,'#79c987'],[.75,'#a98ad3'],[.999,'#a98ad3'],[1,'#e4776d']]
const chartData = computed(() => {
  const r = result.value
  return [
    { x: depthAxis, y: axis, z: zones, type: 'heatmap' as const, zmin: 0, zmax: 4, showscale: false, hoverinfo: 'skip' as const, colorscale: zoneColors },
    ...(r ? [{ x: [r.depthParameter], y: [r.heightParameter], type: 'scatter' as const, mode: 'markers' as const, marker: { color: '#111', size: 12, line: { color: '#fff', width: 2 } }, name: 'Your wave', hovertemplate: `Your wave<br>h/gT² = ${r.depthParameter.toPrecision(3)}<br>H/gT² = ${r.heightParameter.toPrecision(3)}<extra></extra>` }] : []),
  ]
})
const chartLayout = { xaxis: { title: { text: 'Relative depth, h/gT²' }, type: 'log' as const, range: [-3, -0.55] }, yaxis: { title: { text: 'Relative wave height, H/gT²' }, type: 'log' as const, range: [-4, -0.9] }, showlegend: true, legend: { orientation: 'h' as const, y: 1.12 }, margin: { t: 48, b: 58 } }

type TheoryKey = 'airy' | 'stokes' | 'cnoidal' | 'fourier'
const activeTheory = ref<TheoryKey>('stokes')
const theoryDetails: Record<TheoryKey, { name: string; short: string; best: string; watch: string; colour: string }> = {
  airy: { name: 'Airy (linear)', short: 'A sinusoidal first-order solution. Crest and trough are symmetric and the wave components do not interact.', best: 'Small wave height and steepness; a reliable baseline for wavelength, celerity and first-order kinematics.', watch: 'Misses crest sharpening, trough flattening and other nonlinear effects.', colour: '#1678a5' },
  stokes: { name: 'Stokes', short: 'Adds successively higher harmonics to linear theory. The crest becomes higher and sharper while the trough becomes broader.', best: 'Intermediate or deep water when the wave is moderately nonlinear and not too long.', watch: 'The expansion becomes unreliable for long shallow-water waves or waves close to breaking.', colour: '#c47a00' },
  cnoidal: { name: 'Cnoidal', short: 'A shallow-water expansion built from elliptic functions. It represents narrow crests separated by long, comparatively flat troughs.', best: 'Long waves in shallow water, commonly indicated by an Ursell number above about 40.', watch: 'It converges poorly as water becomes deeper and is less suitable for high waves than a numerical solution.', colour: '#23823b' },
  fourier: { name: 'Fourier / stream function', short: 'Solves the nonlinear free-surface conditions numerically using a finite series rather than a small-parameter expansion.', best: 'Accurate profiles, velocities and pressures over a wide depth range, especially for strongly nonlinear waves.', watch: 'Still assumes a regular, non-breaking wave over constant depth and requires an iterative numerical solution.', colour: '#7040a1' },
}
const selectedDetail = computed(() => theoryDetails[activeTheory.value])
const selectedMatches = computed(() => {
  const name = result.value?.theory ?? ''
  return (activeTheory.value === 'airy' && name.startsWith('Airy')) || (activeTheory.value === 'stokes' && name === 'Stokes') || (activeTheory.value === 'cnoidal' && name === 'Cnoidal') || (activeTheory.value === 'fourier' && name.startsWith('Fourier'))
})
const profileX = Array.from({ length: 181 }, (_, i) => -0.5 + 2 * i / 180)
const profileY = computed(() => profileX.map(x => {
  const p = 2 * Math.PI * x
  if (activeTheory.value === 'airy') return Math.cos(p)
  if (activeTheory.value === 'stokes') return Math.cos(p) + .18 * Math.cos(2 * p)
  if (activeTheory.value === 'cnoidal') return 2 * ((.5 + .5 * Math.cos(p)) ** 4) - .55
  return Math.cos(p) + .23 * Math.cos(2 * p) + .09 * Math.cos(3 * p) + .035 * Math.cos(4 * p)
}))
const profileData = computed(() => [
  { x: profileX, y: profileY.value, type: 'scatter' as const, mode: 'lines' as const, line: { color: selectedDetail.value.colour, width: 3 }, hovertemplate: 'x/L = %{x:.2f}<br>Normalised elevation = %{y:.2f}<extra></extra>' },
  { x: [-.5, 1.5], y: [0, 0], type: 'scatter' as const, mode: 'lines' as const, line: { color: '#777', width: 1, dash: 'dash' as const }, hoverinfo: 'skip' as const },
])
const profileLayout = { xaxis: { title: { text: 'Position through the wave, x/L' }, range: [-.5, 1.5] }, yaxis: { title: { text: 'Normalised surface elevation' }, fixedrange: true }, showlegend: false, margin: { t: 12, b: 55, l: 62, r: 18 } }

onMounted(async () => {
  await nextTick()
  const el = document.querySelector('.theory-background') as HTMLElement | null
  if (el) renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false })
})
</script>

<template>
  <section class="calculator theory-selector">
    <div class="calculator-heading"><h1>Nonlinear Regular Wave Theory</h1></div>
    <div class="theory-intro">Use the wave conditions to locate the case on a wave-theory applicability map. The result is guidance—not a hard boundary—and assumes a regular, non-breaking wave over constant depth.</div>
    <div class="calculator-grid theory-grid">
      <article class="panel input-panel">
        <div class="panel-title input-title"><h2>Input</h2></div>
        <label>Wave Height <span>(m)</span><input v-model.number="waveHeight" type="number" min="0" step="any" /></label>
        <label>Wave Period <span>(s)</span><input v-model.number="wavePeriod" type="number" min="0.01" step="any" /></label>
        <label>Water Depth <span>(m)</span><input v-model.number="waterDepth" type="number" min="0.01" step="any" /></label>
        <p v-if="error" class="error">{{ error }}</p>
      </article>
      <article class="panel output-panel">
        <div class="panel-title output-title"><h2>Suggested Theory</h2></div>
        <template v-if="result">
          <div class="theory-recommendation" :class="{ warning: result.theory.includes('Breaking') || result.nearBreaking }">
            <strong>{{ result.theory }}</strong><p>{{ result.explanation }}</p>
          </div>
          <dl class="results">
            <div><dt>Linear Wavelength</dt><dd>{{ result.wavelength.toFixed(2) }} m</dd></div>
            <div><dt>Relative Depth (h/L)</dt><dd>{{ result.relativeDepth.toFixed(3) }}</dd></div>
            <div><dt>Relative Wave Height (H/h)</dt><dd>{{ result.relativeHeight.toFixed(3) }}</dd></div>
            <div><dt>Linear Steepness (kH/2)</dt><dd>{{ result.steepness.toFixed(3) }}</dd></div>
            <div><dt>Ursell Number</dt><dd>{{ result.ursell.toFixed(1) }}</dd></div>
          </dl>
        </template>
      </article>
      <article class="panel charts-panel theory-chart-panel">
        <div class="panel-title graphical-title"><h2>Applicability Map</h2></div>
        <div class="graphical-body">
          <PlotlyChart :data="chartData" :layout="chartLayout" />
          <div class="theory-key" aria-label="Applicability-map key"><span class="linear">Airy</span><span class="stokes">Stokes</span><span class="cnoidal">Cnoidal</span><span class="fourier">Fourier / stream function</span><span class="breaking">Breaking region</span></div>
        </div>
      </article>
    </div>

    <section class="theory-explorer" aria-labelledby="theory-explorer-title">
      <div class="explorer-heading"><h2 id="theory-explorer-title">Explore the theories</h2><p>Select a theory to see what it assumes and how its characteristic wave shape differs.</p></div>
      <div class="theory-tabs" role="tablist" aria-label="Wave theories">
        <button v-for="(detail, key) in theoryDetails" :key="key" type="button" role="tab" :aria-selected="activeTheory === key" :class="[{ selected: activeTheory === key }, key]" @click="activeTheory = key as TheoryKey"><span>{{ detail.name }}</span><small>{{ key === 'airy' ? 'First order' : key === 'fourier' ? 'Numerical' : 'Nonlinear expansion' }}</small></button>
      </div>
      <div class="explorer-content">
        <div class="explainer-copy">
          <div v-if="selectedMatches" class="case-badge">Suggested for the current inputs</div>
          <h3>{{ selectedDetail.name }}</h3>
          <p class="lead">{{ selectedDetail.short }}</p>
          <dl><div><dt>Most useful when</dt><dd>{{ selectedDetail.best }}</dd></div><div><dt>Important limitation</dt><dd>{{ selectedDetail.watch }}</dd></div></dl>
        </div>
        <div class="profile-demo">
          <PlotlyChart :data="profileData" :layout="profileLayout" />
          <p>Normalised schematic profile for comparison—not calculated solver output.</p>
        </div>
      </div>
    </section>

    <article class="background-panel">
      <div class="background-title"><h2>Background</h2><span>−</span></div>
      <div class="background-body theory-background">
        <p>A steadily progressing regular wave can be described using wave height $H$, period $T$, mean water depth $h$, wavelength $L$ and wavenumber $k=2\pi/L$. Useful measures of depth and nonlinearity are</p>
        <div class="equation">$$kh,\qquad \frac{kH}{2},\qquad \frac{H}{h},\qquad Ur=\frac{HL^2}{h^3}.$$</div>
        <p><strong>Airy theory</strong> is the linear, first-order solution. It is useful when wave height and steepness are small. <strong>Stokes theory</strong> adds higher harmonics and is best suited to waves that are not especially long or high. <strong>Cnoidal theory</strong> describes long waves in shallow water and tends towards the solitary-wave form as wavelength becomes very large.</p>
        <p>Fenton describes an approximate Stokes–cnoidal boundary at $Ur\approx40$, equivalent to a Stokes–Ursell number near one half. This is a guide rather than a discontinuous physical boundary. For high waves, or where accurate kinematics and pressures are important, a numerical <strong>Fourier or stream-function solution</strong> is generally preferable to either truncated analytical expansion.</p>
        <p>The Fourier/stream-function model solves nonlinear free-surface conditions using a finite Fourier series and Newton iteration. It applies across a wide range of relative depths, but the steady-wave idealisation remains limited to periodic, non-breaking waves over constant depth. Cases at or beyond breaking should be treated using a model appropriate to transformation, dissipation and breaking.</p>
        <p><strong>References</strong><br /><a href="https://johndfenton.com/Steady-waves/Instructions.pdf" target="_blank" rel="noopener">Fenton, J. D. (2022). <em>Use of the programs FOURIER, CNOIDAL and STOKES for steady waves.</em></a><br /><a href="https://arxiv.org/html/1901.10577v1" target="_blank" rel="noopener">Ducrozet, G. et al. (2019). CN-Stream: Open-source library for nonlinear regular waves using stream function theory.</a></p>
      </div>
    </article>
  </section>
</template>
