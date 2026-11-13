<script setup lang="ts">
import LinearWaveCalculator from './calculators/waves/linear-wave/LinearWaveCalculator.vue'
</script>

<template>
  <header class="site-header">
    <div class="banner">
      <img src="/images/howth-panorama.jpg" alt="Panoramic coastal view from Howth" />
      <div class="banner-title">Marine Calculators</div>
    </div>
    <nav aria-label="Primary navigation">
      <a href="#">Home</a>
      <a class="active" href="#calculator-title">Waves <span>▾</span></a>
      <a href="#calculator-title">Sediment Transport <span>▾</span></a>
      <a href="#calculator-title">Water Level <span>▾</span></a>
      <a href="#calculator-title">Engineering <span>▾</span></a>
    </nav>
  </header>

  <main>
    <LinearWaveCalculator />
  </main>

  <footer id="about">
    <p>Results are engineering aids and should be checked for the intended application.</p>
  </footer>
</template>
