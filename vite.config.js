import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Absolute URLs are required in og:/twitter: tags, so the canonical origin is baked in at
// build time. Set SITE_URL in the host's build environment when the domain changes.
const SITE_URL = (process.env.SITE_URL || 'https://signalchain.pages.dev').replace(/\/$/, '')

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-site-url',
      transformIndexHtml: html => html.replaceAll('%SITE_URL%', SITE_URL),
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // The catalog is pure data and changes far more often than React does; splitting
          // it means a content edit doesn't invalidate the vendor chunk in everyone's cache.
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
