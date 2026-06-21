import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { visitFresh } from "./tools/state"

test.describe("Quran paper", () => {
  test.beforeEach(async ({ page }) => await visitFresh(page))

  test("every arabic word has a translation rendered beneath it", async ({
    page,
  }) => {
    test.setTimeout(10 * 60_000)

    const SCROLL_AMOUNT = 600 // px per step — covers ~4 verses each

    // Check the initial viewport (Al-Fatiha and surrounding rows)
    const initialMissing = await checkVisibleVerseWords(page)
    expect(initialMissing).toEqual([])

    // Scroll all the way to the bottom, checking every viewport along the way
    let atEnd = false
    while (!atEnd) {
      atEnd = await scrollDown(page, SCROLL_AMOUNT)
      await page.waitForTimeout(100) // virtualizer renders newly visible rows

      const missing = await checkVisibleVerseWords(page)
      expect(missing).toEqual([])
    }
  })
})

/**
 * Scroll the virtual-scroll container down by certain pixels.
 * @returns true when the bottom of the content has been reached
 */
async function scrollDown(page: Page, px: number): Promise<boolean> {
  return page.evaluate((amount) => {
    const row = document.querySelector("[data-index]")
    if (!row) return true

    let el: Element | null = row.parentElement
    while (el) {
      const style = window.getComputedStyle(el as HTMLElement)
      if (style.overflow === "auto" || style.overflowY === "auto") {
        const container = el as HTMLElement
        container.scrollTop += amount
        return (
          container.scrollTop + container.clientHeight >=
          container.scrollHeight - 10
        )
      }
      el = el.parentElement
    }

    return true
  }, px)
}

/**
 * For each currently-visible verse row, return every pointer/cursor
 * at which chapter and verse such that there is an Arabic word
 * with no translation beneath it.
 *
 * @returns string[] of location
 */
async function checkVisibleVerseWords(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const missing: string[] = []

    for (const row of document.querySelectorAll<HTMLElement>("[data-index]")) {
      // Arabic words are the only spans in a verse row with cursor:pointer
      const arabicWords = Array.from(row.querySelectorAll("span")).filter(
        (s) =>
          window.getComputedStyle(s).cursor === "pointer" &&
          s.textContent?.trim(),
      )

      // No cursor:pointer spans = chapter header or standalone Basmala — skip
      if (arabicWords.length === 0) continue

      for (const word of arabicWords) {
        const container = word.parentElement
        if (!container) continue

        // The meanings wrapper is the sibling span next to the Arabic span
        const meanings = Array.from(container.children).find(
          (c) => c !== word && c.tagName === "SPAN",
        )

        if (!meanings || !meanings.textContent?.trim()) {
          const verse =
            row.getAttribute("data-verse") ??
            row.getAttribute("data-index") ??
            "?"
          missing.push(`verse ${verse}: "${word.textContent?.trim()}"`)
        }
      }
    }

    return missing
  })
}
