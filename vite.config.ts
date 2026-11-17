import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd()), ...process.env }
  const sourceSite = 'https://dgreer1.github.io/marine_calculators_web/'
  const siteUrl = new URL(env.VITE_SITE_URL || 'https://dgreer1.github.io/marine_calculators_web/').href
  return {
    base: env.VITE_BASE_PATH || '/marine_calculators_web/',
    plugins: [
      vue(),
      {
        name: 'deployment-site-metadata',
        apply: 'build',
        writeBundle(options) {
          for (const name of ['index.html', 'robots.txt', 'sitemap.xml', 'llms.txt']) {
            const path = resolve(options.dir!, name)
            const content = readFileSync(path, 'utf8')
            writeFileSync(path, content.replaceAll(sourceSite, siteUrl))
          }
        },
      },
    ],
    test: {
      environment: 'jsdom',
    },
  }
})
