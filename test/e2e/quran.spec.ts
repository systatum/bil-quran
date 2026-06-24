import { Rendering } from "@constants/records/RenderingRecord"
import { expect, Page, test } from "@playwright/test"
import {
  scrollDown,
  scrollUp,
  toggleWbwTranslation,
  waitUntilVisible,
} from "./tools/interactivity"
import { loadQuranWords, untilUsable, visitFresh } from "./tools/state"

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
})

test.describe("Verse marker", () => {
  /** Navigate to a random chapter 1–10 and wait for verses to render. */
  async function goToRandomChapter(page: Page) {
    const chapter = Math.floor(Math.random() * 10) + 1
    await page.goto(`/#/c/${chapter}/1`)
    await untilUsable(page)
    await waitUntilVisible(page.locator("[data-verse]").first(), {
      timeout: 15_000,
    })
    await page.waitForTimeout(300)
  }

  test.beforeEach(async ({ page }) => {
    await visitFresh(page)
  })

  test("marker follows when scrolling down", async ({ page }) => {
    await goToRandomChapter(page)
    await scrollDownCheckingMarkers(page, 20)
  })

  test("marker follows when scrolling up", async ({ page }) => {
    await goToRandomChapter(page)

    // reach the ~30-verse mark before scrolling back
    for (let i = 0; i < 10; i++) {
      await scrollDown(page, 600)
      await page.waitForTimeout(50)
    }

    await scrollUpCheckingMarkers(page, 20)
  })

  test("marker follows after adding and removing a translation language", async ({
    page,
  }) => {
    await goToRandomChapter(page)

    // add Indonesian translation
    await toggleWbwTranslation("Indonesian", page)
    await page.waitForTimeout(400) // virtualizer re-measures rows

    await scrollDownCheckingMarkers(page, 10)
    await scrollUpCheckingMarkers(page, 10)

    // remove Indonesian translation
    await toggleWbwTranslation("Indonesian", page)
    await page.waitForTimeout(400)

    await scrollDownCheckingMarkers(page, 10)
    await scrollUpCheckingMarkers(page, 10)
  })
})

/** Scroll down N steps, asserting markers stay visible at each step. */
async function scrollDownCheckingMarkers(page: Page, steps: number, px = 400) {
  for (let i = 0; i < steps; i++) {
    await page.waitForTimeout(80)
    const failed = await getClippedMarkers(page)
    expect(failed).toEqual([])
    const atEnd = await scrollDown(page, px)
    if (atEnd) break
  }
}

/** Scroll up N steps, asserting markers stay visible at each step. */
async function scrollUpCheckingMarkers(page: Page, steps: number, px = 400) {
  for (let i = 0; i < steps; i++) {
    await page.waitForTimeout(80)
    const failed = await getClippedMarkers(page)
    expect(failed).toEqual([])
    const atTop = await scrollUp(page, px)
    if (atTop) break
  }
}

/** @returns verse IDs whose markers have scrolled out of view (top-clipped rows only). */
export async function getClippedMarkers(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const firstRow = document.querySelector("[data-index]")
    if (!firstRow) return []

    let el: Element | null = firstRow.parentElement
    while (el) {
      const s = window.getComputedStyle(el as HTMLElement)
      if (s.overflow === "auto" || s.overflowY === "auto") break
      el = el.parentElement
    }
    if (!el) return []

    const scrollRect = (el as HTMLElement).getBoundingClientRect()
    const failed: string[] = []

    for (const row of document.querySelectorAll<HTMLElement>("[data-verse]")) {
      const rowRect = row.getBoundingClientRect()

      // only care about multi-row verses clipped at the top;
      // single-row verses intentionally skip the translateY behavior.
      const clippedAtTop = rowRect.top < scrollRect.top
      const stillVisible = rowRect.bottom > scrollRect.top + 10
      if (!clippedAtTop || !stillVisible) continue

      const wordEls = Array.from(
        row.querySelectorAll<HTMLElement>("[data-word-index]"),
      )
      if (wordEls.length === 0) continue
      const firstWordTop = wordEls[0].getBoundingClientRect().top
      const isMultiRow = wordEls.some(
        (el) => Math.abs(el.getBoundingClientRect().top - firstWordTop) > 1,
      )
      if (!isMultiRow) continue

      // may return null if it's mid-render, ie not fully-mounted
      const marker = row.querySelector("[data-vmark]")
      if (!marker) continue

      const markerTop = marker.getBoundingClientRect().top
      if (markerTop < scrollRect.top - 5) {
        failed.push(
          row.getAttribute("data-verse") ??
            row.getAttribute("data-index") ??
            "?",
        )
      }
    }

    return failed
  })
}
