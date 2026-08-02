import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Reuses the backend's dev cert (see backend/src/main.ts) so both origins
// share one self-signed CA to trust on a test device. Optional: falls back
// to plain HTTP if it's missing, same as the backend does.
const certDir = path.resolve(__dirname, '../backend/cert')
const keyPath = path.join(certDir, 'key.pem')
const certPath = path.join(certDir, 'cert.pem')
const hasCert = fs.existsSync(keyPath) && fs.existsSync(certPath)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to all interfaces (not just localhost) so the dev server is
    // reachable from other devices on the LAN, e.g. a phone.
    host: true,
    https: hasCert
      ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
      : undefined,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables" as *; @use "@/styles/mixins" as *;`,
      },
    },
  },
})
