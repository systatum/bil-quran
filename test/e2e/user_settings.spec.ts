import { expect, Page, test } from "@playwright/test"
import { ArabicFontId, ArabicFonts } from "../../src/constants/fonts"
import enUS from "../../src/i18n/locales/en-US.json"
import {
  findVisibleTarget,
  scrollDown,
  selectComboBox,
} from "./tools/interactivity"
import {
  getPageLuminance,
  openSidebar,
  untilUsable,
  visitFresh,
} from "./tools/state"

test.describe.only("User settings", () => {
  test.beforeEach(async ({ page }) => await visitFresh(page))

  test("selected theme persists after page refresh", async ({ page }) => {
    const luminanceLight = await getPageLuminance(page)

    await openSidebar(page)
    await selectComboBox("Dark", page, { formLabel: "Theme" })

    // Poll until the page visually darkens — React re-render may be async
    await expect
      .poll(() => getPageLuminance(page), { timeout: 5000 })
      .toBeLessThan(luminanceLight)

    // Reload and verify the dark theme still applies
    await page.reload()
    await untilUsable(page)

    await expect
      .poll(() => getPageLuminance(page), { timeout: 5000 })
      .toBeLessThan(luminanceLight)

    // Re-open sidebar and confirm the combobox still reads "Dark"
    await openSidebar(page)
    await expect(page.getByLabel("Theme")).toHaveValue("Dark")
  })

  test.describe("font settings", () => {
    // Font display names as they appear in the settings dropdown.
    const FONT_DISPLAY_NAMES: string[] = [
      ...Object.entries(ArabicFonts)
        .filter(([id]) => id !== ArabicFontId.MeQuranFull)
        .map(([_, f]) => f.name),
      enUS.fontOptions.meQuranLearner, // "MeQuran (for Learner)"
    ]

    async function selectFont(fontName: string, page: Page) {
      const input = await findVisibleTarget(undefined, page, {
        formLabel: "Font",
      })
      await input.click()

      const drawer = page
        .locator('[aria-label="combobox-drawer"]')
        .filter({ visible: true })
      await expect(drawer).toBeVisible({ timeout: 5000 })

      // Expand all collapsed groups (each open call resets group state)
      const groupHeaders = drawer.locator(
        '[aria-label="tree-list-group-title"][data-has-options="true"]',
      )
      for (let i = 0; i < (await groupHeaders.count()); i++) {
        await groupHeaders.nth(i).click()
      }
      await page.waitForTimeout(250)

      // Match either a grouped item or a standalone top-level item
      const item = drawer
        .locator(
          '[aria-label="tree-list-item"], [aria-label="tree-list-group-title"][data-has-options="false"]',
        )
        .filter({ hasText: fontName })
        .first()

      await expect(item).toBeVisible({ timeout: 5000 })
      await item.click()
    }

    /**
     * Check currently-visible rows for vertical gaps. Any gap indicates the
     * virtualizer mis-sized a row after the font change.
     */
    async function checkVisibleRowGaps(page: Page): Promise<string[]> {
      return page.evaluate(async () => {
        const rows = Array.from(
          document.querySelectorAll<HTMLElement>("[data-index]"),
        )
        if (rows.length < 2) return []

        const sorted = rows
          .map((row) => ({
            label:
              row.getAttribute("data-verse") ??
              `[data-index=${row.getAttribute("data-index")}]`,
            rect: row.getBoundingClientRect(),
          }))
          .filter(({ rect }) => rect.height > 0)
          .sort((a, b) => a.rect.top - b.rect.top)

        const gaps: string[] = []
        for (let i = 0; i < sorted.length - 1; i++) {
          const a = sorted[i]
          const b = sorted[i + 1]
          const gap = Math.round(b.rect.top - a.rect.bottom)
          if (Math.abs(gap) > 1) {
            gaps.push(`${gap}px gap between ${a.label} and ${b.label}`)
          }
        }

        if (gaps.length > 0) await page.pause()
        return gaps
      })
    }

    test("recalculates verse row without gaps", async ({ page }) => {
      const VERSE_TARGET = 50
      const SCROLL_AMOUNT = 600

      test.setTimeout(10 * 60_000)
      await openSidebar(page)

      for (const fontName of FONT_DISPLAY_NAMES) {
        await selectFont(fontName, page)
        await page.waitForTimeout(500) // virtualizer re-measures rows after font swap

        const seenVerses = new Set<string>()
        while (seenVerses.size < VERSE_TARGET) {
          const gaps = await checkVisibleRowGaps(page)
          expect(gaps, `Font "${fontName}": row gaps`).toEqual([])

          const visible: string[] = await page.evaluate(() =>
            Array.from(
              document.querySelectorAll<HTMLElement>("[data-verse]"),
            ).map((el) => el.getAttribute("data-verse")!),
          )
          visible.forEach((v) => seenVerses.add(v))

          const atEnd = await scrollDown(page, SCROLL_AMOUNT)
          await page.waitForTimeout(150)
          if (atEnd) break
        }
      }
    })
  })
})
