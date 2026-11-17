import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'
import { initAnalytics } from './analytics'

initAnalytics()
createApp(App).mount('#app')

// Prompt an existing R Shinylive registration to fetch our self-removing worker.
if ('serviceWorker' in navigator) {
  const scope = new URL(import.meta.env.BASE_URL, window.location.origin).href
  void navigator.serviceWorker.getRegistration(scope).then((registration) => {
    if (registration?.scope === scope) return registration.update()
  }).catch((error: unknown) => console.warn('Could not retire the legacy calculator worker', error))
}
