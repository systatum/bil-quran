import { expect, test } from "@playwright/test"
import { FINGERPRINT_KEY } from "@services/fingerprinter"
import { clearBrowserStorage, untilUsable } from "./tools/state"

test.describe("Bootstrap", () => {
  test.describe("next load", () => {
    test("does not re-seed the database", async ({ page }) => {
      test.setTimeout(3 * 60_000)

      // first load seeds everything
      await page.goto("/")
      await untilUsable(page)

      // second load
      await page.reload()
      await untilUsable(page)

      // ensure no re-read of the chapters data
      let reseeded = false
      await page.route("**/quran/chapters.json", (route) => {
        reseeded = true
        return route.continue()
      })

      await page.reload()
      await untilUsable(page)

      expect(reseeded).toBe(false)

      // fingerprints must be non-empty — an empty object would cause the next
      // load to treat the DB as stale and wipe it.
      const fingerprintCount = await page.evaluate((key) => {
        const raw = localStorage.getItem(key)
        if (!raw) return 0
        try {
          return Object.keys(JSON.parse(raw)).length
        } catch {
          return 0
        }
      }, FINGERPRINT_KEY)
      expect(fingerprintCount).toBeGreaterThan(0)

      const chapterCount = await page.evaluate(async () => {
        const result = await (window as any).__repo.chapters.count()
        return result.succeed ? result.data : 0
      })
      expect(chapterCount).toBe(114)

      const wordCount = await page.evaluate(async () => {
        const result = await (window as any).__repo.words.count()
        return result.succeed ? result.data : 0
      })
      expect(wordCount).toBeGreaterThan(0)
    })
  })

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
