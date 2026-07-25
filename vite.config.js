import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Absolute URLs are required in og:/twitter: tags, so the canonical origin has to be
// baked in at build time. Set SITE_URL in the host's build environment when the domain
// changes; artist pages additionally get theirs rewritten per-request by worker/index.ts.
const SITE_URL = (process.env.SITE_URL || 'https://greenroom-exchange.workers.dev').replace(/\/$/, '')

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
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
})
