<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import renderMathInElement from 'katex/contrib/auto-render'
import 'katex/dist/katex.min.css'
import PlotlyChart from '../../../components/PlotlyChart.vue'
import {
  calculateLinearWave,
  orbitalProfile,
  validateLinearWaveInput,
  type LinearWaveInput,
} from '../../../engineering/waves/linearWave'
import {
  buildSweep,
  currentSweepPoint,
  sweepInputLabels,
  sweepInputUnits,
  sweepOutputLabels,
  sweepOutputUnits,
  type SweepInput,
  type SweepOutput,
} from './series'

const STORAGE_KEY = 'marine-calculators:linear-wave:v1'
const defaults: LinearWaveInput = { waveHeight: 2, wavePeriod: 12, waterDepth: 100 }

function loadInitial(): LinearWaveInput {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Partial<LinearWaveInput>
    const candidate = { ...defaults, ...value }
    validateLinearWaveInput(candidate)
    return candidate
  } catch {
    return { ...defaults }
  }
}

const input = reactive<LinearWaveInput>(loadInitial())
const sweepInput = ref<SweepInput>('wavePeriod')
const sweepOutput = ref<SweepOutput>('celerity')

watch(input, (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })

const error = computed(() => {
  try {
    validateLinearWaveInput(input)
    return ''
  } catch (reason) {
    return reason instanceof Error ? reason.message : 'Invalid input'
  }
})

const result = computed(() => error.value ? null : calculateLinearWave(input))
const profile = computed(() => error.value ? [] : orbitalProfile(input))
const sweep = computed(() => error.value ? [] : buildSweep(input, sweepInput.value, sweepOutput.value))
const currentPoint = computed(() => error.value ? null : currentSweepPoint(input, sweepInput.value, sweepOutput.value))

const velocityData = computed(() => [{
  x: profile.value.map((point) => point.velocity),
  y: profile.value.map((point) => point.heightAboveBed),
  type: 'scatter' as const,
  mode: 'lines' as const,
  line: { color: '#0879bd', width: 2 },
  hovertemplate: 'Height: %{y:.2f} m<br>Velocity: %{x:.4f} m/s<extra></extra>',
}, {
  x: profile.value.map((point) => -point.velocity),
  y: profile.value.map((point) => point.heightAboveBed),
  type: 'scatter' as const,
  mode: 'lines' as const,
  line: { color: '#f47a00', width: 2 },
  hovertemplate: 'Height: %{y:.2f} m<br>Velocity: %{x:.4f} m/s<extra></extra>',
}])

const excursionData = computed(() => [{
  x: profile.value.map((point) => point.excursion / 2),
  y: profile.value.map((point) => point.heightAboveBed),
  type: 'scatter' as const,
  mode: 'lines' as const,
  line: { color: '#0879bd', width: 2 },
  hovertemplate: 'Height: %{y:.2f} m<br>Semi-excursion: %{x:.4f} m<extra></extra>',
}, {
  x: profile.value.map((point) => -point.excursion / 2),
  y: profile.value.map((point) => point.heightAboveBed),
  type: 'scatter' as const,
  mode: 'lines' as const,
  line: { color: '#f47a00', width: 2 },
  hovertemplate: 'Height: %{y:.2f} m<br>Semi-excursion: %{x:.4f} m<extra></extra>',
}])

const sweepData = computed(() => currentPoint.value ? [
  {
    x: sweep.value.map((point) => point.x),
    y: sweep.value.map((point) => point.y),
    type: 'scatter' as const,
    mode: 'lines' as const,
    line: { color: '#0879bd', width: 2 },
    hovertemplate: `${sweepInputLabels[sweepInput.value]}: %{x:.3f} ${sweepInputUnits[sweepInput.value]}<br>${sweepOutputLabels[sweepOutput.value]}: %{y:.4g} ${sweepOutputUnits[sweepOutput.value]}<extra></extra>`,
  },
  {
    x: [currentPoint.value.x],
    y: [currentPoint.value.y],
    type: 'scatter' as const,
    mode: 'markers' as const,
    marker: { color: '#102a43', size: 10 },
    hovertemplate: `Current<br>${sweepInputLabels[sweepInput.value]}: %{x:.3f} ${sweepInputUnits[sweepInput.value]}<br>${sweepOutputLabels[sweepOutput.value]}: %{y:.4g} ${sweepOutputUnits[sweepOutput.value]}<extra></extra>`,
  },
] : [])

const number = new Intl.NumberFormat('en-NZ', { maximumFractionDigits: 0 })
const fixed = (value: number, digits: number) => value.toFixed(digits)

onMounted(async () => {
  await nextTick()
  const background = document.querySelector('.background-body')
  if (background) {
    renderMathInElement(background as HTMLElement, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
    })
  }
})
</script>

<template>
  <section class="calculator" aria-labelledby="calculator-title">
    <div class="calculator-heading">
      <div><h1 id="calculator-title">Linear Wave Theory</h1></div>
    </div>

    <div class="calculator-grid">
      <article class="panel input-panel">
        <div class="panel-title input-title"><h2>Input</h2></div>
        <label>
          Wave height <span>m</span>
          <input v-model.number="input.waveHeight" type="number" min="0" max="100" step="0.1" />
        </label>
        <label>
          Wave period <span>s</span>
          <input v-model.number="input.wavePeriod" type="number" min="0.01" max="25" step="0.1" />
        </label>
        <label>
          Water depth <span>m</span>
          <input v-model.number="input.waterDepth" type="number" min="0.01" max="6000" step="0.1" />
        </label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </article>

      <article class="panel output-panel">
        <div class="panel-title output-title"><h2>Output</h2></div>
        <dl v-if="result" class="results">
          <div class="primary-result"><dt>Relative depth</dt><dd>{{ result.relativeDepth }}</dd></div>
          <div><dt>Offshore wave height</dt><dd>{{ fixed(result.offshoreWaveHeight, 2) }} <small>m</small></dd></div>
          <div><dt>Wave celerity</dt><dd>{{ fixed(result.celerity, 2) }} <small>m/s</small></dd></div>
          <div><dt>Group celerity</dt><dd>{{ fixed(result.groupCelerity, 2) }} <small>m/s</small></dd></div>
          <div><dt>Wavelength</dt><dd>{{ fixed(result.wavelength, 2) }} <small>m</small></dd></div>
          <div><dt>Energy density</dt><dd>{{ number.format(result.energyDensity) }} <small>J/m²</small></dd></div>
          <div><dt>Energy flux</dt><dd>{{ number.format(result.energyFlux) }} <small>W/m</small></dd></div>
          <div><dt>Max. bed orbital velocity</dt><dd>{{ fixed(result.maximumBedOrbitalVelocity, 4) }} <small>m/s</small></dd></div>
        </dl>
      </article>

      <article class="panel charts-panel">
        <div class="panel-title graphical-title"><h2>Graphical</h2></div>
        <div class="graphical-body">
          <div class="chart-grid top-charts">
            <PlotlyChart :data="velocityData" :layout="{ xaxis: { title: { text: 'Max Horizontal Orbital Velocity (m/s)' } }, yaxis: { title: { text: 'Height Above Seabed (m)' } }, showlegend: false }" />
            <PlotlyChart :data="excursionData" :layout="{ xaxis: { title: { text: 'Max Horizontal Excursion (m)' } }, yaxis: { title: { text: 'Height Above Seabed (m)' } }, showlegend: false }" />
          </div>
          <div class="graphical-lower">
            <PlotlyChart :data="sweepData" :layout="{ xaxis: { title: { text: sweepInputLabels[sweepInput] } }, yaxis: { title: { text: sweepOutputLabels[sweepOutput] } }, showlegend: false }" />
            <div class="select-row">
              <label>Input<select v-model="sweepInput"><option v-for="(label, key) in sweepInputLabels" :key="key" :value="key">{{ label }}</option></select></label>
              <label>Output<select v-model="sweepOutput"><option v-for="(label, key) in sweepOutputLabels" :key="key" :value="key">{{ label }}</option></select></label>
            </div>
          </div>
        </div>
      </article>
    </div>

    <article class="background-panel">
      <div class="background-title"><h2>Background</h2><span aria-hidden="true">−</span></div>
      <div class="background-body">
        <p>Relative depth is defined as “Deep” when the water depth $z &gt; 0.5L$, “Intermediate” when $0.5L &gt; z &gt; 0.05L$, and “Shallow” when $z &lt; 0.05L$. Wave breaking occurs in shallow water when $H/z &gt; 0.78$ (where $H$ is wave height), or in deeper water when $H/L &gt; 0.17$.</p>
        <p>Wave celerity ($C$) is defined as</p>
        <div class="equation">$$C = \sqrt{\frac{g}{k}\tanh(kz)}$$</div>
        <p>where the wavenumber $k = \frac{2\pi}{L}$.</p>
        <p>The wavelength ($L$) is calculated using the method of Fenton &amp; McKee (1990):</p>
        <div class="equation">$$L = L_0\left(\tanh\left[\left(2\pi\frac{\sqrt{z/g}}{T}\right)^{3/2}\right]\right)^{2/3}$$</div>
        <p>where the deep-water wavelength $L_0 = \frac{gT^2}{2\pi}$.</p>
        <p>Group celerity ($C_g$) is defined as</p>
        <div class="equation">$$C_g = nC, \qquad n = \frac{1}{2}\left(1 + \frac{2kz}{\sinh(2kz)}\right)$$</div>
        <p>Wave energy density ($E$) and wave energy flux ($P$) are defined as</p>
        <div class="equation">$$E = \frac{1}{8}\rho gH^2, \qquad P = EC_g$$</div>
        <p>At height $h$ above the seabed, maximum horizontal wave orbital velocity ($u_{max}$) is given by</p>
        <div class="equation">$$u_{max}(h) = \frac{\pi H}{T}\frac{\cosh(kh)}{\sinh(kz)}$$</div>
        <p>At the seabed, where $h=0$, this reduces to $u_b = \frac{H\pi}{T\sinh(kz)}$.</p>
        <p>See the Wave Shoaling and Refraction calculator for the shoaling coefficient used to calculate offshore wave height.</p>
        <p><strong>References</strong><br />Fenton, J. D., &amp; McKee, W. D. (1990). On calculating the lengths of water waves. <em>Coastal Engineering, 14</em>(6), 499–513.<br />Airy, G. B. (1841). Tides and waves. In H. J. Rose et al. (eds.), <em>Encyclopaedia Metropolitana: Mixed Sciences</em>, Vol. 3.</p>
      </div>
    </article>
  </section>
</template>
