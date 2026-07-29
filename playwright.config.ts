import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end config. Kept entirely separate from vitest: `vitest.config.ts` only includes
 * `src/**\/*.test.ts`, and these specs live in `e2e/*.spec.ts`, so the two runners never
 * pick up each other's files.
 *
 * Note the app is served at `/app.html`, not `/` — the site root is the landing page.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5173',
    // Always record, so a passing run still leaves a video to watch. Switch to
    // 'retain-on-failure' if the artefacts get noisy.
    video: { mode: 'on', size: { width: 480, height: 640 } },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // The app is a fixed 300×500 frame plus 16px of .app padding (= 332×532). Stay above
        // both so the two @media guards in global.css don't collapse the frame to fill the
        // viewport — that path is a different layout from the one being tested.
        viewport: { width: 480, height: 640 },
      },
    },
  ],

  // Reuses the dev server that's already up; starts one otherwise.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/app.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
