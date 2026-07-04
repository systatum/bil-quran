import { Locale } from "@constants/settings"
import { expect, Page, test } from "@playwright/test"
import { ArabicFontId, ArabicFonts } from "../../src/constants/fonts"
import enUS from "../../src/i18n/locales/en-US.json"
import {
  CHAPTERS,
  ENGLISH_LOCALE_NAMES,
  getArabicName,
  getMeaning,
  getTransliteration,
} from "./tools/data"
import {
  closeSidebar,
  findVisibleTarget,
  openSidebar,
  scrollDown,
  selectComboBox,
  waitUntilVisible,
} from "./tools/interactivity"
import {
  getPageLuminance,
  getWordFontFamily,
  untilUsable,
  visitFresh,
} from "./tools/state"

test.describe("UserSettingsState", () => {
  test.beforeEach(async ({ page }) => await visitFresh(page))

  test.describe("theme", () => {
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
  })

  test.describe("font", () => {
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
     *
     * Waits two animation frames first so the virtualizer has finished its
     * post-scroll layout pass before we read bounding boxes.
     */
    async function checkVisibleRowGaps(page: Page): Promise<string[]> {
      // Let any pending rAF callbacks (virtualizer re-render) flush before
      // reading bounding boxes.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      )

      return page.evaluate(() => {
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

        return gaps
      })
    }

    test("selected font persists after page reload", async ({ page }) => {
      const FONT_NAME = ArabicFonts.Amiri.name
      const FONT_ID = ArabicFontId.Amiri

      await openSidebar(page)
      await selectFont(FONT_NAME, page)
      await page.waitForTimeout(300)

      await page.reload()
      await untilUsable(page)
      await waitUntilVisible(page.locator("[data-verse]").first(), {
        timeout: 15_000,
      })

      const fontFamily = await getWordFontFamily(page)
      expect(fontFamily).not.toBeNull()
      expect(fontFamily).toContain(FONT_ID)
    })

    test("recalculates verse row without gaps", async ({ page }) => {
      const VERSE_TARGET = 50
      const SCROLL_AMOUNT = 600

      test.setTimeout(10 * 60_000)
      await openSidebar(page)

      for (const fontName of FONT_DISPLAY_NAMES) {
        await selectFont(fontName, page)
        await page.waitForTimeout(800) // virtualizer re-measures rows after font swap

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
          await page.waitForTimeout(300)
          if (atEnd) break
        }
      }
    })
  })

  test.describe("showPageIndicator", () => {
    test("juz bar is hidden by default and visible when enabled", async ({
      page,
    }) => {
      // Navigate to a mid-Quran verse so juzProgress is non-null once enabled
      await page.goto("/#/c/2/1")
      await untilUsable(page)
      await waitUntilVisible(page.locator('[data-verse^="2:"]').first(), {
        timeout: 15_000,
      })

      const juzBar = page.locator('[data-testid="juz-progress-bar"]')

      // Default: showPageIndicator is true → bar is visible out of the box
      await expect(juzBar).toBeVisible({ timeout: 5000 })

      // Disable via sidebar toggle
      await openSidebar(page)
      const toggle = await findVisibleTarget(undefined, page, {
        formLabel: "Show page indicator",
      })
      await toggle.click()
      await closeSidebar(page)
      await page.waitForTimeout(300)

      await expect(juzBar).toHaveCount(0)

      // Disabled state persists after reload
      await page.reload()
      await untilUsable(page)
      await waitUntilVisible(page.locator('[data-verse^="2:"]').first(), {
        timeout: 15_000,
      })

      await expect(juzBar).toHaveCount(0)
    })
  })

  test.describe("locale", () => {
    const allLocales = Object.entries(ENGLISH_LOCALE_NAMES)
    for (const [locale, displayName] of allLocales) {
      test.describe(`with ${locale}`, () => {
        test("persist locale after reload", async ({ page }) => {
          await openSidebar(page)
          await selectComboBox(displayName, page, { formLabel: "Language" })
          await closeSidebar(page)
          await page.waitForTimeout(400)

          // Verify locale is active — chapter 1 header shows locale-specific text
          const transliteration = getTransliteration("1", locale as Locale)
          const meaning = getMeaning("1", locale as Locale)
          await expect(
            page.getByText(`${transliteration} · ${meaning}`, { exact: true }),
          ).toBeVisible({ timeout: 5000 })

          // Reload — userSettings (including locale) is persisted in localStorage
          await page.reload()
          await untilUsable(page)
          await waitUntilVisible(page.locator("[data-verse]").first(), {
            timeout: 15_000,
          })

          // Chapter 1 header must still render in the selected locale
          await expect(
            page.getByText(`${transliteration} · ${meaning}`, { exact: true }),
          ).toBeVisible({ timeout: 5000 })
        })

        test("properly translated chapter names", async ({ page }) => {
          // 114 chapters × ~2 s each ≈ 4 min; 3 locales run in parallel so wall-clock ≈ 4 min
          test.setTimeout(10 * 60_000)

          await visitFresh(page)
          await waitUntilVisible(page.locator("[data-verse]").first(), {
            timeout: 15_000,
          })

          // Change language to the target locale via sidebar
          await openSidebar(page)
          await selectComboBox(displayName, page, { formLabel: "Language" })
          await closeSidebar(page)
          await page.waitForTimeout(400)

          // === VerseLookup dropdown: verify all 114 chapter option texts at once ===
          // The coneto Combobox renders all 114 chapter group-titles in the DOM simultaneously
          // (no virtual scrolling inside the drawer), so allTextContents() is a single O(n) pass.
          await page
            .locator('[aria-label="action-button"]:not(aside *)')
            .first()
            .click()
          await page.waitForTimeout(300)

          const combobox = page
            .locator('[role="combobox"]:not(aside *)')
            .filter({ visible: true })
            .first()
          await expect(combobox).toBeVisible({ timeout: 3000 })
          await combobox.click()

          const drawer = page
            .locator('[aria-label="combobox-drawer"]')
            .filter({ visible: true })
          await expect(drawer).toBeVisible({ timeout: 5000 })

          const optionItems = drawer.locator(
            '[aria-label="tree-list-group-title"]',
          )
          await expect(optionItems.first()).toBeVisible({ timeout: 3000 })
          const allOptionTexts = new Set(
            (await optionItems.allTextContents()).map((t) => t.trim()),
          )

          for (const [chapterId] of Object.entries(CHAPTERS)) {
            const transliteration = getTransliteration(
              chapterId,
              locale as Locale,
            )
            const meaning = getMeaning(chapterId, locale as Locale)
            const arabicName = getArabicName(chapterId, locale as Locale)
            const expectedText = `${chapterId}. ${transliteration} (${arabicName}) - ${meaning}`
            expect(
              allOptionTexts.has(expectedText),
              `Chapter ${chapterId} option should read: "${expectedText}"`,
            ).toBe(true)
          }

          // === Chapter headers: navigate to all 114 chapters and verify ChapterRow ===
          // page.goto("/#/c/N/1") is a hash navigation — TanStack Router handles it as an
          // in-app route change (same as what VerseLookup calls internally), so the locale
          // stored in localStorage is preserved across every navigation.
          //
          // ar-IQ note: meanings["ar-IQ"] is null for all chapters. getMeaning() falls back
          // to the en-US value, so ChapterDescription reads "<Arabic translit> · <English meaning>".
          await page.keyboard.press("Escape") // close combobox drawer
          await page.waitForTimeout(200)

          const sortedChapterIds = Object.keys(CHAPTERS).sort(
            (a, b) => parseInt(a) - parseInt(b),
          )
          for (const chapterId of sortedChapterIds) {
            await page.goto(`/#/c/${chapterId}/1`)
            // Wait for a verse from this specific chapter — ensures the virtualizer has
            // scrolled to the target position before we read the chapter header.
            // Using "^=" so "1:" matches ch 1 only, not ch 10, 11, etc.
            await waitUntilVisible(
              page.locator(`[data-verse^="${chapterId}:"]`).first(),
              { timeout: 10_000 },
            )

            const transliteration = getTransliteration(
              chapterId,
              locale as Locale,
            )
            const meaning = getMeaning(chapterId, locale as Locale)

            // ChapterDescription renders "transliteration · meaning"
            await expect(
              page.getByText(`${transliteration} · ${meaning}`, {
                exact: true,
              }),
            ).toBeVisible({ timeout: 5000 })
          }
        })
      })
    }
  })
})
