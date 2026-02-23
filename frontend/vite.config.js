import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE: Never expose MINDROUTER2_URL or MINDROUTER2_KEY as VITE_* env vars.
// All AI calls are made server-side only.

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
