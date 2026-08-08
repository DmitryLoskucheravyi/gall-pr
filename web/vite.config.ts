import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// HTTPS is off for now — plain HTTP while we're in dev, matching the backend.
// See the note in backend/src/main.ts for what this was for and how to put it
// back. Both sides have to move together: an HTTPS page cannot call an HTTP
// API, the browser blocks it as mixed content.
//
// import fs from 'fs'
//
// const certDir = path.resolve(__dirname, '../backend/cert')
// const keyPath = path.join(certDir, 'key.pem')
// const certPath = path.join(certDir, 'cert.pem')
// const hasCert = fs.existsSync(keyPath) && fs.existsSync(certPath)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to all interfaces (not just localhost) so the dev server is
    // reachable from other devices on the LAN, e.g. a phone.
    host: true,
    // https: hasCert
    //   ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    //   : undefined,
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
