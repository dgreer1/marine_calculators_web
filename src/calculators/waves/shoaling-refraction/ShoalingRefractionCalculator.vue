<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import renderMathInElement from 'katex/contrib/auto-render'
import PlotlyChart from '../../../components/PlotlyChart.vue'
import { calculateShoalingRefraction, validateShoalingRefractionInput, type ShoalingRefractionInput } from '../../../engineering/waves/shoalingRefraction'
import { buildShoalingSweep, inputLabels, inputUnits, outputLabels, outputUnits, type ShoalingSweepInput, type ShoalingSweepOutput } from './series'

const STORAGE_KEY = 'marine-calculators:shoaling-refraction:v1'
const defaults: ShoalingRefractionInput = { deepWaterWaveHeight: 1, wavePeriod: 15, waterDepth: 10, deepWaterDirection: 45 }

function loadInitial(): ShoalingRefractionInput {
  try {
    const candidate = { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') }
    validateShoalingRefractionInput(candidate)
    return candidate
  } catch { return { ...defaults } }
}

const input = reactive<ShoalingRefractionInput>(loadInitial())
const sweepInput = ref<ShoalingSweepInput>('wavePeriod')
const sweepOutput = ref<ShoalingSweepOutput>('shoalingCoefficient')
watch(input, (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })

const error = computed(() => {
  try { validateShoalingRefractionInput(input); return '' }
  catch (reason) { return reason instanceof Error ? reason.message : 'Invalid input' }
})
const result = computed(() => error.value ? null : calculateShoalingRefraction(input))
const sweep = computed(() => error.value ? [] : buildShoalingSweep(input, sweepInput.value, sweepOutput.value))
const current = computed(() => result.value ? { x: input[sweepInput.value], y: result.value[sweepOutput.value] } : null)
const sweepData = computed(() => current.value ? [{
  x: sweep.value.map((point) => point.x), y: sweep.value.map((point) => point.y), type: 'scatter' as const, mode: 'lines' as const,
  line: { color: '#0879bd', width: 2 },
  hovertemplate: `${inputLabels[sweepInput.value]}: %{x:.3f} ${inputUnits[sweepInput.value]}<br>${outputLabels[sweepOutput.value]}: %{y:.4g} ${outputUnits[sweepOutput.value]}<extra></extra>`,
}, {
  x: [current.value.x], y: [current.value.y], type: 'scatter' as const, mode: 'markers' as const,
  marker: { color: '#111', size: 9 },
  hovertemplate: `Current<br>${inputLabels[sweepInput.value]}: %{x:.3f} ${inputUnits[sweepInput.value]}<br>${outputLabels[sweepOutput.value]}: %{y:.4g} ${outputUnits[sweepOutput.value]}<extra></extra>`,
}] : [])

onMounted(async () => {
  await nextTick()
  const background = document.querySelector('.shoaling-background')
  if (background) renderMathInElement(background as HTMLElement, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false,
  })
})
</script>

<template>
  <section class="calculator" aria-labelledby="shoaling-title">
    <div class="calculator-heading"><h1 id="shoaling-title">Wave Shoaling and Refraction</h1></div>
    <div class="calculator-grid compact-calculator-grid">
      <article class="panel input-panel">
        <div class="panel-title input-title"><h2>Input</h2></div>
        <label>Deep Water Wave Height <span>(m)</span><input v-model.number="input.deepWaterWaveHeight" type="number" min="0" max="20" step="0.1" /></label>
        <label>Wave Period <span>(s)</span><input v-model.number="input.wavePeriod" type="number" min="0.01" max="20" step="0.1" /></label>
        <label>Water Depth <span>(m)</span><input v-model.number="input.waterDepth" type="number" min="0.01" max="6000" step="0.1" /></label>
        <label>Wave Direction <span>(deg)</span><input v-model.number="input.deepWaterDirection" type="number" min="0" max="90" step="1" /></label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </article>

      <article class="panel output-panel">
        <div class="panel-title output-title"><h2>Output</h2></div>
        <dl v-if="result" class="results">
          <div><dt>Shoaling Coefficient (<i>K</i><sub>s</sub>)</dt><dd>{{ result.shoalingCoefficient.toFixed(4) }}</dd></div>
          <div><dt>Refraction Coefficient (<i>K</i><sub>r</sub>)</dt><dd>{{ result.refractionCoefficient.toFixed(4) }}</dd></div>
          <div><dt>Shallow Water Wave Height (<i>H</i><sub>s</sub>)</dt><dd>{{ result.shallowWaterWaveHeight.toFixed(2) }} m</dd></div>
        </dl>
      </article>

      <article class="panel charts-panel">
        <div class="panel-title graphical-title"><h2>Graphical</h2></div>
        <div class="graphical-body single-graphical-body">
          <PlotlyChart :data="sweepData" :layout="{ xaxis: { title: { text: inputLabels[sweepInput] } }, yaxis: { title: { text: outputLabels[sweepOutput] } }, showlegend: false }" />
          <div class="select-row">
            <label>Input<select v-model="sweepInput"><option v-for="(label, key) in inputLabels" :key="key" :value="key">{{ label }}</option></select></label>
            <label>Output<select v-model="sweepOutput"><option v-for="(label, key) in outputLabels" :key="key" :value="key">{{ label }}</option></select></label>
          </div>
        </div>
      </article>
    </div>

    <article class="background-panel">
      <div class="background-title"><h2>Background</h2><span aria-hidden="true">−</span></div>
      <div class="background-body shoaling-background">
        <p>Wave shoaling and refraction are calculated using the method presented in the Coastal Engineering Manual, with the inshore wave height ($H_s$) defined as</p>
        <div class="equation">$$H_s = H_0K_sK_r$$</div>
        <p>$H_0$ is the offshore (deep-water) wave height, and $K_s$ and $K_r$ are the shoaling and refraction coefficients respectively.</p>
        <div class="equation">$$K_s = \sqrt{\frac{C_{g0}}{C_g}}, \qquad C_{g0}=0.5C_0, \qquad C_0=1.56T$$</div>
        <p>$C_g$ is the nearshore group-wave celerity:</p>
        <div class="equation">$$C_g=nC, \qquad n=\frac{1}{2}\left(1+\frac{2kz}{\sinh(2kz)}\right), \qquad k=\frac{2\pi}{L}$$</div>
        <p>The wavelength ($L$) is calculated using Fenton &amp; McKee (1990):</p>
        <div class="equation">$$L=L_0\left(\tanh\left[\left(2\pi\frac{\sqrt{z/g}}{T}\right)^{3/2}\right]\right)^{2/3}, \qquad L_0=\frac{gT^2}{2\pi}$$</div>
        <p>The refraction coefficient is</p>
        <div class="equation">$$K_r=\left(\frac{1-\sin^2\theta_0}{1-\sin^2\theta_1}\right)^{1/4}$$</div>
        <p>where $sin\theta_1=C_1\sin\theta_0/C_0$, $C_1=L/T$, and $	heta_0$ is the deep-water wave direction relative to the coast.</p>
        <p><strong>References</strong><br />Fenton, J. D., &amp; McKee, W. D. (1990). On calculating the lengths of water waves. <em>Coastal Engineering, 14</em>(6), 499–513.<br />U.S. Army Corps of Engineers (2006). <em>Coastal Engineering Manual</em>, Section II-3-13.</p>
      </div>
    </article>
  </section>
</template>
