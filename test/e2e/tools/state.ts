import type { Locator, Page } from "playwright-core"

export async function visitFresh(page: Page) {
  await page.goto("/")
  await page.evaluate(() => localStorage.removeItem("userSettings"))
  await page.reload()
  await untilUsable(page)
}

// Wait for full app bootstrap — the action-buttons only appear after
// RouterProvider renders, which requires setIsBootstrapped(true), which
// is called right after restoreState(). This guarantees the stored theme
// is applied before any assertions run.
export async function untilUsable(page: Page | Locator) {
  await page.getByRole("button", { name: "action-button" }).last().waitFor({
    state: "visible",
    timeout: 30_000,
  })
}

// Returns perceived luminance (0–255) of the first solid background found
// depth-first in the DOM — reliable proxy for light vs dark theme.
export async function getPageLuminance(page: Page): Promise<number> {
  return page.evaluate(() => {
    const walk = (el: Element): string | null => {
      const bg = window.getComputedStyle(el).backgroundColor
      if (bg && bg !== "rgba(0, 0, 0, 0)") return bg
      for (const child of Array.from(el.children)) {
        const found = walk(child)
        if (found) return found
      }
      return null
    }
    const bg = walk(document.body) ?? "rgb(128, 128, 128)"
    const [r, g, b] = (bg.match(/\d+/g) ?? ["128", "128", "128"]).map(Number)
    return (r * 299 + g * 587 + b * 114) / 1000
  })
}
