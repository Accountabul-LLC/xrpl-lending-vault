import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    environmentOptions: {
      // session tests need localStorage; vitest node provides a stub via happy-dom if configured
    }
  }
})
