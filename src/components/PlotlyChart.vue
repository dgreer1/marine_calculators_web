<script setup lang="ts">
import type Plotly from 'plotly.js-dist-min'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  data: Plotly.Data[]
  layout: Partial<Plotly.Layout>
}>()

const element = ref<HTMLDivElement>()
let plotly: typeof Plotly | undefined

async function render() {
  if (!element.value) return
  plotly ??= (await import('plotly.js-dist-min')).default
  await plotly.react(element.value, props.data, {
    ...props.layout,
    autosize: true,
    margin: { l: 58, r: 18, t: 24, b: 52, ...props.layout.margin },
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    font: { family: 'Arial, sans-serif', color: '#111111' },
    xaxis: { showline: true, showgrid: true, tickmode: 'auto', nticks: 7, ticks: 'outside', mirror: true, linecolor: '#111111', linewidth: 1, gridcolor: '#dedede', gridwidth: 1, zerolinecolor: '#777777', minor: { showgrid: true, gridcolor: '#f0f0f0', ticks: 'outside' }, ...props.layout.xaxis },
    yaxis: { showline: true, showgrid: true, tickmode: 'auto', nticks: 7, ticks: 'outside', mirror: true, linecolor: '#111111', linewidth: 1, gridcolor: '#dedede', gridwidth: 1, zerolinecolor: '#777777', minor: { showgrid: true, gridcolor: '#f0f0f0', ticks: 'outside' }, ...props.layout.yaxis },
  }, {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  })
}

onMounted(render)
watch(() => [props.data, props.layout], render, { deep: true })
onBeforeUnmount(() => {
  if (element.value && plotly) plotly.purge(element.value)
})
</script>

<template>
  <div ref="element" class="plot" />
</template>
