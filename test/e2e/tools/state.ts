import { DATABASE_KEY } from "@db/driver"
import type { Locator, Page } from "playwright-core"

export async function visitFresh(page: Page) {
  // addInitScript runs before every navigation, making __isArabicWord available
  // in all page.evaluate callbacks without duplicating the predicate.
  await page.addInitScript(() => {
    ;(window as any).__isArabicWord = (s: Element): boolean =>
      s.classList.contains("arabic-lex")
  })
  await page.goto("/")
  await page.evaluate(() => localStorage.removeItem("userSettings"))
  await page.reload()
  await untilUsable(page)
}

export async function openSidebar(page: Page) {
  await page.locator('[aria-label="action-button"]:not(aside *)').last().click()
  await page.waitForTimeout(300) // sidebar CSS transition is 220ms
}

/** Clears localStorage and the indexed DB, ie deletes the SQLite snapshot. */
export async function clearBrowserStorage(page: Page) {
  await page.evaluate(async () => {
    localStorage.clear()
    await new Promise<void>((resolve) => {
      const req = indexedDB.open("keyval-store")
      req.onerror = () => resolve()
      req.onsuccess = () => {
        const db = req.result
        try {
          const tx = db.transaction("keyval", "readwrite")
          // delete the key rather than the whole database because `deleteDatabase`
          // blocks while the app holds an open IDB connection, causing hang.
          tx.objectStore("keyval").delete(DATABASE_KEY)
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => {
            db.close()
            resolve()
          }
        } catch {
          db.close()
          resolve()
        }
      }
    })
  })
}

/** Waits until the app has fully bootstrapped (stored settings applied). */
export async function untilUsable(page: Page | Locator) {
  await page
    .getByRole("button", { name: "action-button" })
    .first()
    .waitFor({ state: "visible", timeout: 30_000 })
}

/** Returns the computed `font-family` of the first `.arabic-lex` span in the first `[data-verse]` row. */
export async function getWordFontFamily(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const row = document.querySelector<HTMLElement>("[data-verse]")
    if (!row) return null
    const word = Array.from(row.querySelectorAll("span")).find(window.__isArabicWord)
    return word ? window.getComputedStyle(word).fontFamily : null
  })
}

/** Returns perceived luminance (0–255) — reliable proxy for light vs dark theme. */
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
