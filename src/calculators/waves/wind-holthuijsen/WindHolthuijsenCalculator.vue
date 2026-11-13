<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import renderMathInElement from 'katex/contrib/auto-render'
import PlotlyChart from '../../../components/PlotlyChart.vue'
import { holthuijsen, validateHolthuijsen, type HolthuijsenInput } from '../../../engineering/waves/windWaves'
import { linspace } from '../../../engineering/numeric'

type InputKey = keyof HolthuijsenInput
type OutputKey = 'significantWaveHeight' | 'peakPeriod' | 'developmentTime'
const inputLabels: Record<InputKey, string> = { windSpeed: 'Wind Speed', fetch: 'Fetch', waterDepth: 'Depth' }
const inputUnits: Record<InputKey, string> = { windSpeed: 'm/s', fetch: 'km', waterDepth: 'm' }
const outputLabels: Record<OutputKey, string> = { significantWaveHeight: 'Hs', peakPeriod: 'Tp', developmentTime: 'Time Until Fetch Limited' }
const outputUnits: Record<OutputKey, string> = { significantWaveHeight: 'm', peakPeriod: 's', developmentTime: 'hours' }
const defaults: HolthuijsenInput = { windSpeed: 10, fetch: 10, waterDepth: 10 }
const input = reactive<HolthuijsenInput>({ ...defaults, ...JSON.parse(localStorage.getItem('marine-calculators:wind-holthuijsen:v1') ?? '{}') })
const sweepInput = ref<InputKey>('windSpeed'); const sweepOutput = ref<OutputKey>('significantWaveHeight')
watch(input, value => localStorage.setItem('marine-calculators:wind-holthuijsen:v1', JSON.stringify(value)), { deep: true })
const error = computed(() => { try { validateHolthuijsen(input); return '' } catch (e) { return e instanceof Error ? e.message : 'Invalid input' } })
const result = computed(() => error.value ? null : holthuijsen(input))
const sweep = computed(() => {
  if (!result.value) return []
  const current = input[sweepInput.value]
  const lower = sweepInput.value === 'windSpeed' || sweepInput.value === 'fetch' ? Math.max(current * 0.01, 0.001) : current / 2
  return linspace(lower, Math.max(current * 2, lower * 2), 100).map(x => ({ x, y: holthuijsen({ ...input, [sweepInput.value]: x })[sweepOutput.value] }))
})
const chartData = computed(() => result.value ? [{ x: sweep.value.map(p => p.x), y: sweep.value.map(p => p.y), type: 'scatter' as const, mode: 'lines' as const, line: { color: '#0879bd', width: 2 }, hovertemplate: `%{x:.2f} ${inputUnits[sweepInput.value]}<br>%{y:.3f} ${outputUnits[sweepOutput.value]}<extra></extra>` }, { x: [input[sweepInput.value]], y: [result.value[sweepOutput.value]], type: 'scatter' as const, mode: 'markers' as const, marker: { color: '#111', size: 9 }, hovertemplate: `Current: %{y:.3f} ${outputUnits[sweepOutput.value]}<extra></extra>` }] : [])
onMounted(async () => { await nextTick(); const el = document.querySelector('.holthuijsen-background'); if (el) renderMathInElement(el as HTMLElement, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }) })
</script>

<template><section class="calculator" aria-labelledby="holthuijsen-title">
  <div class="calculator-heading"><h1 id="holthuijsen-title">Fetch Limited Waves (Holthuijsen, 2006)</h1></div>
  <div class="calculator-grid compact-calculator-grid">
    <article class="panel input-panel"><div class="panel-title input-title"><h2>Input</h2></div><label>Wind Speed <span>(m/s)</span><input v-model.number="input.windSpeed" type="number" min="0.01" max="35" step="0.1" /></label><label>Fetch <span>(km)</span><input v-model.number="input.fetch" type="number" min="0" max="10000" step="1" /></label><label>Depth <span>(m)</span><input v-model.number="input.waterDepth" type="number" min="0.01" max="10000" step="0.1" /></label><p v-if="error" class="error">{{ error }}</p></article>
    <article class="panel output-panel"><div class="panel-title output-title"><h2>Output</h2></div><dl v-if="result" class="results"><div><dt>Significant Wave Height (<i>H</i><sub>s</sub>)</dt><dd>{{ result.significantWaveHeight.toFixed(2) }} m</dd></div><div><dt>Peak Period (<i>T</i><sub>p</sub>)</dt><dd>{{ result.peakPeriod.toFixed(2) }} s</dd></div><div><dt>Time Until Fetch Limited</dt><dd>{{ result.developmentTime.toFixed(2) }} hours</dd></div></dl></article>
    <article class="panel charts-panel"><div class="panel-title graphical-title"><h2>Graphical</h2></div><div class="graphical-body single-graphical-body"><PlotlyChart :data="chartData" :layout="{ xaxis: { title: { text: `${inputLabels[sweepInput]} (${inputUnits[sweepInput]})` } }, yaxis: { title: { text: `${outputLabels[sweepOutput]} (${outputUnits[sweepOutput]})` } }, showlegend: false }" /><div class="select-row"><label>Input<select v-model="sweepInput"><option v-for="(label,key) in inputLabels" :key="key" :value="key">{{ label }}</option></select></label><label>Output<select v-model="sweepOutput"><option v-for="(label,key) in outputLabels" :key="key" :value="key">{{ label }}</option></select></label></div></div></article>
  </div>
  <article class="background-panel"><div class="background-title"><h2>Background</h2><span>−</span></div><div class="background-body holthuijsen-background"><p>The Breugem and Holthuijsen formulation accounts for wind speed ($U_{10}$), fetch ($F$) and water depth ($h$).</p><div class="equation">$$H_s=\frac{0.2433U_{10}^2}{g}\left[D_H\tanh\left(\frac{F_H}{D_H}\right)\right]^{0.572}$$</div><div class="equation">$$D_H=\tanh\left[0.343\left(\frac{gh}{U_{10}^2}\right)^{1.14}\right],\quad F_H=0.000414\left(\frac{gF}{U_{10}^2}\right)^{0.79}$$</div><div class="equation">$$T_p=\frac{7.69U_{10}}{g}\left[D_T\tanh\left(\frac{F_T}{D_T}\right)\right]^{0.187}$$</div><div class="equation">$$D_T=\tanh\left[0.1\left(\frac{gh}{U_{10}^2}\right)^{2.01}\right],\quad F_T=2.77\times10^{-7}\left(\frac{gF}{U_{10}^2}\right)^{1.45}$$</div><p>The development time follows the Coastal Engineering Manual expression used in the original application.</p><p><strong>Reference</strong><br />Breugem, W. A., &amp; Holthuijsen, L. H. (2007). Generalized shallow water wave growth from Lake George. <em>Journal of Waterway, Port, Coastal, and Ocean Engineering, 133</em>(3), 173–182.</p></div></article>
</section></template>
