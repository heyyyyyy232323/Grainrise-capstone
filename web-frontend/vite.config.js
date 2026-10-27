import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
      },
    },
    // Use polling instead of native file-system events.
    // This prevents the "UNKNOWN: unknown error, read" crash
    // that occurs when the project is on OneDrive on Windows.
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  optimizeDeps: {
    include: ['tesseract.js'],
    exclude: ['@mediapipe/tasks-vision'],
  },
  assetsInclude: ['**/*.wasm'],
})
