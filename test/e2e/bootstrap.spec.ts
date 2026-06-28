import { expect, test } from "@playwright/test"
import { clearBrowserStorage, untilUsable } from "./tools/state"

test.describe("Bootstrap", () => {
  test.describe("error", () => {
    // initDbDriver must be tested on the very first page load in this context.
    // After the WASM compiles once, V8 serves it from its code cache on reload,
    // which bypasses Playwright's route interception entirely.
    test("problematic database driver setup", async ({ page }) => {
      await page.route("**/sql-wasm-browser.wasm", (route) => route.abort())
      await page.goto("/")
      await expect(page.getByText("Something went wrong")).toBeVisible({
        timeout: 20_000,
      })
    })

    // For seeder steps the WASM must succeed (prior steps must pass), so each
    // test lets the app fully bootstrap first, clears the DB, then faults the
    // specific step on reload.
    test.describe("after initial seed", () => {
      const SEEDER_STEPS = [
        {
          label: "applyMigrations",
          abort: "**/table_migrations/meta/_journal.json",
        },
        { label: "seedChapters", abort: "**/quran/chapters.json" },
        { label: "seedVerses", abort: "**/quran/verses/imlaei/**" },
      ] as const

      test.beforeEach(async ({ page }) => {
        test.setTimeout(2 * 60_000)
        await page.goto("/")
        await untilUsable(page)
        await clearBrowserStorage(page)
      })

      for (const { label, abort } of SEEDER_STEPS) {
        test(`shows error screen when ${label} throws`, async ({ page }) => {
          await page.route(abort, (route) => route.abort())
          await page.reload()
          await expect(page.getByText("Something went wrong")).toBeVisible({
            timeout: 20_000,
          })
        })
      }
    })
  })
})
