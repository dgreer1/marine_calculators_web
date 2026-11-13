<script setup lang="ts">
import { ref } from 'vue'
import LinearWaveCalculator from './calculators/waves/linear-wave/LinearWaveCalculator.vue'
import ShoalingRefractionCalculator from './calculators/waves/shoaling-refraction/ShoalingRefractionCalculator.vue'
import StokesDriftCalculator from './calculators/waves/stokes-drift/StokesDriftCalculator.vue'

type CalculatorId = 'linear-wave' | 'shoaling-refraction' | 'stokes-drift'
const activeCalculator = ref<CalculatorId>('linear-wave')

function selectCalculator(id: CalculatorId) {
  activeCalculator.value = id
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  window.scrollTo({ top: 200, behavior: 'smooth' })
}
</script>

<template>
  <header class="site-header">
    <div class="banner">
      <img src="/images/howth-panorama.jpg" alt="Panoramic coastal view from Howth" />
      <div class="banner-title">Marine Calculators</div>
    </div>
    <nav aria-label="Primary navigation">
      <a href="#">Home</a>
      <div class="nav-menu">
        <button class="active" type="button">Waves <span>▾</span></button>
        <div class="nav-dropdown">
          <button type="button" @click="selectCalculator('linear-wave')">Linear Wave Theory</button>
          <button type="button" @click="selectCalculator('shoaling-refraction')">Wave Shoaling and Refraction</button>
          <button type="button" @click="selectCalculator('stokes-drift')">Stokes Drift</button>
        </div>
      </div>
      <a href="#calculator-title">Sediment Transport <span>▾</span></a>
      <a href="#calculator-title">Water Level <span>▾</span></a>
      <a href="#calculator-title">Engineering <span>▾</span></a>
    </nav>
  </header>

  <main>
    <LinearWaveCalculator v-if="activeCalculator === 'linear-wave'" />
    <ShoalingRefractionCalculator v-else-if="activeCalculator === 'shoaling-refraction'" />
    <StokesDriftCalculator v-else />
  </main>

  <footer id="about">
    <p>Results are engineering aids and should be checked for the intended application.</p>
  </footer>
</template>
