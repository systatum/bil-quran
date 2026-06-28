import { expect, Page, test } from "@playwright/test"
import {
  getPaperDialog,
  longPress,
  waitUntilVisible,
} from "./tools/interactivity"
import { visitFresh } from "./tools/state"

test.describe("Lexeme details", () => {
  test.beforeEach(async ({ page }) => {
    await visitFresh(page)
    await waitUntilVisible(page.locator("[data-verse]").first(), {
      timeout: 15_000,
    })
  })

  test("shows word token and position", async ({ page }) => {
    await longPress(page, firstVerseWord(page))

    const dialog = await getPaperDialog(page)
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Arabic word token is rendered in the dialog header
    await expect(dialog.locator(".arabic-lex").first()).toBeVisible()

    // Position reference — chapterId:verse format e.g. "1:1 · Word 1"
    await expect(dialog.getByText(/1:/)).toBeVisible()
  })

  test("drag handle resizes the dialog", async ({ page }) => {
    await longPress(page, firstVerseWord(page))

    const dialog = await getPaperDialog(page)
    await expect(dialog).toBeVisible({ timeout: 5000 })
    // Wait for the Framer Motion spring (stiffness: 400, damping: 40) to settle.
    // as reading bounding boxes mid-animation means mouse.down() misses the drag
    // handle once the element catches up.
    await page.waitForTimeout(600)

    const initialHeight = (await dialog.boundingBox())!.height

    const handle = page.locator('[aria-label="paper-dialog-drag-indicator"]')
    const hBox = await handle.boundingBox()
    const hx = hBox!.x + hBox!.width / 2
    const hy = hBox!.y + hBox!.height / 2

    // drag up — dialog should grow taller
    await page.mouse.move(hx, hy)
    await page.mouse.down()
    await page.mouse.move(hx, hy - 200, { steps: 10 })
    // Wait for the pending requestAnimationFrame to execute before releasing —
    // onUp calls cancelAnimationFrame(rafId) so releasing too early discards the
    // height update and the dialog stays at its original size.
    await page.waitForTimeout(100)
    await page.mouse.up()
    await page.waitForTimeout(300)

    const tallHeight = (await dialog.boundingBox())!.height
    expect(tallHeight).toBeGreaterThan(initialHeight)

    // drag down past the original position — dialog should shrink.
    // Downward velocity > 0.5 px/ms triggers dialog minimization instead of
    // resize. Move slowly: 30px per step with 100ms delay = 0.3 px/ms.
    const hBox2 = await handle.boundingBox()
    const hx2 = hBox2!.x + hBox2!.width / 2
    const hy2 = hBox2!.y + hBox2!.height / 2

    await page.mouse.move(hx2, hy2)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(hx2, hy2 + 30 * i)
      await page.waitForTimeout(100)
    }
    await page.mouse.up()
    await page.waitForTimeout(300)

    const shortHeight = (await dialog.boundingBox())!.height
    expect(shortHeight).toBeLessThan(initialHeight)
  })

  test("show targeted word in highlight", async ({ page }) => {
    await longPress(page, firstVerseWord(page))

    const dialog = await getPaperDialog(page)
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Scroll to the bottom of the dialog to reach the related verses section
    await dialog.evaluate((el) =>
      el.scrollTo({ top: el.scrollHeight, behavior: "instant" }),
    )
    await page.waitForTimeout(300)

    // At least one Arabic word span should carry the highlight background (#e7e7b4)
    const hasHighlight = await dialog.evaluate((dialogEl) =>
      Array.from(dialogEl.querySelectorAll(".arabic-lex")).some((el) => {
        const bg = window.getComputedStyle(el).backgroundColor
        return bg === "rgb(231, 231, 180)"
      }),
    )
    expect(hasHighlight).toBe(true)
  })
})

function firstVerseWord(page: Page) {
  return page.locator("[data-verse] .arabic-lex").first()
}
