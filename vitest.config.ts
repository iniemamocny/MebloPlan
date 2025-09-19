import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}']
  }
})
