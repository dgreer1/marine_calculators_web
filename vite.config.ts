import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/marine_calculators_web/',
  plugins: [vue()],
  test: {
    environment: 'jsdom',
  },
})
