import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // e2e/ is Playwright's; it uses a different runner and must not be collected here.
    include: ['src/**/*.test.{js,jsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
  },
})
