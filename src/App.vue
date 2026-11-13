<script setup lang="ts">
import { ref } from 'vue'
import LinearWaveCalculator from './calculators/waves/linear-wave/LinearWaveCalculator.vue'
import ShoalingRefractionCalculator from './calculators/waves/shoaling-refraction/ShoalingRefractionCalculator.vue'
import StokesDriftCalculator from './calculators/waves/stokes-drift/StokesDriftCalculator.vue'
import WindHolthuijsenCalculator from './calculators/waves/wind-holthuijsen/WindHolthuijsenCalculator.vue'
import WindCarterCalculator from './calculators/waves/wind-carter/WindCarterCalculator.vue'
import CycloneWavesCalculator from './calculators/waves/cyclone-waves/CycloneWavesCalculator.vue'
import RemainingCalculator, { type RemainingId } from './calculators/RemainingCalculator.vue'

type CalculatorId = 'linear-wave' | 'shoaling-refraction' | 'stokes-drift' | 'wind-holthuijsen' | 'wind-carter' | 'cyclone-waves' | RemainingId
const activeCalculator = ref<CalculatorId>('linear-wave')
const menusSuppressed = ref(false)

function selectCalculator(id: CalculatorId) {
  activeCalculator.value = id
  menusSuppressed.value = true
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
    <nav :class="{ 'menus-suppressed': menusSuppressed }" aria-label="Primary navigation" @mouseleave="menusSuppressed = false">
      <a href="#">Home</a>
      <div class="nav-menu">
        <button class="active" type="button">Waves <span>▾</span></button>
        <div class="nav-dropdown">
          <button type="button" @click="selectCalculator('linear-wave')">Linear Wave Theory</button>
          <button type="button" @click="selectCalculator('shoaling-refraction')">Wave Shoaling and Refraction</button>
          <button type="button" @click="selectCalculator('stokes-drift')">Stokes Drift</button>
          <button type="button" @click="selectCalculator('wind-holthuijsen')">Wind Waves (Holthuijsen, 2006)</button>
          <button type="button" @click="selectCalculator('wind-carter')">Wind Waves (Carter, 1982)</button>
          <button type="button" @click="selectCalculator('cyclone-waves')">Cyclone Waves</button>
          <button type="button" @click="selectCalculator('wave-setup')">Wave Setup &amp; Runup</button>
          <button type="button" @click="selectCalculator('fringe-setup')">Wind &amp; Wave Setup on a Fringing Reef</button>
        </div>
      </div>
      <div class="nav-menu"><button type="button">Sediment Transport <span>▾</span></button><div class="nav-dropdown">
        <button type="button" @click="selectCalculator('fall-velocity')">Fall Velocity</button>
        <button type="button" @click="selectCalculator('bed-shear')">Bed Shear Stress</button>
        <button type="button" @click="selectCalculator('critical-current')">Critical Current Speed</button>
        <button type="button" @click="selectCalculator('critical-shear')">Critical Bed Shear Stress</button>
        <button type="button" @click="selectCalculator('critical-orbital')">Critical Bed Orbital Velocity</button>
        <button type="button" @click="selectCalculator('beach-slope')">Beach-Face Slope</button>
        <button type="button" @click="selectCalculator('sediment-density')">Sediment Density and Porosity</button>
      </div></div>
      <div class="nav-menu"><button type="button">Water Level <span>▾</span></button><div class="nav-dropdown"><button type="button" @click="selectCalculator('wind-setup')">Wind Setup in an Enclosed Water Body</button></div></div>
      <div class="nav-menu"><button type="button">Engineering <span>▾</span></button><div class="nav-dropdown">
        <button type="button" @click="selectCalculator('rock-sizing')">Rock Sizing for Sea Dikes and Revetments</button>
        <button type="button" @click="selectCalculator('overtopping')">Runup/Overtopping of Revetments</button>
        <button type="button" @click="selectCalculator('submerged-breakwater')">Transmission over Submerged Breakwater</button>
        <button type="button" @click="selectCalculator('reef-balls')">Transmission over Reef Balls</button>
      </div></div>
    </nav>
  </header>

  <main>
    <LinearWaveCalculator v-if="activeCalculator === 'linear-wave'" />
    <ShoalingRefractionCalculator v-else-if="activeCalculator === 'shoaling-refraction'" />
    <StokesDriftCalculator v-else-if="activeCalculator === 'stokes-drift'" />
    <WindHolthuijsenCalculator v-else-if="activeCalculator === 'wind-holthuijsen'" />
    <WindCarterCalculator v-else-if="activeCalculator === 'wind-carter'" />
    <CycloneWavesCalculator v-else-if="activeCalculator === 'cyclone-waves'" />
    <RemainingCalculator v-else :key="activeCalculator" :id="activeCalculator as RemainingId" />
  </main>

  <footer id="about">
    <p>Results are engineering aids and should be checked for the intended application.</p>
  </footer>
</template>
