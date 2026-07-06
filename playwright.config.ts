import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: "list",
  // 2 workers share CPU; a 22s test can take ~44s under load.
  // Individual long tests override this via test.setTimeout().
  timeout: 120_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Extra margin for when 2 workers share CPU — tests that take ~22s in
    // isolation can take ~44s under contention.
    actionTimeout: 60_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], headless: true } },
  ],
  webServer: {
    command: "E2E=true pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
})
