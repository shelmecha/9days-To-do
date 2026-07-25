import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts: vitest bundles its own vite, and sharing one config
// makes the two copies' Plugin types collide. The unit tests are pure TS — no JSX plugin needed.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
