import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  // GitHub Pages serves from /<repo>/; local dev and other hosts keep '/'
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), nodePolyfills({ globals: { Buffer: true, global: true, process: true } })],
  server: {
    port: 5173,
    host: true,
    // Allow Cloudflare quick tunnels / localtunnel previews during demos
    allowedHosts: true
  }
})
