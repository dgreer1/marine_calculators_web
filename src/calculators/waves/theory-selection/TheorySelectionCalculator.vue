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

const axis = Array.from({ length: 45 }, (_, i) => 10 ** (-4 + i * 3.1 / 44))
const depthAxis = Array.from({ length: 48 }, (_, i) => 10 ** (-3 + i * 2.45 / 47))
const zones = axis.map(y => depthAxis.map(x => {
  const theory = chooseTheoryFromDimensionless(y, x).theory
  return theory === 'Airy (linear)' ? 0 : theory === 'Stokes' ? 1 : theory === 'Cnoidal' ? 2 : theory === 'Fourier / stream function' ? 3 : 4
}))
const zoneColors: Array<[number, string]> = [[0,'#edf6fc'],[.249,'#edf6fc'],[.25,'#fff1c9'],[.499,'#fff1c9'],[.5,'#e8f7e9'],[.749,'#e8f7e9'],[.75,'#eee7f7'],[.999,'#eee7f7'],[1,'#f8d8d4']]
const chartData = computed(() => {
  const r = result.value
  return [
    { x: depthAxis, y: axis, z: zones, type: 'heatmap' as const, zmin: 0, zmax: 4, showscale: false, hoverinfo: 'skip' as const, colorscale: zoneColors },
    ...(r ? [{ x: [r.depthParameter], y: [r.heightParameter], type: 'scatter' as const, mode: 'markers' as const, marker: { color: '#111', size: 12, line: { color: '#fff', width: 2 } }, name: 'Your wave', hovertemplate: `Your wave<br>h/gT² = ${r.depthParameter.toPrecision(3)}<br>H/gT² = ${r.heightParameter.toPrecision(3)}<extra></extra>` }] : []),
  ]
})
const chartLayout = { xaxis: { title: { text: 'Relative depth, h/gT²' }, type: 'log' as const, range: [-3, -0.55] }, yaxis: { title: { text: 'Relative wave height, H/gT²' }, type: 'log' as const, range: [-4, -0.9] }, showlegend: true, legend: { orientation: 'h' as const, y: 1.12 }, margin: { t: 48, b: 58 } }

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

    <article class="background-panel">
      <div class="background-title"><h2>Background</h2><span>−</span></div>
      <div class="background-body theory-background">
        <p>A steadily progressing regular wave can be described using wave height $H$, period $T$, mean water depth $h$, wavelength $L$ and wavenumber $k=2\pi/L$. Useful measures of depth and nonlinearity are</p>
        <div class="equation">$$kh,\qquad \frac{kH}{2},\qquad \frac{H}{h},\qquad Ur=\frac{HL^2}{h^3}.$$</div>
        <p><strong>Airy theory</strong> is the linear, first-order solution. It is useful when wave height and steepness are small. <strong>Stokes theory</strong> adds higher harmonics and is best suited to waves that are not especially long or high. <strong>Cnoidal theory</strong> describes long waves in shallow water and tends towards the solitary-wave form as wavelength becomes very large.</p>
        <p>Fenton describes an approximate Stokes–cnoidal boundary at $Ur\approx40$, equivalent to a Stokes–Ursell number near one half. This is a guide rather than a discontinuous physical boundary. For high waves, or where accurate kinematics and pressures are important, a numerical <strong>Fourier or stream-function solution</strong> is generally preferable to either truncated analytical expansion.</p>
        <p>The Fourier/stream-function model solves nonlinear free-surface conditions using a finite Fourier series and Newton iteration. It applies across a wide range of relative depths, but the steady-wave idealisation remains limited to periodic, non-breaking waves over constant depth. Cases at or beyond breaking should be treated using a model appropriate to transformation, dissipation and breaking.</p>
        <p><strong>References</strong><br />Fenton, J. D. (2022). <em>Use of the programs FOURIER, CNOIDAL and STOKES for steady waves.</em><br />Ducrozet, G. et al. (2019). CN-Stream: Open-source library for nonlinear regular waves using stream function theory.</p>
      </div>
    </article>
  </section>
</template>
