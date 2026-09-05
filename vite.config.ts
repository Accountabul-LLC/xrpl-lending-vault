/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), nodePolyfills({ globals: { Buffer: true, global: true, process: true } })],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
