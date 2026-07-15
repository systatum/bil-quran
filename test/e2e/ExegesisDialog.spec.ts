import { expect, test } from "@playwright/test"
import {
  closePaperDialog,
  closeSidebar,
  getPaperDialog,
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

    // ── Rendering ────────────────────────────────────────────────────────────

    test("opens on long-press and shows exegesis content", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      // Verse 7 translation text is rendered inside the dialog
      await expect(
        dialog.getByText(/the path of those whom You have blessed/i),
      ).toBeVisible({ timeout: 8_000 })
    })

    test("interlinear section renders Arabic words", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      // At least one Arabic word should appear in the interlinear section
      await expect(dialog.locator(".arabic-lex").first()).toBeVisible({
        timeout: 8_000,
      })
    })

    test("footnotes render for verse with footnote markers", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      // Verse 1:7 has 4 footnotes; F-marker superscripts are visible in the text
      await expect(dialog.locator("a.marker-type-f").first()).toBeVisible({
        timeout: 8_000,
      })

      // Footnote 1 of verse 7 starts with "For further Qur'anic references…"
      await expect(dialog.getByText(/For further Qur/i)).toBeVisible({
        timeout: 8_000,
      })
    })

    test("Q-markers render as dotted-underline links", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      // Footnote 1 of verse 7 contains Q-markers like "4:69" and "19:58"
      const qMarker = dialog.locator("a.marker-type-q").first()
      await expect(qMarker).toBeVisible({ timeout: 8_000 })

      // Confirm the dotted-underline CSS is applied
      const textDecorationStyle = await qMarker.evaluate(
        (el) => window.getComputedStyle(el).textDecorationStyle,
      )
      expect(textDecorationStyle).toBe("dotted")
    })

    // ── Click and navigation ─────────────────────────────────────────────────

    test("clicking a footnote superscript scrolls to the footnote", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      // Click the first footnote superscript in the translation text
      const fMarker = dialog.locator("a.marker-type-f").first()
      await expect(fMarker).toBeVisible({ timeout: 8_000 })
      await fMarker.click()

      // The target footnote item should be present and visible
      const footnoteItem = dialog.locator("li").first()
      await expect(footnoteItem).toBeVisible({ timeout: 4_000 })
    })

    test("clicking a Q-marker changes the verse indicator", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      // Verse indicator starts at 7
      const verseIndicator = dialog.locator('[data-testid="verse-indicator"]')
      await expect(verseIndicator).toHaveText("7", { timeout: 5_000 })

      // Footnote 1 of verse 7 has Q-marker "4:69" — click it
      const qMarker = dialog.locator("a.marker-type-q").first()
      await expect(qMarker).toBeVisible({ timeout: 8_000 })
      await qMarker.click()

      // After navigation the verse indicator no longer shows 7
      await expect(verseIndicator).not.toHaveText("7", { timeout: 5_000 })
    })

    test("back button returns user to original verse", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      // Without Q-navigation there are only 2 traversal buttons (prev + next)
      await expect(dialog.locator("button")).toHaveCount(2, { timeout: 5_000 })

      // Click the first Q-marker (navigates to e.g. 4:69)
      const qMarker = dialog.locator("a.marker-type-q").first()
      await expect(qMarker).toBeVisible({ timeout: 8_000 })
      await qMarker.click()

      // A back button is now visible (3 buttons: back + prev + next)
      await expect(dialog.locator("button")).toHaveCount(3, { timeout: 3_000 })

      // Verse indicator has changed
      const verseIndicator = dialog.locator('[data-testid="verse-indicator"]')
      await expect(verseIndicator).not.toHaveText("7", { timeout: 3_000 })

      // Click the first button (back)
      await dialog.locator("button").first().click()

      // Verse indicator returns to 7 and back button disappears
      await expect(verseIndicator).toHaveText("7", { timeout: 3_000 })
      await expect(dialog.locator("button")).toHaveCount(2, { timeout: 3_000 })
    })

    // ── Prev / Next navigation ───────────────────────────────────────────────

    test("prev button decrements the verse number", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:4")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      const verseIndicator = dialog.locator('[data-testid="verse-indicator"]')
      await expect(verseIndicator).toHaveText("4", { timeout: 5_000 })

      await dialog.locator('[data-testid="prev-verse-btn"]').click()
      await expect(verseIndicator).toHaveText("3", { timeout: 3_000 })
    })

    test("next button increments the verse number", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:4")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      const verseIndicator = dialog.locator('[data-testid="verse-indicator"]')
      await expect(verseIndicator).toHaveText("4", { timeout: 5_000 })

      await dialog.locator('[data-testid="next-verse-btn"]').click()
      await expect(verseIndicator).toHaveText("5", { timeout: 3_000 })
    })

    test("prev button on first verse navigates to the chapter intro", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      const verseIndicator = dialog.locator('[data-testid="verse-indicator"]')
      await expect(verseIndicator).toHaveText("1", { timeout: 5_000 })

      // prev button is enabled on verse 1 — it steps back to the intro (verse 0)
      await expect(
        dialog.locator('[data-testid="prev-verse-btn"]'),
      ).toBeEnabled({ timeout: 5_000 })

      await dialog.locator('[data-testid="prev-verse-btn"]').click()
      await expect(verseIndicator).toHaveText("Intro", { timeout: 3_000 })

      // prev button is disabled once at the intro
      await expect(
        dialog.locator('[data-testid="prev-verse-btn"]'),
      ).toBeDisabled({ timeout: 5_000 })
    })

    test("next button is disabled on last verse of chapter", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      const verseIndicator = dialog.locator('[data-testid="verse-indicator"]')
      await expect(verseIndicator).toHaveText("7", { timeout: 5_000 })

      // Chapter 1 has 7 verses — next button should be disabled
      await expect(
        dialog.locator('[data-testid="next-verse-btn"]'),
      ).toBeDisabled({ timeout: 5_000 })
    })

    // ── Scroll / overflow guards ─────────────────────────────────────────────

    test("exegesis can be scrolled", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      // Wait for content to load before measuring
      await expect(
        dialog.getByText(/the path of those whom You have blessed/i),
      ).toBeVisible({ timeout: 8_000 })

      // The ExegesisScrollArea must have overflow-y: auto — it's the second
      // direct child of MainContent (after InterlinearSection)
      const hasScrollableArea = await dialog.evaluate((dialogEl) => {
        // Walk all descendants; find ones with overflow-y: auto
        return Array.from(dialogEl.querySelectorAll<HTMLElement>("*")).some(
          (el) => window.getComputedStyle(el).overflowY === "auto",
        )
      })

      expect(hasScrollableArea).toBe(true)
    })

    test("interlinear section default to 30% height", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      // Wait for Arabic words to render before measuring heights
      await expect(dialog.locator(".arabic-lex").first()).toBeVisible({
        timeout: 8_000,
      })

      const ratio = await dialog.evaluate((dialogEl) => {
        // Outer is the first element child of paper-dialog-content
        const outer = dialogEl.firstElementChild as HTMLElement | null
        if (!outer) return null

        // MainContent is the first child of Outer
        const mainContent = outer.firstElementChild as HTMLElement | null
        if (!mainContent) return null

        // InterlinearSection is the first child of MainContent; it contains .arabic-lex
        const interlinear = mainContent.firstElementChild as HTMLElement | null
        if (!interlinear || !interlinear.querySelector(".arabic-lex"))
          return null

        const mainH = mainContent.clientHeight
        const intH = interlinear.clientHeight
        return mainH > 0 ? intH / mainH : null
      })

      expect(ratio).not.toBeNull()
      // Allow 35% to accommodate subpixel rounding
      expect(ratio!).toBeLessThanOrEqual(0.35)
    })

    test("exegesis content area has non-zero height", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      // Wait for content to load
      await expect(
        dialog.getByText(/the path of those whom You have blessed/i),
      ).toBeVisible({ timeout: 8_000 })

      // SplitPane structure: Container > [Cell(interlinear), Divider, Cell(exegesis)]
      // The exegesis cell is children[2] (children[1] is the Divider).
      const exegesisHeight = await dialog.evaluate((dialogEl) => {
        const outer = dialogEl.firstElementChild as HTMLElement | null
        const mainContent = outer?.firstElementChild as HTMLElement | null
        const exegesisArea = mainContent?.children[2] as HTMLElement | null
        return exegesisArea?.clientHeight ?? 0
      })

      expect(exegesisHeight).toBeGreaterThan(50)
    })

    test("verse traversal controls remains visible", async ({ page }) => {
      // shrink the viewport so the exegesis text overflows its scroll area
      await page.setViewportSize({ width: 1024, height: 320 })

      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })
      await expect(
        dialog.getByText(/the path of those whom You have blessed/i),
      ).toBeVisible({ timeout: 8_000 })
      // Let async content (interlinear words, footnotes) finish settling
      await page.waitForTimeout(500)

      const verseIndicator = dialog.locator('[data-testid="verse-indicator"]')
      await expect(verseIndicator).toBeVisible({ timeout: 5_000 })
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

      await expect(verseIndicator).toBeVisible({ timeout: 5_000 })
      const boxAfter = await verseIndicator.boundingBox()
      expect(boxAfter).not.toBeNull()

      // Its position within the viewport must not have shifted with the scroll
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
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      // Verse 1:1 translation text
      await expect(
        dialog.getByText(/All-beneficent, the All-merciful/i),
      ).toBeVisible({ timeout: 8_000 })

      // Verse 1:1 commentary text (the `exegesis` field), distinct from translation
      await expect(
        dialog.getByText(/wide and comprehending implications/i),
      ).toBeVisible({ timeout: 8_000 })
    })

    test("renders the commentary after the translation", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      const translation = dialog
        .getByText(/All-beneficent, the All-merciful/i)
        .first()
      const exegesis = dialog
        .getByText(/wide and comprehending implications/i)
        .first()
      await expect(exegesis).toBeVisible({ timeout: 8_000 })

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
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      const carousel = dialog.getByRole("region", { name: "carousel" })
      await expect(carousel).toBeVisible({ timeout: 8_000 })

      // Exactly one slide visible at a time
      await expect(
        dialog.locator('[aria-roledescription="slide"][aria-hidden="false"]'),
      ).toHaveCount(1)

      // Arrow controls exist (disabled state etc.) but must not be visible —
      // no `controller` prop is passed, so they're rendered display:none
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
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      const carousel = dialog.getByRole("region", { name: "carousel" })
      await expect(carousel).toBeVisible({ timeout: 8_000 })

      const visibleSlide = () =>
        dialog.locator('[aria-roledescription="slide"][aria-hidden="false"]')

      const namesBefore = await Promise.all([
        visibleSlide().getByText("Ali Quli Qara'i").count(),
        visibleSlide().getByText("Mir Ahmad Ali").count(),
      ])
      // Exactly one of the two source names is showing before the swipe
      expect(namesBefore[0] + namesBefore[1]).toBe(1)
      const showingAliQuliFirst = namesBefore[0] === 1

      const box = await carousel.boundingBox()
      expect(box).not.toBeNull()
      const startX = box!.x + box!.width / 2
      const startY = box!.y + 20

      // The carousel only reacts to pointer events (not plain mouse events),
      // so the drag gesture must be dispatched as such directly.
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
      await expect(visibleSlide().getByText(other)).toBeVisible({
        timeout: 3_000,
      })

      const original = showingAliQuliFirst ? "Ali Quli Qara'i" : "Mir Ahmad Ali"
      await expect(visibleSlide().getByText(original)).toHaveCount(0)
    })

    test("long commentary can still be scrolled", async ({ page }) => {
      // shrink the viewport so the active slide's content overflows
      await page.setViewportSize({ width: 1024, height: 320 })

      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      const carousel = dialog.getByRole("region", { name: "carousel" })
      await expect(carousel).toBeVisible({ timeout: 8_000 })
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
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      await expect(dialog.getByText(/In the Name of Allah/i)).toBeVisible({
        timeout: 8_000,
      })

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
      await expect(dialog).toBeVisible({ timeout: 8_000 })
      await expect(dialog.getByText(/In the Name of Allah/i)).toBeVisible({
        timeout: 8_000,
      })

      const settings = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("userSettings") || "{}"),
      )
      expect(settings.exegesis).toEqual(["aliquli/en-US"])
    })

    test("does not override a selection made before the dialog was ever opened", async ({
      page,
    }) => {
      // Simulate a user who picked an exegesis via Settings without ever
      // long-pressing a verse first.
      await toggleExegesis("Ali Quli Qara'i", page)

      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

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

      // Trigger the one-time default selection, then deselect it via Settings
      // so the empty state can be exercised through real UI interactions.
      const dialog = await openExegesisDialog(page, "1:1")
      await expect(dialog).toBeVisible({ timeout: 8_000 })
      await closePaperDialog(page)
      await toggleExegesis("Ali Quli Qara'i", page)
    })

    test("still shows the interlinear text", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      await expect(dialog.locator(".arabic-lex").first()).toBeVisible({
        timeout: 8_000,
      })
    })

    test("shows the 'no exegesis selected' message", async ({ page }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      await expect(
        dialog.getByText("No exegesis selected — enable one in Settings."),
      ).toBeVisible({ timeout: 8_000 })
    })

    test("gives the interlinear pane 70% height instead of 30%", async ({
      page,
    }) => {
      const dialog = await openExegesisDialog(page, "1:7")
      await expect(dialog).toBeVisible({ timeout: 8_000 })
      await expect(dialog.locator(".arabic-lex").first()).toBeVisible({
        timeout: 8_000,
      })

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
      // Allow 5% to accommodate subpixel rounding, mirroring the 30% test above
      expect(ratio!).toBeGreaterThanOrEqual(0.65)
    })
  })

  test.describe("when URL pattern is /e/$chapter/$verse", () => {
    test("open the verse dialog", async ({ page }) => {
      await page.goto("/#/e/1/7")
      await untilUsable(page)

      const dialog = await getPaperDialog(page)
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      const verseIndicator = dialog.locator('[data-testid="verse-indicator"]')
      await expect(verseIndicator).toHaveText("7", { timeout: 5_000 })

      // The always-mounted VerseLookup combobox must not silently rewrite the URL
      await page.waitForTimeout(500)
      expect(page.url()).toContain("/#/e/1/7")
    })

    test("shows not-found on an empty dialog", async ({ page }) => {
      // Chapter 1 (Al-Faatiha) only has 7 verses
      await page.goto("/#/e/1/999")
      await untilUsable(page)

      const dialog = await getPaperDialog(page)
      await expect(dialog).toBeVisible({ timeout: 8_000 })
      await expect(
        dialog.getByText("This verse could not be found."),
      ).toBeVisible({ timeout: 8_000 })
    })

    test("shows the chapter introduction for verse 0", async ({ page }) => {
      await page.goto("/#/e/1/0")
      await untilUsable(page)

      const dialog = await getPaperDialog(page)
      await expect(dialog).toBeVisible({ timeout: 8_000 })

      const verseIndicator = dialog.locator('[data-testid="verse-indicator"]')
      await expect(verseIndicator).toHaveText("Intro", { timeout: 5_000 })

      // Ali Quli Qara'i's chapter 1 description text
      await expect(dialog.getByText(/The Opening/i)).toBeVisible({
        timeout: 8_000,
      })

      // Prev is disabled at the intro; next steps forward into verse 1
      await expect(
        dialog.locator('[data-testid="prev-verse-btn"]'),
      ).toBeDisabled({ timeout: 5_000 })

      // no interlinear text
      await expect(dialog.locator(".arabic-lex")).toHaveCount(0)

      // gives content area 100% height (no interlinear pane)
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
      // Allow a small margin for the SplitPane divider's own height
      expect(ratio!).toBeGreaterThanOrEqual(0.9)
    })

    test("allow /e/ revisit to update dialog content", async ({ page }) => {
      await page.goto("/#/e/1/2")
      await untilUsable(page)

      const dialog = await getPaperDialog(page)
      await expect(dialog).toBeVisible({ timeout: 8_000 })
      const verseIndicator = dialog.locator('[data-testid="verse-indicator"]')
      await expect(verseIndicator).toHaveText("2", { timeout: 5_000 })

      // Manually navigate to a different /e/ target within the same tab,
      // aka an in-app hash change, not a full reload
      await page.goto("/#/e/4/8")
      await page.waitForTimeout(500)

      await expect(verseIndicator).toHaveText("8", { timeout: 5_000 })
    })
  })
})
