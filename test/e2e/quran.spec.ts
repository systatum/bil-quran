import { expect, test } from "@playwright/test"
import { checkVisibleVerseWords, scrollDown } from "./tools/interactivity"
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
