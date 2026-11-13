<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, watch } from 'vue'
import renderMathInElement from 'katex/contrib/auto-render'
import PlotlyChart from '../../../components/PlotlyChart.vue'
import { calculateStokesDrift, stokesDriftProfile, validateStokesDriftInput, type StokesDriftInput } from '../../../engineering/waves/stokesDrift'

const STORAGE_KEY = 'marine-calculators:stokes-drift:v1'
const defaults: StokesDriftInput = { waveHeight: 1, wavePeriod: 10, waterDepth: 10 }
function loadInitial(): StokesDriftInput {
  try {
    const candidate = { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') }
    validateStokesDriftInput(candidate)
    return candidate
  } catch { return { ...defaults } }
}
const input = reactive<StokesDriftInput>(loadInitial())
watch(input, value => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })
const error = computed(() => {
  try { validateStokesDriftInput(input); return '' }
  catch (reason) { return reason instanceof Error ? reason.message : 'Invalid input' }
})
const result = computed(() => error.value ? null : calculateStokesDrift(input))
const profile = computed(() => error.value ? [] : stokesDriftProfile(input))
const chartData = computed(() => [{
  x: profile.value.map(point => point.velocity), y: profile.value.map(point => point.heightAboveBed),
  type: 'scatter' as const, mode: 'lines' as const, line: { color: '#0879bd', width: 2 },
  hovertemplate: 'Height above seabed: %{y:.2f} m<br>Stokes drift: %{x:.4f} m/s<extra></extra>',
}])
onMounted(async () => {
  await nextTick()
  const background = document.querySelector('.stokes-background')
  if (background) renderMathInElement(background as HTMLElement, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false,
  })
})
</script>

<template>
  <section class="calculator" aria-labelledby="stokes-title">
    <div class="calculator-heading"><h1 id="stokes-title">Stokes Drift</h1></div>
    <div class="calculator-grid compact-calculator-grid">
      <article class="panel input-panel">
        <div class="panel-title input-title"><h2>Input</h2></div>
        <label>Wave Height <span>(m)</span><input v-model.number="input.waveHeight" type="number" min="0" max="50" step="0.1" /></label>
        <label>Wave Period <span>(s)</span><input v-model.number="input.wavePeriod" type="number" min="0.01" max="1000" step="0.1" /></label>
        <label>Water Depth <span>(m)</span><input v-model.number="input.waterDepth" type="number" min="0.01" max="5000" step="0.1" /></label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </article>
      <article class="panel output-panel">
        <div class="panel-title output-title"><h2>Output</h2></div>
        <dl v-if="result" class="results">
          <div><dt>Surface Stokes Drift (<i>U</i><sub>s</sub>)</dt><dd>{{ result.surface.toFixed(3) }} m/s</dd></div>
          <div><dt>Depth Averaged Stokes Drift (<span class="overline"><i>U</i><sub>s</sub></span>)</dt><dd>{{ result.depthAverage.toFixed(3) }} m/s</dd></div>
        </dl>
      </article>
      <article class="panel charts-panel">
        <div class="panel-title graphical-title"><h2>Graphical</h2></div>
        <div class="graphical-body">
          <PlotlyChart :data="chartData" :layout="{ xaxis: { title: { text: 'Stokes Drift (m/s)' } }, yaxis: { title: { text: 'Height Above Seabed (m)' } }, showlegend: false }" />
        </div>
      </article>
    </div>
    <article class="background-panel">
      <div class="background-title"><h2>Background</h2><span aria-hidden="true">−</span></div>
      <div class="background-body stokes-background">
        <p>Surface Stokes drift ($U_s$) is calculated as</p>
        <div class="equation">$$U_s=\frac{2H_s^2\pi^3}{gT_p^3}$$</div>
        <p>where $H_s$ is significant wave height, $T_p$ is peak period, and $g=9.81\,\mathrm{m/s^2}$.</p>
        <p>Wavelength is calculated using the Fenton &amp; McKee (1990) approximation used elsewhere in this application. The drift at depth $d$ below the surface is</p>
        <div class="equation">$$U(d)=U_se^{-2kd}, \qquad k=\frac{2\pi}{L}$$</div>
        <p>The depth-averaged drift through water depth $h$ is</p>
        <div class="equation">$$\overline{U}=\frac{U_s}{2kh}\left(1-e^{-2kh}\right)$$</div>
        <p>No account is taken of bed friction.</p>
        <p><strong>References</strong><br />Fenton, J. D., &amp; McKee, W. D. (1990). On calculating the lengths of water waves. <em>Coastal Engineering, 14</em>(6), 499–513.<br />Phillips, O. M. (1977). <em>The Dynamics of the Upper Ocean</em> (2nd ed.). Cambridge University Press.</p>
      </div>
    </article>
  </section>
</template>
