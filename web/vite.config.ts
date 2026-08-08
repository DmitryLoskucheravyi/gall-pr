import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Serves over the Tailscale certificate in backend/cert — a real Let's Encrypt
// cert for this machine's tailnet name, so a phone on the same tailnet opens
// the dev site with no warning and gets a genuine secure context. That last
// part is the point: Secure cookies don't set over plain HTTP, and http://
// on a LAN IP is not a secure context the way http://localhost is.
//
// Optional, as before: without the cert files this falls back to plain HTTP.
// Note the cert only covers the tailnet name, so reach the dev server by that
// name rather than localhost — https://localhost:5173 would be a name mismatch.
const certDir = path.resolve(__dirname, '../backend/cert')
const keyPath = path.join(certDir, 'key.pem')
const certPath = path.join(certDir, 'cert.pem')
const hasCert = fs.existsSync(keyPath) && fs.existsSync(certPath)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to all interfaces (not just localhost) so the dev server is
    // reachable from other devices on the tailnet, e.g. a phone.
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
