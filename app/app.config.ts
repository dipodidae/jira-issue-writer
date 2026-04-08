import { appDescription } from './constants'

export default defineAppConfig({
  head: {
    viewport: 'width=device-width,initial-scale=1',
    link: [
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'icon', type: 'image/svg+xml', href: '/nuxt.svg' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300..700&family=JetBrains+Mono:wght@400;500&display=swap' },
    ],
    meta: [
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: appDescription },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#fafafa' },
      { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#0a0a0b' },
    ],
  },

  ui: {
    colors: {
      primary: 'indigo',
      secondary: 'violet',
      neutral: 'zinc',
    },
    icons: {
      light: 'i-lucide-sun',
      dark: 'i-lucide-moon',
      system: 'i-lucide-monitor',
    },
  },
})
