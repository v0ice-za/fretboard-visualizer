import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // Dev proxy: relative /api calls hit the backend same-origin, so the refresh cookie
  // works with SameSite=Lax over http and VITE_API_URL stays empty in dev.
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
