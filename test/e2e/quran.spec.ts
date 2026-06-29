import { Rendering } from "@constants/records/RenderingRecord"
import { expect, Page, test } from "@playwright/test"
import { loadQuranWords } from "./tools/data"
import { scrollDown, waitUntilVisible } from "./tools/interactivity"
import { untilUsable, visitFresh } from "./tools/state"

test.describe("Quran paper", () => {
  test.beforeEach(async ({ page }) => await visitFresh(page))

  test("correct arabic word sequence with translations", async ({ page }) => {
    test.setTimeout(10 * 60_000)

    const SCROLL_AMOUNT = 600 // px per step — covers ~4 verses each
    const expectedWords = loadQuranWords(Rendering.Imlaei)

    // Inject once — avoids re-serializing the entire ~77k-entry map on every
    // page.evaluate call, which would exhaust the Node.js heap over a full run.
    await page.evaluate((words) => {
      ;(window as any).__expectedWords = words
    }, expectedWords)

    /** @returns failure descriptions for any missing translations or sequence mismatches. */
    const checkVisibleVerseWords = async (page: Page): Promise<string[]> => {
      return page.evaluate(() => {
        const expected: Record<string, string[]> | undefined = (window as any)
          .__expectedWords
        if (!expected || Object.keys(expected).length <= 0)
          throw new Error("Expected words cannot be empty")

        const failures: string[] = []
        const getElements = (query: string) =>
          document.querySelectorAll<HTMLElement>(query)
        const visibleVerses = getElements("[data-index]")
        for (const row of visibleVerses) {
          const arabicWords = Array.from(getElements(".arabic-lex"))
          // rows with no .arabic-lex spans are headers / standalone Basmala
          if (arabicWords.length === 0) continue

          const verseId = row.getAttribute("data-index")
          if (!verseId) throw new Error("Unknown verse ID")

          for (const word of arabicWords) {
            const container = word.parentElement
            if (!container) continue

            const meanings = Array.from(container.children).find(
              (c) => c !== word && c.tagName === "SPAN",
            )

            if (!meanings || !meanings.textContent?.trim()) {
              failures.push(
                `verse ${verseId}: "${word.textContent?.trim()}" has no translation`,
              )
            }
          }

          const expectedSeq = expected[verseId]
          if (!expectedSeq) continue

          const actualSeq = arabicWords.map((w) => w.textContent?.trim() ?? "")

          // make sure same number of expected words
          if (actualSeq.length !== expectedSeq.length) {
            failures.push(
              `verse ${verseId}: expected ${expectedSeq.length} words, got ${actualSeq.length}`,
            )
            continue
          }

          for (let i = 0; i < expectedSeq.length; i++) {
            if (actualSeq[i] !== expectedSeq[i]) {
              failures.push(
                `verse ${verseId} word ${i + 1}: expected "${expectedSeq[i]}", got "${actualSeq[i]}"`,
              )
            }
          }
        }

        return failures
      })
    }

    const initialFailures = await checkVisibleVerseWords(page)
    expect(initialFailures).toEqual([])

    let atEnd = false
    while (!atEnd) {
      atEnd = await scrollDown(page, SCROLL_AMOUNT)
      await page.waitForTimeout(100) // virtualizer renders newly visible rows

      const failures = await checkVisibleVerseWords(page)
      expect(failures).toEqual([])
    }
  })

  test.describe("scroll", () => {
    test("Position preserved after orientation change", async ({ page }) => {
      // Use a long chapter so there is enough content to scroll
      await page.goto("/#/c/2/1")
      await untilUsable(page)
      await waitUntilVisible(page.locator("[data-verse]").first(), {
        timeout: 15_000,
      })
      await page.waitForTimeout(300)

      // Scroll to a non-trivial position (5 × 600px ≈ verse 10–15 of Al-Baqara)
      for (let i = 0; i < 5; i++) {
        await scrollDown(page, 600)
        await page.waitForTimeout(150)
      }

      // Let the 120ms scroll-recording debounce fire and flush to localStorage
      await page.waitForTimeout(300)

      // Capture what the app persisted as lastScroll
      const savedScroll = await page.evaluate(() => {
        const raw = localStorage.getItem("userSettings")
        return raw
          ? (JSON.parse(raw).lastScroll as { chapterId: number; verse: number })
          : null
      })
      expect(savedScroll?.chapterId).toBeGreaterThan(0)

      // Simulate orientation change by swapping viewport dimensions
      const { width, height } = page.viewportSize()!
      await page.setViewportSize({ width: height, height: width })

      // The app restores scroll position after a debounce + measurement cycle
      // (~900ms total). Rather than a fixed sleep, let Playwright's retry loop
      // wait until the verse actually becomes visible — robust on any machine speed.
      const verseLocator = page.locator(
        `[data-verse="${savedScroll!.chapterId}:${savedScroll!.verse}"]`,
      )
      await expect(verseLocator).toBeVisible({ timeout: 6000 })
    })
  })
})
