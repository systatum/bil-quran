import { expect, Page, test } from "@playwright/test"
import { openSearchSheet, waitUntilVisible } from "./tools/interactivity"
import { untilUsable, visitFresh } from "./tools/state"

test.describe("SearchSheet", () => {
  test.beforeEach(async ({ page }) => await visitFresh(page))

  test("shows all searchers", async ({ page }) => {
    await openSearchSheet(page)
    await expect(page.getByText("By chapter")).toBeVisible({ timeout: 3000 })
    await expect(page.getByText("By juz (part)")).toBeVisible({
      timeout: 3000,
    })
  })

  test.describe("VerseLookup", () => {
    test("navigates to the selected verse", async ({ page }) => {
      await openSearchSheet(page)

      const combobox = page
        .locator('[role="combobox"]:not(aside *)')
        .filter({ visible: true })
        .first()
      await combobox.click()

      const drawer = page
        .locator('[aria-label="combobox-drawer"]')
        .filter({ visible: true })
      await expect(drawer).toBeVisible({ timeout: 5000 })

      // Expand chapter 1 (Al-Faatiha — 7 verses, so items appear directly)
      const chapter1 = drawer
        .locator('[aria-label="tree-list-group-title"]')
        .first()
      await chapter1.click()
      await page.waitForTimeout(200)

      // Select verse 3
      const verse3 = drawer
        .locator('[aria-label="tree-list-item"]')
        .filter({ hasText: "3" })
        .first()
      await expect(verse3).toBeVisible({ timeout: 3000 })
      await verse3.click()

      await waitUntilVisible(page.locator('[data-verse="1:3"]'), {
        timeout: 10_000,
      })
    })
  })

  test.describe("JuzLookup", () => {
    /** Opens the JuzLookup combobox (second combobox in the search sheet). */
    async function openJuzDrawer(page: Page) {
      await openSearchSheet(page)
      const combobox = page
        .locator('[role="combobox"]:not(aside *)')
        .filter({ visible: true })
        .nth(1)
      await combobox.click()
      const drawer = page
        .locator('[aria-label="combobox-drawer"]')
        .filter({ visible: true })
      await expect(drawer).toBeVisible({ timeout: 5000 })
      return drawer
    }

    test("lists all 30 juz as groups", async ({ page }) => {
      const drawer = await openJuzDrawer(page)

      const juzGroups = drawer.locator('[aria-label="tree-list-group-title"]')
      await expect(juzGroups.first()).toBeVisible({ timeout: 3000 })
      await expect(juzGroups).toHaveCount(30)
      await expect(juzGroups.first()).toHaveText("Juz 1")
      await expect(juzGroups.last()).toHaveText("Juz 30")
    })

    test("has sub-options with chapter names", async ({ page }) => {
      const drawer = await openJuzDrawer(page)

      await drawer
        .locator('[aria-label="tree-list-group-title"]')
        .first()
        .click()
      await page.waitForTimeout(200)

      const firstPage = drawer.locator('[aria-label="tree-list-item"]').first()
      await expect(firstPage).toBeVisible({ timeout: 3000 })
      await expect(firstPage).toContainText("Al-Faatiha")

      const secondPage = drawer.locator('[aria-label="tree-list-item"]').nth(1)
      await expect(secondPage).toContainText("Al-Baqara")
    })

    test("hides verse range for only one-page chapters", async ({ page }) => {
      const drawer = await openJuzDrawer(page)

      // Al-Fatihah (chapter 1) fits entirely on page 1 — no range ever shown
      await drawer
        .locator('[aria-label="tree-list-group-title"]')
        .first()
        .click()
      await page.waitForTimeout(200)

      const firstPage = drawer.locator('[aria-label="tree-list-item"]').first()
      await expect(firstPage).toBeVisible({ timeout: 3000 })
      await expect(firstPage).toContainText("Al-Faatiha")
      await expect(firstPage).not.toContainText("(")
    })

    test.describe("multi-page chapters", () => {
      test("hides verse range on the first occurrence", async ({ page }) => {
        const drawer = await openJuzDrawer(page)

        // Al-Baqara starts on page 2 of the mushaf — no previous occurrence yet
        await drawer
          .locator('[aria-label="tree-list-group-title"]')
          .first()
          .click()

        const page2Item = drawer.locator('[aria-label="tree-list-item"]').nth(1)
        await expect(page2Item).toBeVisible({ timeout: 3000 })
        await expect(page2Item).toContainText("Al-Baqara")
        await expect(page2Item).not.toContainText("(")
      })

      test("shows verse range from the second occurrence", async ({ page }) => {
        const drawer = await openJuzDrawer(page)

        // Al-Baqara appears on pages 2–22; the third item in Juz 1 is its second occurrence
        await drawer
          .locator('[aria-label="tree-list-group-title"]')
          .first()
          .click()

        const page3Item = drawer.locator('[aria-label="tree-list-item"]').nth(2)
        await expect(page3Item).toBeVisible({ timeout: 3000 })
        await expect(page3Item).toContainText("Al-Baqara")
        await expect(page3Item).toContainText(/\(\d+-\d+\)/)
      })
    })

    test("page sub-options display the physical page number on the right", async ({
      page,
    }) => {
      const drawer = await openJuzDrawer(page)

      // Expand Juz 2 — its first page is page 22 of the Madinah mushaf
      await drawer
        .locator('[aria-label="tree-list-group-title"]')
        .nth(1)
        .click()
      await page.waitForTimeout(200)

      const firstJuz2Page = drawer
        .locator('[aria-label="tree-list-item"]')
        .first()
      await expect(firstJuz2Page).toBeVisible({ timeout: 3000 })

      // Page abbreviation + number must appear in the option row (format: "pg. 22")
      await expect(firstJuz2Page).toContainText("pg. 22")
    })

    test("selecting a page option navigates to the correct chapter and verse", async ({
      page,
    }) => {
      const drawer = await openJuzDrawer(page)

      // Expand Juz 2 — first page starts at chapter 2 verse 142
      await drawer
        .locator('[aria-label="tree-list-group-title"]')
        .nth(1)
        .click()
      await page.waitForTimeout(200)

      const firstJuz2Page = drawer
        .locator('[aria-label="tree-list-item"]')
        .first()
      await expect(firstJuz2Page).toBeVisible({ timeout: 3000 })
      await firstJuz2Page.click()

      // Search sheet closes after selection; wait for the navigated verse to appear
      await untilUsable(page)
      await waitUntilVisible(page.locator('[data-verse="2:142"]'), {
        timeout: 10_000,
      })
    })

    test.describe("small screen (≤430px)", () => {
      test.use({ viewport: { width: 390, height: 844 } })

      /**
       * Queries the pagination DB to find the first juz that contains a page
       * with 3+ chapters. Returns { juzIndex, pageCount } or null.
       */
      async function findJuzWithMultiChapterPage(page: Page) {
        return page.evaluate(async () => {
          const result = await (window as any).__repo.paginations.findAllBy({
            name: "madinah",
          })
          if (!result.succeed) return null
          const [pagination] = result.data
          if (!pagination) return null

          const partToJuz = new Map<number, number>()
          const groups: any[][] = []
          for (const p of pagination.pages) {
            if (!partToJuz.has(p.part)) {
              partToJuz.set(p.part, groups.length)
              groups.push([])
            }
            groups[partToJuz.get(p.part)!].push(p)
          }

          for (let j = 0; j < groups.length; j++) {
            const pages = groups[j]
            if (pages.some((p: any) => p.chapterIds.length >= 3)) {
              return { juzIndex: j, pageCount: pages.length }
            }
          }
          return null
        })
      }

      test("each option shows at most 2 chapters", async ({ page }) => {
        const info = await findJuzWithMultiChapterPage(page)
        expect(info).not.toBeNull()

        const drawer = await openJuzDrawer(page)
        await drawer
          .locator('[aria-label="tree-list-group-title"]')
          .nth(info!.juzIndex)
          .click()

        const items = drawer.locator('[aria-label="tree-list-item"]')
        await expect(items.first()).toBeVisible({ timeout: 3000 })

        // The middle-dot separator · appears once per chapter boundary.
        // At most 2 chapters = at most 1 separator per option.
        const count = await items.count()
        for (let k = 0; k < count; k++) {
          const seps = await items
            .nth(k)
            .evaluate((el) => (el.textContent?.match(/·/g) ?? []).length)
          expect(seps).toBeLessThanOrEqual(1)
        }
      })

      test("produces more options than physical pages when 3+ chapter pages exist", async ({
        page,
      }) => {
        const info = await findJuzWithMultiChapterPage(page)
        expect(info).not.toBeNull()

        const drawer = await openJuzDrawer(page)
        await drawer
          .locator('[aria-label="tree-list-group-title"]')
          .nth(info!.juzIndex)
          .click()

        const items = drawer.locator('[aria-label="tree-list-item"]')
        await expect(items.first()).toBeVisible({ timeout: 3000 })
        const optionCount = await items.count()

        // Splitting 3+ chapter pages into chunks of 2 produces extra options,
        // so the rendered count must exceed the raw physical page count.
        expect(optionCount).toBeGreaterThan(info!.pageCount)
      })
    })
  })
})
