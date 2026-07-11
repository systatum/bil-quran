import { expect, test } from "@playwright/test"
import { clickOn, openSidebar, selectComboBox } from "./tools/interactivity"
import { visitFresh } from "./tools/state"

test.describe("BackupDialog", () => {
  test.beforeEach(async ({ page }) => await visitFresh(page))

  test("can copy in base64 format", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])

    await openSidebar(page)
    await clickOn("Backup", page, { role: "button" })

    const encoded = await page.locator("textarea").inputValue()
    expect(encoded.length).toBeGreaterThan(0)

    await clickOn("Copy", page, { role: "button" })

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText(),
    )
    expect(clipboardText).toBe(encoded)

    // Copy must not close the dialog — user may still want to Download too
    await expect(page.getByText("Backup your data")).toBeVisible({
      timeout: 5000,
    })
  })

  test("can download to a file", async ({ page }) => {
    await openSidebar(page)
    await clickOn("Backup", page, { role: "button" })

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      clickOn("Download", page, { role: "button" }),
    ])

    const today = new Date()
    const yy = String(today.getFullYear()).slice(-2)
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const dd = String(today.getDate()).padStart(2, "0")
    expect(download.suggestedFilename()).toBe(
      `bilQuran-${yy}${mm}${dd}-state.systatum`,
    )

    // unlike Copy, Download still closes the dialog
    await expect(page.getByText("Backup your data")).not.toBeVisible({
      timeout: 5000,
    })
  })

  test("backup decodes back equally to local storage", async ({ page }) => {
    await openSidebar(page)
    await selectComboBox("Dark", page, { formLabel: "Theme" })
    await page.waitForTimeout(300)

    await clickOn("Backup", page, { role: "button" })
    const encoded = await page.locator("textarea").inputValue()

    const decoded = await page.evaluate((b64) => {
      const binary = atob(b64)
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
      return new TextDecoder().decode(bytes)
    }, encoded)

    const raw = await page.evaluate(() => localStorage.getItem("userSettings"))
    expect(decoded).toBe(raw)
  })
})
