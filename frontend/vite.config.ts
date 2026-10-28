import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// During development, /api and /media are forwarded to Django on port 8000,
// so the browser never has to deal with CORS. Set API_TARGET to use another backend.
export default defineConfig(({ mode }) => {
  const api = loadEnv(mode, '.', '').API_TARGET || 'http://127.0.0.1:8000'
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': api,
        '/media': api,
      },
    },
  }
})
