import { expect, test } from "@playwright/test"
import { getPaperDialog, hasElement } from "./tools/interactivity"
import { untilUsable, visitFresh } from "./tools/state"

test.describe("ExegesisDeepLinkShell", () => {
  test("shows tafsir content before the app finishes bootstrapping", async ({
    page,
  }) => {
    test.setTimeout(60_000)

    // Slow down a bootstrap-only request so there's a clear window in which
    // only the shell (not the real, DB-backed dialog) could be showing.
    await page.route("**/table_migrations/meta/_journal.json", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.continue()
    })

    await page.goto("/#/e/1/7?tafsir=aliquli")

    const dialog = await getPaperDialog(page)
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByText(/the path of those whom You have blessed/i),
    ).toBeVisible()

    // the full app (router + real DB-backed dialog) hasn't mounted yet
    await expect(
      page.getByRole("button", { name: "title-action" }).first(),
    ).not.toBeVisible()

    // once bootstrap finishes, the real dialog takes over with the same content
    await untilUsable(page)
    await expect(
      dialog.getByText(/the path of those whom You have blessed/i),
    ).toBeVisible()

    // ...and is now interactive
    const prevBtn = await hasElement(undefined, dialog, {
      ariaLabel: "prev-verse-btn",
    })
    await prevBtn.click()
    const verseIndicator = await hasElement(undefined, dialog, {
      ariaLabel: "verse-indicator",
    })
    await expect(verseIndicator).toHaveText("6")
  })

  test("warm start: no console errors and correct content on a return visit", async ({
    page,
  }) => {
    test.setTimeout(60_000)

    const pageErrors: string[] = []
    page.on("pageerror", (err) => pageErrors.push(err.message))

    // first visit seeds the DB snapshot
    await visitFresh(page)

    // return visit via the same deep link
    await page.goto("/#/e/1/7?tafsir=aliquli")
    const dialog = await getPaperDialog(page)
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByText(/the path of those whom You have blessed/i),
    ).toBeVisible()

    await untilUsable(page)
    await expect(
      dialog.getByText(/the path of those whom You have blessed/i),
    ).toBeVisible()

    expect(pageErrors).toEqual([])
  })
})
