import { expect, test } from "@playwright/test"
import {
  clickOn,
  closePaperDialog,
  closeSidebar,
  getPaperDialog,
  hasElement,
  hasNoElement,
  hasNoText,
  hasText,
  openExegesisDialog,
  openSidebar,
  selectComboBox,
  toggleExegesis,
} from "./tools/interactivity"
import { untilUsable, visitFresh } from "./tools/state"

test.describe("ExegesisDialog", () => {
  test.describe("with an exegesis selected", () => {
    test.beforeEach(async ({ page }) => {
      await visitFresh(page)
      await toggleExegesis("Ali Quli Qara'i", page)
    })

    test("opens on long-press and shows exegesis content", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()

      // verse 7 translation text
      await expect(
        dialog.getByText(/the path of those whom You have blessed/i),
      ).toBeVisible()
    })

    test("interlinear section renders Arabic words", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()

      await hasElement(undefined, dialog, { className: "arabic-lex" })
    })

    test("footnotes render for verse with footnote markers", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()

      await hasElement(undefined, dialog, { className: "marker-type-f" })

      // footnote 1 of verse 7 starts with "For further Qur'anic references..."
      await expect(dialog.getByText(/For further Qur/i)).toBeVisible()
    })

    test("Q-markers render as dotted-underline links", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()

      const qMarker = await hasElement(undefined, dialog, {
        className: "marker-type-q",
      })
      const textDecorationStyle = await qMarker.evaluate(
        (el) => window.getComputedStyle(el).textDecorationStyle,
      )
      expect(textDecorationStyle).toBe("dotted")
    })

    test("clicking a footnote superscript scrolls to the footnote", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()

      await clickOn(undefined, dialog, { className: "marker-type-f" })

      // the target footnote item is present and visible
      await expect(dialog.locator("li").first()).toBeVisible()
    })

    test.describe("footnote return button", () => {
      test("shown upon clicking a footnote", async ({ page }) => {
        const dialog = await openExegesisDialog(page, "1:7")
        await expect(dialog).toBeVisible()

        await hasNoElement(undefined, dialog, {
          ariaLabel: "footnote-return-btn",
        })

        await clickOn(undefined, dialog, { className: "marker-type-f" })

        const returnBtnLoc = { ariaLabel: "footnote-return-btn" }
        const returnBtn = await hasElement(undefined, dialog, returnBtnLoc)
        await returnBtn.click()
        await hasNoElement(undefined, dialog, returnBtnLoc)
      })

      test("hidden after navigating to another verse", async ({ page }) => {
        const dialog = await openExegesisDialog(page, "1:7")
        await expect(dialog).toBeVisible()

        await clickOn(undefined, dialog, { className: "marker-type-f" })
        await hasElement(undefined, dialog, {
          ariaLabel: "footnote-return-btn",
        })

        // verse 7 is the last verse of chapter 1, next is disabled there
        await clickOn(undefined, dialog, { ariaLabel: "prev-verse-btn" })
        await hasNoElement(undefined, dialog, {
          ariaLabel: "footnote-return-btn",
        })
      })
    })

    test("clicking a Q-marker changes the verse indicator", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()

      const verseIndicator = await hasElement(undefined, dialog, {
        ariaLabel: "verse-indicator",
      })
      await hasText("7", verseIndicator)

      // footnote 1 of verse 7 has Q-marker "4:69"
      await clickOn(undefined, dialog, { className: "marker-type-q" })

      await hasNoText("7", verseIndicator)
    })

    test("back button returns user to original verse", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()

      // no Q-navigation yet
      await hasNoElement(undefined, dialog, { ariaLabel: "nav-back-btn" })

      await clickOn(undefined, dialog, { className: "marker-type-q" })
      await hasElement(undefined, dialog, { ariaLabel: "nav-back-btn" })

      const verseIndicator = await hasElement(undefined, dialog, {
        ariaLabel: "verse-indicator",
      })
      await hasNoText("7", verseIndicator)

      await clickOn(undefined, dialog, { ariaLabel: "nav-back-btn" })

      await hasText("7", verseIndicator)
      await hasNoElement(undefined, dialog, { ariaLabel: "nav-back-btn" })
    })

    test("prev button decrements the verse number", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:4")
      await expect(dialog).toBeVisible()

      const verseIndicator = await hasElement(undefined, dialog, {
        ariaLabel: "verse-indicator",
      })
      await hasText("4", verseIndicator)

      await clickOn(undefined, dialog, { ariaLabel: "prev-verse-btn" })
      await hasText("3", verseIndicator)
      await expect(page.locator('[aria-label="title-title"]')).toContainText(
        "Al-Faatiha",
      )
    })

    test("next button increments the verse number", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:4")
      await expect(dialog).toBeVisible()

      const verseIndicator = await hasElement(undefined, dialog, {
        ariaLabel: "verse-indicator",
      })
      await hasText("4", verseIndicator)

      await clickOn(undefined, dialog, { ariaLabel: "next-verse-btn" })
      await hasText("5", verseIndicator)
      await expect(page.locator('[aria-label="title-title"]')).toContainText(
        "Al-Faatiha",
      )
    })

    test("prev button on first verse navigates to the chapter intro", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible()

      const verseIndicator = await hasElement(undefined, dialog, {
        ariaLabel: "verse-indicator",
      })
      await hasText("1", verseIndicator)

      // prev is enabled on verse 1, it steps back to the intro (verse 0)
      const prevBtn = await hasElement(undefined, dialog, {
        ariaLabel: "prev-verse-btn",
      })
      await expect(prevBtn).toBeEnabled()

      await prevBtn.click()
      await hasText("Intro", verseIndicator)

      await expect(prevBtn).toBeDisabled()
    })

    test("prev/next rewrite URL to match current verse", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible()

      await clickOn(undefined, dialog, { ariaLabel: "next-verse-btn" })
      await expect(page).toHaveURL(/#\/e\/1\/2$/)

      await clickOn(undefined, dialog, { ariaLabel: "prev-verse-btn" })
      await expect(page).toHaveURL(/#\/e\/1\/1$/)
    })

    test("prev/next rewrite URL for the chapter intro", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible()

      await clickOn(undefined, dialog, { ariaLabel: "prev-verse-btn" })
      await expect(page).toHaveURL(/#\/e\/1\/0$/)
    })

    test("prev/next traversal persists verse position", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:4")
      await expect(dialog).toBeVisible()

      const verseIndicator = await hasElement(undefined, dialog, {
        ariaLabel: "verse-indicator",
      })
      await hasText("4", verseIndicator)

      await clickOn(undefined, dialog, { ariaLabel: "next-verse-btn" })
      await hasText("5", verseIndicator)

      const savedScroll = await page.evaluate(() => {
        const raw = localStorage.getItem("userSettings")
        return raw ? JSON.parse(raw).lastScroll : null
      })
      expect(savedScroll).toEqual({ chapterId: 1, verse: 5 })
    })

    test("does not persist verse 0 for scroll position", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible()

      const verseIndicator = await hasElement(undefined, dialog, {
        ariaLabel: "verse-indicator",
      })
      await hasText("1", verseIndicator)

      const savedBefore = await page.evaluate(() => {
        const raw = localStorage.getItem("userSettings")
        return raw ? JSON.parse(raw).lastScroll : null
      })

      await clickOn(undefined, dialog, { ariaLabel: "prev-verse-btn" })
      await hasText("Intro", verseIndicator)

      // verse 0 is not a real verse, the saved position must not change
      const savedAfter = await page.evaluate(() => {
        const raw = localStorage.getItem("userSettings")
        return raw ? JSON.parse(raw).lastScroll : null
      })
      expect(savedAfter).toEqual(savedBefore)
    })

    test("next button is disabled on last verse of chapter", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()

      const verseIndicator = await hasElement(undefined, dialog, {
        ariaLabel: "verse-indicator",
      })
      await hasText("7", verseIndicator)

      // chapter 1 has 7 verses
      const nextBtn = await hasElement(undefined, dialog, {
        ariaLabel: "next-verse-btn",
      })
      await expect(nextBtn).toBeDisabled()
    })

    test("exegesis can be scrolled", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()

      // wait for content to load before measuring
      await expect(
        dialog.getByText(/the path of those whom You have blessed/i),
      ).toBeVisible()

      // the exegesis scroll area must have overflow-y: auto
      const hasScrollableArea = await dialog.evaluate((dialogEl) => {
        return Array.from(dialogEl.querySelectorAll<HTMLElement>("*")).some(
          (el) => window.getComputedStyle(el).overflowY === "auto",
        )
      })

      expect(hasScrollableArea).toBe(true)
    })

    test("interlinear section default to 30% height", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()

      // wait for Arabic words to render before measuring heights
      await hasElement(undefined, dialog, { className: "arabic-lex" })

      const ratio = await dialog.evaluate((dialogEl) => {
        const outer = dialogEl.firstElementChild as HTMLElement | null
        if (!outer) return null

        const mainContent = outer.firstElementChild as HTMLElement | null
        if (!mainContent) return null

        const interlinear = mainContent.firstElementChild as HTMLElement | null
        if (!interlinear || !interlinear.querySelector(".arabic-lex"))
          return null

        const mainH = mainContent.clientHeight
        const intH = interlinear.clientHeight
        return mainH > 0 ? intH / mainH : null
      })

      expect(ratio).not.toBeNull()
      // allow 35% for subpixel rounding
      expect(ratio!).toBeLessThanOrEqual(0.35)
    })

    test("exegesis content area has non-zero height", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()

      await expect(
        dialog.getByText(/the path of those whom You have blessed/i),
      ).toBeVisible()

      // SplitPane structure: Container > [Cell(interlinear), Divider, Cell(exegesis)]
      const exegesisHeight = await dialog.evaluate((dialogEl) => {
        const outer = dialogEl.firstElementChild as HTMLElement | null
        const mainContent = outer?.firstElementChild as HTMLElement | null
        const exegesisArea = mainContent?.children[2] as HTMLElement | null
        return exegesisArea?.clientHeight ?? 0
      })

      expect(exegesisHeight).toBeGreaterThan(50)
    })

    test("verse traversal controls remains visible", async ({ page }) => {
      // shrink the viewport so exegesis text overflows its scroll area
      await page.setViewportSize({ width: 1024, height: 320 })

      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()
      await expect(
        dialog.getByText(/the path of those whom You have blessed/i),
      ).toBeVisible()
      // let async content (interlinear words, footnotes) finish settling
      await page.waitForTimeout(500)

      const verseIndicator = await hasElement(undefined, dialog, {
        ariaLabel: "verse-indicator",
      })
      const boxBefore = await verseIndicator.boundingBox()
      expect(boxBefore).not.toBeNull()

      // scroll the actual overflowing content region
      const scrolled = await dialog.evaluate((dialogEl) => {
        const scrollable = Array.from(
          dialogEl.querySelectorAll<HTMLElement>("*"),
        ).find(
          (el) =>
            window.getComputedStyle(el).overflowY === "auto" &&
            el.scrollHeight > el.clientHeight,
        )
        if (!scrollable) return false
        scrollable.scrollBy(0, 300)
        return true
      })
      expect(scrolled).toBe(true)
      await page.waitForTimeout(200)

      const boxAfter = await verseIndicator.boundingBox()
      expect(boxAfter).not.toBeNull()

      // its position must not shift with the scroll
      expect(Math.abs(boxAfter!.y - boxBefore!.y)).toBeLessThan(5)
    })
  })

  test.describe("with an exegesis source that includes commentary", () => {
    test.beforeEach(async ({ page }) => {
      await visitFresh(page)
      await toggleExegesis("Mir Ahmad Ali", page)
    })

    test("renders both translation and commentary text for a verse", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible()

      // verse 1:1 translation text
      await expect(
        dialog.getByText(/All-beneficent, the All-merciful/i),
      ).toBeVisible()

      // verse 1:1 commentary text, distinct from translation
      await expect(
        dialog.getByText(/wide and comprehending implications/i),
      ).toBeVisible()
    })

    test("renders the commentary after the translation", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible()

      const translation = dialog
        .getByText(/All-beneficent, the All-merciful/i)
        .first()
      const exegesis = dialog
        .getByText(/wide and comprehending implications/i)
        .first()
      await expect(exegesis).toBeVisible()

      const [translationTop, exegesisTop] = await Promise.all([
        translation.evaluate((el) => el.getBoundingClientRect().top),
        exegesis.evaluate((el) => el.getBoundingClientRect().top),
      ])

      expect(exegesisTop).toBeGreaterThan(translationTop)
    })
  })

  test.describe("with more than one exegesis source active", () => {
    test.beforeEach(async ({ page }) => {
      await visitFresh(page)
      await toggleExegesis("Ali Quli Qara'i", page)
      await toggleExegesis("Mir Ahmad Ali", page)
    })

    test("renders a swipeable carousel with no visible arrow controls", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible()

      await hasElement("carousel", dialog, { role: "region" })

      // exactly one slide visible at a time
      await expect(
        dialog.locator('[aria-roledescription="slide"][aria-hidden="false"]'),
      ).toHaveCount(1)

      // arrow controls exist but stay hidden, no controller prop is passed
      await expect(
        dialog.locator('[aria-label="carousel-previous-slide"]'),
      ).toBeHidden()
      await expect(
        dialog.locator('[aria-label="carousel-next-slide"]'),
      ).toBeHidden()
    })

    test("swiping changes both the header and the content", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible()

      const carousel = await hasElement("carousel", dialog, { role: "region" })

      const visibleSlide = () =>
        dialog.locator('[aria-roledescription="slide"][aria-hidden="false"]')

      const namesBefore = await Promise.all([
        visibleSlide().getByText("Ali Quli Qara'i").count(),
        visibleSlide().getByText("Mir Ahmad Ali").count(),
      ])
      // exactly one source name shows before the swipe
      expect(namesBefore[0] + namesBefore[1]).toBe(1)
      const showingAliQuliFirst = namesBefore[0] === 1

      const box = await carousel.boundingBox()
      expect(box).not.toBeNull()
      const startX = box!.x + box!.width / 2
      const startY = box!.y + 20

      // the carousel only reacts to pointer events, dispatch the drag directly
      await carousel.dispatchEvent("pointerdown", {
        clientX: startX,
        clientY: startY,
        bubbles: true,
        cancelable: true,
      })
      await carousel.dispatchEvent("pointermove", {
        clientX: startX - 150,
        clientY: startY,
        bubbles: true,
        cancelable: true,
      })
      await carousel.dispatchEvent("pointerup", {
        clientX: startX - 150,
        clientY: startY,
        bubbles: true,
        cancelable: true,
      })
      await page.waitForTimeout(500) // carousel slide transition

      const other = showingAliQuliFirst ? "Mir Ahmad Ali" : "Ali Quli Qara'i"
      await expect(visibleSlide().getByText(other)).toBeVisible()

      const original = showingAliQuliFirst ? "Ali Quli Qara'i" : "Mir Ahmad Ali"
      await expect(visibleSlide().getByText(original)).toHaveCount(0)
    })

    test("long commentary can still be scrolled", async ({ page }) => {
      // shrink the viewport so the active slide's content overflows
      await page.setViewportSize({ width: 1024, height: 320 })

      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible()

      await hasElement("carousel", dialog, { role: "region" })
      await page.waitForTimeout(300)

      const scrolled = await dialog.evaluate((dialogEl) => {
        const scrollable = Array.from(
          dialogEl.querySelectorAll<HTMLElement>("*"),
        ).find(
          (el) =>
            window.getComputedStyle(el).overflowY === "auto" &&
            el.scrollHeight > el.clientHeight,
        )
        if (!scrollable) return null
        scrollable.scrollBy(0, 300)
        return { scrollTop: scrollable.scrollTop }
      })

      expect(scrolled).not.toBeNull()
      expect(scrolled!.scrollTop).toBeGreaterThan(0)
    })
  })

  test.describe("on first open", () => {
    test.beforeEach(async ({ page }) => {
      await visitFresh(page)
    })

    test("defaults to Ali Quli in English", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible()

      await expect(dialog.getByText(/In the Name of Allah/i)).toBeVisible()

      const settings = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("userSettings") || "{}"),
      )
      expect(settings.exegesis).toEqual(["aliquli/en-US"])
      expect(settings.hasSeenExegesisDialog).toBe(true)
    })

    test("falls back to English when the user's locale has no Ali Quli translation", async ({
      page,
    }) => {
      await openSidebar(page)
      await selectComboBox("Indonesian", page, { formLabel: "Language" })
      await closeSidebar(page)
      await page.waitForTimeout(300)

      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText(/In the Name of Allah/i)).toBeVisible()

      const settings = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("userSettings") || "{}"),
      )
      expect(settings.exegesis).toEqual(["aliquli/en-US"])
    })

    test("does not override a selection made before the dialog was ever opened", async ({
      page,
    }) => {
      // a user who picked an exegesis via Settings without long-pressing a verse first
      await toggleExegesis("Ali Quli Qara'i", page)

      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible()

      const settings = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("userSettings") || "{}"),
      )
      expect(settings.exegesis).toEqual(["aliquli/en-US"])
      expect(settings.hasSeenExegesisDialog).toBe(true)
    })
  })

  test.describe("with no exegesis selected", () => {
    test.beforeEach(async ({ page }) => {
      await visitFresh(page)

      // trigger the default selection, then deselect it via Settings
      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible()
      await closePaperDialog(page)
      await toggleExegesis("Ali Quli Qara'i", page)
    })

    test("still shows the interlinear text", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()

      await hasElement(undefined, dialog, { className: "arabic-lex" })
    })

    test("shows the 'no exegesis selected' message", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()

      await hasText("No exegesis selected — enable one in Settings.", dialog)
    })

    test("gives the interlinear pane 70% height instead of 30%", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible()
      await hasElement(undefined, dialog, { className: "arabic-lex" })

      const ratio = await dialog.evaluate((dialogEl) => {
        const outer = dialogEl.firstElementChild as HTMLElement | null
        if (!outer) return null
        const mainContent = outer.firstElementChild as HTMLElement | null
        if (!mainContent) return null
        const interlinear = mainContent.firstElementChild as HTMLElement | null
        if (!interlinear || !interlinear.querySelector(".arabic-lex"))
          return null

        const mainH = mainContent.clientHeight
        const intH = interlinear.clientHeight
        return mainH > 0 ? intH / mainH : null
      })

      expect(ratio).not.toBeNull()
      // allow 5% for subpixel rounding, mirroring the 30% test above
      expect(ratio!).toBeGreaterThanOrEqual(0.65)
    })
  })

  test.describe("when URL pattern is /e/$chapter/$verse", () => {
    test("open the verse dialog", async ({ page }) => {
      await page.goto("/#/e/1/7")
      await untilUsable(page)

      const dialog = await getPaperDialog(page)
      await expect(dialog).toBeVisible()

      const verseIndicator = await hasElement(undefined, dialog, {
        ariaLabel: "verse-indicator",
      })
      await hasText("7", verseIndicator)

      // the always-mounted VerseLookup combobox must not silently rewrite the URL
      await page.waitForTimeout(500)
      expect(page.url()).toContain("/#/e/1/7")
    })

    test("shows not-found on an empty dialog", async ({ page }) => {
      // chapter 1 only has 7 verses
      await page.goto("/#/e/1/999")
      await untilUsable(page)

      const dialog = await getPaperDialog(page)
      await expect(dialog).toBeVisible()
      await hasText("This verse could not be found.", dialog)
    })

    test("shows the chapter introduction for verse 0", async ({ page }) => {
      await page.goto("/#/e/1/0")
      await untilUsable(page)

      const dialog = await getPaperDialog(page)
      await expect(dialog).toBeVisible()

      const verseIndicator = await hasElement(undefined, dialog, {
        ariaLabel: "verse-indicator",
      })
      await hasText("Intro", verseIndicator)

      // Ali Quli Qara'i's chapter 1 description text
      await expect(dialog.getByText(/The Opening/i)).toBeVisible()

      const prevBtn = await hasElement(undefined, dialog, {
        ariaLabel: "prev-verse-btn",
      })
      await expect(prevBtn).toBeDisabled()

      // no interlinear text
      await expect(dialog.locator(".arabic-lex")).toHaveCount(0)

      // content area gets 100% height, no interlinear pane
      const ratio = await dialog.evaluate((dialogEl) => {
        const outer = dialogEl.firstElementChild as HTMLElement | null
        const mainContent = outer?.firstElementChild as HTMLElement | null
        const exegesisArea = mainContent?.children[2] as HTMLElement | null
        if (!mainContent || !exegesisArea) return null

        const mainH = mainContent.clientHeight
        const contentH = exegesisArea.clientHeight
        return mainH > 0 ? contentH / mainH : null
      })
      expect(ratio).not.toBeNull()
      // small margin for the SplitPane divider's own height
      expect(ratio!).toBeGreaterThanOrEqual(0.9)
    })

    test("allow /e/ revisit to update dialog content", async ({ page }) => {
      await page.goto("/#/e/1/2")
      await untilUsable(page)

      const dialog = await getPaperDialog(page)
      await expect(dialog).toBeVisible()
      const verseIndicator = await hasElement(undefined, dialog, {
        ariaLabel: "verse-indicator",
      })
      await hasText("2", verseIndicator)
      const title = page.locator('[aria-label="title-title"]')
      await expect(title).toContainText("Al-Faatiha")

      // manually navigate to a different /e/ target, an in-app hash change
      await page.goto("/#/e/4/8")
      await page.waitForTimeout(500)

      await hasText("8", verseIndicator)
      await expect(title).toContainText("An-Nisaa")
    })

    test("?tafsir shows only that source without touching saved settings", async ({
      page,
    }) => {
      await visitFresh(page)

      // trigger the organic first-open default (Ali Quli) and close, so we
      // have a saved selection to check remains untouched below
      const first = await openExegesisDialog(page, "1:1")
      await expect(first).toBeVisible()
      await closePaperDialog(page)

      await page.goto("/#/e/1/1?tafsir=ibnkathir")
      await untilUsable(page)
      const dialog = await getPaperDialog(page)
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText(/Tafsir Ibn Kathir/i)).toBeVisible()
      await expect(dialog.getByText(/Tafsir Ali Quli Qara'i/i)).toHaveCount(0)

      const settings = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("userSettings") || "{}"),
      )
      expect(settings.exegesis).toEqual(["aliquli/en-US"])
    })

    test("invalid ?tafsir falls back to Mir Ahmad Ali", async ({ page }) => {
      await visitFresh(page)

      await page.goto("/#/e/1/1?tafsir=not-a-real-work")
      await untilUsable(page)
      const dialog = await getPaperDialog(page)
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText(/Tafsir Mir Ahmad Ali/i)).toBeVisible()
    })

    test("?transliteration=1 shows transliteration in the interlinear pane", async ({
      page,
    }) => {
      await visitFresh(page)

      await page.goto("/#/e/1/1?tafsir=aliquli&transliteration=1")
      await untilUsable(page)
      const dialog = await getPaperDialog(page)
      await expect(dialog).toBeVisible()
      await expect(
        dialog.locator('[data-testid="word-transliteration"]').first(),
      ).toBeVisible({ timeout: 5000 })
    })

    test("?locale= resolves exegesis for that locale without touching saved settings", async ({
      page,
    }) => {
      await visitFresh(page)

      await page.goto("/#/e/1/1?tafsir=ibnkathir&locale=id-ID")
      await untilUsable(page)
      const dialog = await getPaperDialog(page)
      await expect(dialog).toBeVisible()
      // No exegesis source has an Indonesian variant yet, so this still
      // resolves to the English text, but by going through the id-ID
      // override rather than the app's current locale setting.
      await expect(dialog.getByText(/Tafsir Ibn Kathir/i)).toBeVisible()

      const settings = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("userSettings") || "{}"),
      )
      expect(settings.locale).not.toBe("id-ID")
    })
  })
})
