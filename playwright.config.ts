import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config — side_effects.art smoke suite.
 *
 * Single chromium project (no Firefox/Webkit — overkill for smoke).
 * Launches its own `next dev` server on :3000 via `webServer`. Reuses
 * any existing dev server locally so the workflow stays fast; on CI
 * the runner always starts a fresh one.
 *
 * Tests live in `tests/e2e/`. `npm test` runs the suite. Reports drop
 * into `playwright-report/`; raw artifacts (traces, screenshots,
 * videos) into `test-results/`. Both are gitignored.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Local: 2 workers — el dev server de Next es single-threaded y las
  // páginas con WebGL pesado (SF-01, playground) saturan si lanzamos
  // 8-10 browsers concurrentes. CI: 1 worker porque retry-on-failure
  // mantiene los traces limpios.
  workers: process.env.CI ? 1 : 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
