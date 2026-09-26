import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Use polling instead of native file-system events.
    // This prevents the "UNKNOWN: unknown error, read" crash
    // that occurs when the project is on OneDrive on Windows.
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
})