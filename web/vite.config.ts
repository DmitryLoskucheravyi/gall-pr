import { defineConfig, loadEnv } from 'vite'
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

// The hostname this machine is reached by in development, taken from the API
// URL rather than written down here — it's the same machine, and it differs
// per developer, so hardcoding one person's tailnet name in a committed file
// would be wrong.
function devHostFrom(apiUrl: string | undefined): string | null {
  if (!apiUrl) return null

  try {
    const { hostname } = new URL(apiUrl)
    // localhost needs no entry: Vite allows it by default.
    return hostname === 'localhost' || hostname === '127.0.0.1' ? null : hostname
  } catch {
    return null
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname)
  const devHost = devHostFrom(env.VITE_API_URL)

  return {
    plugins: [react()],
    server: {
      // Bind to all interfaces (not just localhost) so the dev server is
      // reachable from other devices on the tailnet, e.g. a phone.
      host: true,
      https: hasCert
        ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
        : undefined,
      // Vite refuses requests whose Host header it doesn't recognise, as a
      // guard against DNS rebinding. Pages and modules still load over the
      // tailnet name, but the HMR websocket upgrade is rejected with a 400 —
      // which is why hot reload kept failing while the site itself worked.
      // Naming the host here is what closes that gap.
      ...(devHost ? { allowedHosts: [devHost] } : {}),
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
  }
})
