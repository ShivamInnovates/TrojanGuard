import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),   // Tailwind v4 — no postcss.config.js needed
  ],
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api/* calls to the FastAPI backend (configurable via BACKEND_PORT, default 8000)
      '/api': {
        target: `http://127.0.0.1:${process.env.BACKEND_PORT || 8000}`,
        changeOrigin: true,
      },
    },
  },
})
