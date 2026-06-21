import { expect, test } from "@playwright/test"
import { selectComboBox } from "./tools/interactivity"
import { getPageLuminance, untilUsable, visitFresh } from "./tools/state"

test.describe("User settings", () => {
  test.beforeEach(async ({ page }) => await visitFresh(page))

  test("selected theme persists after page refresh", async ({ page }) => {
    const luminanceLight = await getPageLuminance(page)

    // Open settings sidebar via the hamburger menu (last action-button)
    await page.getByRole("button", { name: "action-button" }).last().click()
    await page.waitForTimeout(300) // sidebar CSS transition is 220ms

    // Change theme to Dark, locating the combobox by its visible form label
    await selectComboBox("Dark", page, { formLabel: "Theme" })

    // Poll until the page visually darkens — React re-render may be async
    await expect
      .poll(() => getPageLuminance(page), { timeout: 5000 })
      .toBeLessThan(luminanceLight)

    // Reload and verify the dark theme still applies
    await page.reload()
    await untilUsable(page)

    await expect
      .poll(() => getPageLuminance(page), { timeout: 5000 })
      .toBeLessThan(luminanceLight)

    // Re-open sidebar and confirm the combobox still reads "Dark"
    await page.getByRole("button", { name: "action-button" }).last().click()
    await page.waitForTimeout(300)
    await expect(page.getByLabel("Theme")).toHaveValue("Dark")
  })
})
