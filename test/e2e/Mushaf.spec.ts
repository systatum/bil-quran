import { Rendering } from "@constants/records/RenderingRecord"
import { expect, Page, test } from "@playwright/test"
import { loadPaginationStyle, loadQuranWords } from "./tools/data"
import { dragHorizontally } from "./tools/interactivity"
import { gotoMushafPage, swipeToNextMushafPage } from "./tools/state"

/** specifically test the Mushaf component, where Qur'an is rendered page by page */
test.describe("Mushaf", () => {
  test("follow madinah mushaf with proper word order", async ({ page }) => {
    // 604 pages, each awaiting a real drag gesture + DOM read; comfortable
    // margin on any typical developer machine.
    test.setTimeout(20 * 60_000)

    const expectedWords = loadQuranWords(Rendering.Imlaei)
    const pages = loadPaginationStyle()

    // Ground truth, independent of madinah.json entirely: the Qur'an's own
    // word order, flattened from chapter 1 -> 114 in reading order
    const canonicalOrder = Object.values(expectedWords).flatMap((tokens) =>
      tokens.flatMap((word) => word.split(/\s+/)),
    )

    await gotoMushafPage(page, 1)

    let cursor = 0
    const seen = new Set<string>()

    for (let i = 0; i < pages.length; i++) {
      const pageNumber = i + 1

      if (pageNumber > 1) {
        const shownPage = await swipeToNextMushafPage(page)
        expect(
          shownPage,
          `swiping next from page ${pageNumber - 1} should land on page ${pageNumber}`,
        ).toBe(pageNumber)
      }

      const mushafPage = pages[i]
      const expected: string[] = []
      mushafPage.chapterIds.forEach((chapterId, chapterIndex) => {
        const [start, end] = mushafPage.verseNumbers[chapterIndex]
        for (let verse = start; verse <= end; verse++) {
          const key = `${chapterId}:${verse}`
          expect(seen.has(key)).toBe(false)
          seen.add(key)

          expect(
            expectedWords[key],
            `page ${pageNumber} references ${key}, which doesn't exist in the Qur'an`,
          ).toBeDefined()

          // some word-by-word units (eg "إِلْ يَاسِينَ" at 37:130) contain an
          // internal space themselves; the DOM-derived `actual` array can't
          // preserve that distinction, so split both sides the same way
          expected.push(
            ...expectedWords[key].flatMap((word) => word.split(/\s+/)),
          )
        }
      })

      const actual = await getRenderedWords(page)

      expect(
        actual,
        `page ${pageNumber}: rendered words don't match madinah.json's own chapter/verse labels for this page`,
      ).toEqual(expected)

      // check whether rendered word diverge from true Quranic word order expected at given position
      const canonicalChunk = canonicalOrder.slice(
        cursor,
        cursor + expected.length,
      )
      cursor += expected.length
      expect(actual).toEqual(canonicalChunk)
    }

    expect(
      cursor,
      "the swiped-through pages don't cover the entire Qur'an",
    ).toBe(canonicalOrder.length)
  })

  test.describe("Navigator", () => {
    test("dragging from the left edge rightward goes to the next page", async ({
      page,
    }) => {
      await gotoMushafPage(page, 1)

      const box = await page.locator("[data-mushaf]").boundingBox()
      expect(box).not.toBeNull()
      const y = box!.y + box!.height / 2
      const startX = box!.x + box!.width * 0.15

      await dragHorizontally(page, startX, startX + 150, y)

      await expect(page).toHaveURL(/#\/m\/madinah\/2$/)
      await expect(page.locator("[data-mushaf]")).toHaveAttribute(
        "data-page",
        "2",
      )
    })

    test("dragging from the right edge leftward goes to the previous page", async ({
      page,
    }) => {
      await gotoMushafPage(page, 2)

      const box = await page.locator("[data-mushaf]").boundingBox()
      expect(box).not.toBeNull()
      const y = box!.y + box!.height / 2
      const startX = box!.x + box!.width * 0.85

      await dragHorizontally(page, startX, startX - 150, y)

      await expect(page).toHaveURL(/#\/m\/madinah\/1$/)
      await expect(page.locator("[data-mushaf]")).toHaveAttribute(
        "data-page",
        "1",
      )
    })
  })
})

/** The page's rendered Arabic word sequence, skips the verse marker and the Bismillah glyph */
async function getRenderedWords(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const container = document.querySelector(".mushaf-page-text")
    if (!container) return []
    const text = Array.from(container.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? "")
      .join(" ")
    return text.split(/\s+/).filter(Boolean)
  })
}
