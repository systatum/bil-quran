import { Rendering } from "@constants/records/RenderingRecord"
import { expect, Page, test } from "@playwright/test"
import { loadPaginationStyle, loadQuranWords } from "./tools/data"
import {
  clickOn,
  closeSidebar,
  dragHorizontally,
  dragVertically,
  gotoMushafPage,
  longPress,
  openSidebar,
  selectComboBox,
  setReadingStyle,
  showNavigatorSearch,
  swipeToNextMushafPage,
} from "./tools/interactivity"
import {
  getBismillahFontSize,
  getFrameBorderOrientations,
  getSearchSheetOpacity,
} from "./tools/state"

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
    test("rightward drag goes to the next page", async ({ page }) => {
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

    test("leftward drag goes to the previous page", async ({ page }) => {
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

    /** The Navigator pill's computed opacity ("0" hidden, "1" revealed). */
    async function getNavigatorOpacity(page: Page): Promise<string | null> {
      return page.evaluate(() => {
        const button = document.querySelector('[aria-label="previous page"]')
        const pill = button?.parentElement
        return pill ? getComputedStyle(pill).opacity : null
      })
    }

    test.describe("Navigator reveal/hide", () => {
      test("hidden until swiped up", async ({ page }) => {
        await gotoMushafPage(page, 1)
        await expect.poll(() => getNavigatorOpacity(page)).toBe("0")
      })

      test("swipe up reveals, swipe down hides", async ({ page }) => {
        await gotoMushafPage(page, 1)

        const box = await page.locator("[data-mushaf]").boundingBox()
        expect(box).not.toBeNull()
        const x = box!.x + box!.width / 2
        const y = box!.y + box!.height / 2

        // well past the 10px reveal threshold
        await dragVertically(page, x, y, y - 20)
        await expect.poll(() => getNavigatorOpacity(page)).toBe("1")

        await dragVertically(page, x, y, y + 20)
        await expect.poll(() => getNavigatorOpacity(page)).toBe("0")
      })

      test("horizontal drag doesn't reveal it", async ({ page }) => {
        await gotoMushafPage(page, 1)

        const box = await page.locator("[data-mushaf]").boundingBox()
        expect(box).not.toBeNull()
        const y = box!.y + box!.height / 2
        const startX = box!.x + box!.width * 0.15

        await dragHorizontally(page, startX, startX + 150, y)

        await expect.poll(() => getNavigatorOpacity(page)).toBe("0")
      })
    })
  })

  test.describe("Settings reveal gesture", () => {
    test("short drag still turns the page", async ({ page }) => {
      await gotoMushafPage(page, 3)

      const box = await page.locator("[data-mushaf]").boundingBox()
      expect(box).not.toBeNull()
      const y = box!.y + box!.height / 2
      const startX = box!.x + box!.width * 0.85

      // past the 80px turn threshold but short of the 260px reveal distance
      await dragHorizontally(page, startX, startX - 100, y)

      await expect(page.locator("[data-mushaf]")).toHaveAttribute(
        "data-page",
        "2",
      )
      await expect(
        page.locator('[aria-label="settings-backup-button"]'),
      ).toHaveCount(0)
    })

    test("long drag opens Settings, not a page turn", async ({ page }) => {
      await gotoMushafPage(page, 3)

      const box = await page.locator("[data-mushaf]").boundingBox()
      expect(box).not.toBeNull()
      const y = box!.y + box!.height / 2
      const startX = box!.x + box!.width * 0.85

      // well past the 260px reveal distance
      await dragHorizontally(page, startX, startX - 300, y)

      // still on the same mushaf page underneath - Settings opens as an
      // overlay here, it doesn't navigate away to the main app shell
      await expect(page.locator("[data-mushaf]")).toHaveAttribute(
        "data-page",
        "3",
      )
      await expect(
        page.locator('[aria-label="settings-backup-button"]'),
      ).toBeVisible({ timeout: 10_000 })
    })

    test("shows menu icon only past reveal distance", async ({ page }) => {
      await gotoMushafPage(page, 3)

      const box = await page.locator("[data-mushaf]").boundingBox()
      expect(box).not.toBeNull()
      const y = box!.y + box!.height / 2
      const startX = box!.x + box!.width * 0.85

      await page.mouse.move(startX, y)
      await page.mouse.down()

      // past the 80px turn threshold, short of the 260px reveal distance:
      // should still look like an ordinary page turn, no menu icon yet
      await page.mouse.move(startX - 100, y)
      await expect(page.locator(".settings-reveal-overlay")).toHaveCount(0)

      // keep dragging past the reveal distance
      await page.mouse.move(startX - 300, y)
      await expect(page.locator(".settings-reveal-overlay")).toBeVisible()

      // releasing here should not turn the page - it opens Settings instead,
      // right on top of the same mushaf page
      await page.mouse.up()
      await expect(page.locator("[data-mushaf]")).toHaveAttribute(
        "data-page",
        "3",
      )
      await expect(
        page.locator('[aria-label="settings-backup-button"]'),
      ).toBeVisible({ timeout: 10_000 })
    })
  })

  test.describe("search sheet", () => {
    test("chapter tap opens the sheet", async ({ page }) => {
      await gotoMushafPage(page, 1)
      await showNavigatorSearch(page)

      await expect(page.getByText("By chapter")).toBeVisible({
        timeout: 3000,
      })
      await expect(page.getByText("By juz (part)")).toBeVisible({
        timeout: 3000,
      })
    })

    test("outside click dismisses it", async ({ page }) => {
      await gotoMushafPage(page, 1)
      await showNavigatorSearch(page)

      await expect.poll(() => getSearchSheetOpacity(page)).toBe("1")

      // the sheet only covers the bottom of the page - the top is "outside"
      const box = await page.locator("[data-mushaf]").boundingBox()
      await page.mouse.click(box!.x + box!.width / 2, box!.y + 10)

      await expect.poll(() => getSearchSheetOpacity(page)).toBe("0")
    })

    test("verse pick jumps to its page", async ({ page }) => {
      // start away from chapter 1's page, so landing back on page 1 is meaningful
      await gotoMushafPage(page, 5)
      await showNavigatorSearch(page)

      const combobox = page
        .locator('[role="combobox"]')
        .filter({ visible: true })
        .first()
      await combobox.click()

      const drawer = page
        .locator('[aria-label="combobox-drawer"]')
        .filter({ visible: true })
      await expect(drawer).toBeVisible({ timeout: 5000 })

      // chapter 1 (Al-Faatiha, 7 verses) - items appear directly, no paging
      const chapter1 = drawer
        .locator('[aria-label="tree-list-group-title"]')
        .first()
      await chapter1.click()
      await page.waitForTimeout(200)

      const verse3 = drawer
        .locator('[aria-label="tree-list-item"]')
        .filter({ hasText: "3" })
        .first()
      await expect(verse3).toBeVisible({ timeout: 3000 })
      await verse3.click()

      // 1:3 lives on mushaf page 1 - and critically, this must stay on the
      // mushaf route rather than jumping to QuranPaper's /c/1/3
      await expect(page).toHaveURL(/#\/m\/madinah\/1$/)
      await expect(page.locator("[data-mushaf]")).toHaveAttribute(
        "data-page",
        "1",
      )
    })

    test("juz pick jumps to its page", async ({ page }) => {
      await gotoMushafPage(page, 1)
      await showNavigatorSearch(page)

      const combobox = page
        .locator('[role="combobox"]')
        .filter({ visible: true })
        .nth(1)
      await combobox.click()

      const drawer = page
        .locator('[aria-label="combobox-drawer"]')
        .filter({ visible: true })
      await expect(drawer).toBeVisible({ timeout: 5000 })

      const juz1 = drawer
        .locator('[aria-label="tree-list-group-title"]')
        .first()
      await juz1.click()
      await page.waitForTimeout(200)

      const firstPageOption = drawer
        .locator('[aria-label="tree-list-item"]')
        .first()
      await expect(firstPageOption).toBeVisible({ timeout: 3000 })
      await firstPageOption.click()

      await expect(page).toHaveURL(/#\/m\/madinah\/\d+$/)
    })
  })

  test.describe("Bismillah glyph", () => {
    test("shrinks at phone/tablet breakpoints", async ({ page }) => {
      // mushaf page 2 opens with chapter 2's Bismillah
      await page.setViewportSize({ width: 1400, height: 900 })
      await gotoMushafPage(page, 2)

      // 44px native size, 20% smaller outside the phone/tablet breakpoints
      await expect.poll(() => getBismillahFontSize(page)).toBe("35.2px")

      // 35% smaller between the phone and tablet breakpoints
      await page.setViewportSize({ width: 800, height: 900 })
      await expect.poll(() => getBismillahFontSize(page)).toBe("28.6px")

      // 60% smaller at/under the phone breakpoint
      await page.setViewportSize({ width: 400, height: 800 })
      await expect.poll(() => getBismillahFontSize(page)).toBe("17.6px")
    })
  })

  test.describe("Word long-press", () => {
    test("show lexeme dialog on long tap on a word", async ({ page }) => {
      await gotoMushafPage(page, 1)

      const firstWord = page.locator(".mushaf-word").first()
      await longPress(page, firstWord)

      await expect(
        page.locator('[aria-label="paper-dialog-content"]'),
      ).toBeVisible({ timeout: 5000 })
    })

    test("moving finger before threshold cancels the lexeme dialog", async ({
      page,
    }) => {
      await gotoMushafPage(page, 1)

      const firstWord = page.locator(".mushaf-word").first()
      const box = await firstWord.boundingBox()
      if (!box) throw new Error("no bounding box")
      const x = box.x + box.width / 2
      const y = box.y + box.height / 2

      await firstWord.dispatchEvent("pointerdown", {
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
      })
      await page.waitForTimeout(100)
      await firstWord.dispatchEvent("pointermove", {
        clientX: x + 40,
        clientY: y,
        bubbles: true,
        cancelable: true,
      })
      await page.waitForTimeout(600)
      await firstWord.dispatchEvent("pointerup", {
        clientX: x + 40,
        clientY: y,
        bubbles: true,
        cancelable: true,
      })

      await expect(
        page.locator('[aria-label="paper-dialog-content"]'),
      ).not.toBeVisible({ timeout: 1000 })
    })
  })

  test.describe("Verse marker context menu", () => {
    test("exegesis option opens the dialog", async ({ page }) => {
      await gotoMushafPage(page, 1)
      await page.locator('[aria-label="verse-bookmarker-btn"]').first().click()
      await clickOn("Exegesis", page, { ariaLabel: "tip-menu-item" })

      await expect(
        page.locator('[aria-label="paper-dialog-content"]'),
      ).toBeVisible({ timeout: 5000 })
    })

    test("bookmark option persists a bookmark", async ({ page }) => {
      await gotoMushafPage(page, 1)
      await page.locator('[aria-label="verse-bookmarker-btn"]').first().click()
      await clickOn("Bookmark", page, { ariaLabel: "tip-menu-item" })

      const bookmarks = await page.evaluate(() => {
        const raw = localStorage.getItem("userSettings")
        return raw ? (JSON.parse(raw)?.bookmarks?.list ?? null) : null
      })
      expect(Object.keys(bookmarks ?? {}).length).toBeGreaterThan(0)
    })

    test("note option persists the note", async ({ page }) => {
      await gotoMushafPage(page, 1)
      await page.locator('[aria-label="verse-bookmarker-btn"]').first().click()
      await clickOn("Note", page, { ariaLabel: "tip-menu-item" })

      await expect(page.getByText("Note this verse")).toBeVisible({
        timeout: 5000,
      })
      await page.locator("textarea").fill("test note")
      await clickOn("Add", page, { role: "button" })

      const bookmarks = await page.evaluate(() => {
        const raw = localStorage.getItem("userSettings")
        return raw ? (JSON.parse(raw)?.bookmarks?.list ?? null) : null
      })
      const note = Object.values(bookmarks ?? {})[0] as { note?: string }
      expect(note?.note).toBe("test note")
    })

    test("highlight option persists color and colors the verse", async ({
      page,
    }) => {
      await gotoMushafPage(page, 1)
      await page.locator('[aria-label="verse-bookmarker-btn"]').first().click()
      await clickOn("Highlight", page, { ariaLabel: "tip-menu-item" })

      await expect(page.getByText("Highlight this verse")).toBeVisible({
        timeout: 5000,
      })
      await clickOn("Highlight", page, { role: "button" })

      const highlighted = await page.evaluate(() => {
        const raw = localStorage.getItem("userSettings")
        return raw ? (JSON.parse(raw)?.highlightedVerses ?? null) : null
      })
      expect(Object.values(highlighted ?? {})[0]).toBe(1)

      const bg = await page
        .locator(".mushaf-word")
        .first()
        .evaluate((el) => {
          let node: HTMLElement | null = el as HTMLElement
          while (node) {
            const bg = window.getComputedStyle(node).backgroundColor
            if (bg !== "rgba(0, 0, 0, 0)") return bg
            node = node.parentElement
          }
          return null
        })
      expect(bg).toBe("rgb(200, 230, 201)")
    })
  })

  test.describe("Reading style", () => {
    test("mono-stitched redirects on load", async ({ page }) => {
      await setReadingStyle(page, "Mono-stitched")

      await page.goto("/")
      await page
        .locator("[data-mushaf]")
        .waitFor({ state: "visible", timeout: 15_000 })
      await expect(page).toHaveURL(/#\/m\/madinah\/1$/)
    })

    test("mono frame border is correct", async ({ page }) => {
      await setReadingStyle(page, "Mono-stitched")

      await page.goto("/")
      await page
        .locator("[data-mushaf]")
        .waitFor({ state: "visible", timeout: 15_000 })

      const frames = await getFrameBorderOrientations(page)
      expect(frames).toHaveLength(1)
      expect(frames[0].direction).toBe("ltr")
      expect(frames[0].topLeftX).not.toBeNull()
      expect(frames[0].topRightX).not.toBeNull()
      expect(frames[0].topLeftX!).toBeLessThan(frames[0].topRightX!)
    })

    test.describe("Dual-stitched", () => {
      test("wide viewport shows two pages", async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 1000 })
        await setReadingStyle(page, "Dual-stitched")

        await page.goto("/")
        await page
          .locator("[data-mushaf]")
          .waitFor({ state: "visible", timeout: 15_000 })

        await expect(page.locator("[data-mushaf]")).toHaveAttribute(
          "data-dual-stitched",
          "true",
        )

        const pageTexts = page.locator(".mushaf-page-text")
        await expect(pageTexts).toHaveCount(2)

        // 42.5px default font size * 0.8 (PageText's own tablet-tier scale)
        await expect
          .poll(() =>
            pageTexts.first().evaluate((el) => getComputedStyle(el).fontSize),
          )
          .toBe("34px")
      })

      test("narrow viewport falls back", async ({ page }) => {
        await page.setViewportSize({ width: 800, height: 900 })
        await setReadingStyle(page, "Dual-stitched")

        await page.goto("/")
        await page
          .locator("[data-mushaf]")
          .waitFor({ state: "visible", timeout: 15_000 })

        await expect(page.locator("[data-mushaf]")).not.toHaveAttribute(
          "data-dual-stitched",
          "true",
        )
        await expect(page.locator(".mushaf-page-text")).toHaveCount(1)

        await expect(
          // .first() because React StrictMode's dev-only double-effect
          page.getByText("Dual-stitched unavailable").first(),
        ).toBeVisible({ timeout: 5000 })
      })

      test("gesture navigation steps by 2 pages", async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 1000 })
        await setReadingStyle(page, "Dual-stitched")

        await page.goto("/")
        await page
          .locator("[data-mushaf]")
          .waitFor({ state: "visible", timeout: 15_000 })
        await expect(page.locator("[data-mushaf]")).toHaveAttribute(
          "data-page",
          "1",
        )

        const box = await page.locator("[data-mushaf]").boundingBox()
        const y = box!.y + box!.height / 2
        const startX = box!.x + box!.width * 0.15
        await dragHorizontally(page, startX, startX + 150, y)

        await expect(page.locator("[data-mushaf]")).toHaveAttribute(
          "data-page",
          "3",
        )
      })

      test("drag feedback shows a page range", async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 1000 })
        await setReadingStyle(page, "Dual-stitched")

        await page.goto("/")
        await page
          .locator("[data-mushaf]")
          .waitFor({ state: "visible", timeout: 15_000 })

        const box = await page.locator("[data-mushaf]").boundingBox()
        const y = box!.y + box!.height / 2
        const startX = box!.x + box!.width * 0.15

        await page.mouse.move(startX, y)
        await page.mouse.down()
        for (let i = 1; i <= 10; i++) {
          await page.mouse.move(startX + (150 * i) / 10, y)
        }

        await expect(page.locator(".drag-feedback-badge")).toBeVisible({
          timeout: 10_000,
        })
        const text = await page
          .locator(".drag-feedback-badge")
          .evaluate((el) => el.querySelector("div")?.textContent)
        await page.mouse.up()

        expect(text).toBe("3-4")
      })

      test("dual frame borders are correct", async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 1000 })
        await setReadingStyle(page, "Dual-stitched")

        await page.goto("/")
        await page
          .locator("[data-mushaf]")
          .waitFor({ state: "visible", timeout: 15_000 })

        const frames = await getFrameBorderOrientations(page)
        expect(frames).toHaveLength(2)
        for (const frame of frames) {
          expect(frame.direction).toBe("ltr")
          expect(frame.topLeftX).not.toBeNull()
          expect(frame.topRightX).not.toBeNull()
          expect(frame.topLeftX!).toBeLessThan(frame.topRightX!)
        }
      })

      test("last page still shows two slots", async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 1000 })
        await setReadingStyle(page, "Dual-stitched")

        await page.goto("/#/m/madinah/604")
        await page
          .locator("[data-mushaf]")
          .waitFor({ state: "visible", timeout: 15_000 })
        await expect(page.locator("[data-mushaf]")).toHaveAttribute(
          "data-dual-stitched",
          "true",
        )

        await expect(page.locator(".mushaf-half-frame")).toHaveCount(2)
        await expect(page.locator(".mushaf-page-text")).toHaveCount(1)
      })
    })
  })

  test.describe("Force fit", () => {
    test("hidden on Detached, shown once switched to Mushaf mode", async ({
      page,
    }) => {
      await page.goto("/")
      const forceFitLabel = page
        .locator('[aria-label="stateful-form-label-wrapper"]')
        .filter({ hasText: "Force fit" })

      await openSidebar(page)
      await expect(forceFitLabel).toHaveCount(0)
      await closeSidebar(page)

      await setReadingStyle(page, "Mono-stitched")
      const box = await page.locator("[data-mushaf]").boundingBox()
      const y = box!.y + box!.height / 2
      const startX = box!.x + box!.width * 0.85
      await dragHorizontally(page, startX, startX - 300, y)
      await expect(forceFitLabel).toBeVisible({ timeout: 10_000 })
    })

    test("shrinks the font until the page has no overflow", async ({
      page,
    }) => {
      await setReadingStyle(page, "Mono-stitched")
      // small viewport forces overflow at the default font size regardless
      // of which page's content is on screen
      await page.setViewportSize({ width: 500, height: 380 })
      await gotoMushafPage(page, 2)

      const wrapper = page.locator(".mushaf-page-text").first()
      const beforeFont = await wrapper.evaluate(
        (el) => getComputedStyle(el).fontSize,
      )
      const overflowsBefore = await wrapper.evaluate(
        (el) => el.scrollHeight > (el.parentElement?.clientHeight ?? Infinity),
      )
      expect(overflowsBefore).toBe(true)

      const box = await page.locator("[data-mushaf]").boundingBox()
      const y = box!.y + box!.height / 2
      const startX = box!.x + box!.width * 0.85
      await dragHorizontally(page, startX, startX - 300, y)

      const toggleLabel = page
        .locator('[aria-label="stateful-form-label-wrapper"]')
        .filter({ hasText: "Force fit" })
        .first()
      await expect(toggleLabel).toBeVisible({ timeout: 10_000 })
      await toggleLabel.click()
      await closeSidebar(page)

      await expect
        .poll(
          () =>
            wrapper.evaluate(
              (el) =>
                el.scrollHeight <= (el.parentElement?.clientHeight ?? Infinity),
            ),
          { timeout: 5000 },
        )
        .toBe(true)

      const afterFont = await wrapper.evaluate(
        (el) => getComputedStyle(el).fontSize,
      )
      expect(parseFloat(afterFont)).toBeLessThan(parseFloat(beforeFont))
    })

    test("Dual-stitched fits each frame independently", async ({ page }) => {
      await setReadingStyle(page, "Dual-stitched")
      await page.setViewportSize({ width: 1100, height: 420 })
      await gotoMushafPage(page, 2)
      await expect(page.locator("[data-dual-stitched]")).toHaveCount(1)

      const frames = page.locator(".mushaf-page-text")
      await expect(frames).toHaveCount(2)

      const box = await page.locator("[data-mushaf]").boundingBox()
      const y = box!.y + box!.height / 2
      const startX = box!.x + box!.width * 0.85
      await dragHorizontally(page, startX, startX - 300, y)

      const toggleLabel = page
        .locator('[aria-label="stateful-form-label-wrapper"]')
        .filter({ hasText: "Force fit" })
        .first()
      await expect(toggleLabel).toBeVisible({ timeout: 10_000 })
      await toggleLabel.click()
      await closeSidebar(page)

      for (const frame of await frames.all()) {
        await expect
          .poll(
            () =>
              frame.evaluate(
                (el) =>
                  el.scrollHeight <=
                  (el.parentElement?.clientHeight ?? Infinity),
              ),
            { timeout: 5000 },
          )
          .toBe(true)
      }
    })
  })

  test.describe("Verse marker line-pitch safety", () => {
    test("manually tiny font size still keeps the marker within its line", async ({
      page,
    }) => {
      await setReadingStyle(page, "Mono-stitched")
      await gotoMushafPage(page, 2)

      const box = await page.locator("[data-mushaf]").boundingBox()
      const y = box!.y + box!.height / 2
      const startX = box!.x + box!.width * 0.85
      await dragHorizontally(page, startX, startX - 300, y)
      await expect(
        page.locator('[aria-label="settings-backup-button"]'),
      ).toBeVisible({ timeout: 10_000 })

      await selectComboBox("15", page, { formLabel: "Size" })
      await closeSidebar(page)

      const marker = page.locator('[aria-label="verse-bookmarker-btn"]').first()
      await expect(marker).toBeVisible()

      // line pitch at 15px font = 2 * 15 = 30px; the marker must fit inside
      // it, or it overflows into the next line and desyncs the ruled lines
      await expect
        .poll(async () => (await marker.boundingBox())!.height, {
          timeout: 5000,
        })
        .toBeLessThanOrEqual(31)
    })

    test("force-fit shrinking past the marker's native size still keeps it within its line", async ({
      page,
    }) => {
      await setReadingStyle(page, "Mono-stitched")
      await page.setViewportSize({ width: 500, height: 250 })
      await gotoMushafPage(page, 2)

      const box = await page.locator("[data-mushaf]").boundingBox()
      const y = box!.y + box!.height / 2
      const startX = box!.x + box!.width * 0.85
      await dragHorizontally(page, startX, startX - 300, y)

      const toggleLabel = page
        .locator('[aria-label="stateful-form-label-wrapper"]')
        .filter({ hasText: "Force fit" })
        .first()
      await expect(toggleLabel).toBeVisible({ timeout: 10_000 })
      await toggleLabel.click()
      await closeSidebar(page)

      // At this viewport, force-fit may bottom out at its 10px floor without fully clearing
      // overflow; the marker must still respect whatever line pitch that floor produces.
      const wrapper = page.locator(".mushaf-page-text").first()
      await expect
        .poll(
          () =>
            wrapper.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
          { timeout: 5000 },
        )
        .toBeLessThan(42.5)

      const fontPx = await wrapper.evaluate((el) =>
        parseFloat(getComputedStyle(el).fontSize),
      )
      const marker = page.locator('[aria-label="verse-bookmarker-btn"]').first()
      const markerBox = await marker.boundingBox()

      expect(markerBox!.height).toBeLessThanOrEqual(2 * fontPx + 1)
    })
  })
})

/** The page's rendered Arabic word sequence, skips the verse marker and the Bismillah glyph */
async function getRenderedWords(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const container = document.querySelector(".mushaf-page-text")
    if (!container) return []
    const text = Array.from(container.querySelectorAll(".mushaf-word"))
      .map((el) => el.textContent ?? "")
      .join(" ")
    return text.split(/\s+/).filter(Boolean)
  })
}
