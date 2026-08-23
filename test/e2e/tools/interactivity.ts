import { expect } from "@playwright/test"

import { type Locator, type Page } from "playwright-core"

// ==== I/O ========================================================

export async function pressKeyboard(
  page: Page,
  key: string,
  times: number = 1,
) {
  for (let i = 0; i < times; i++) await page.keyboard.press(key)
}

export async function pressTab(page: Page, times: number = 1) {
  await pressKeyboard(page, "Tab", times)
}

export async function fillIn(
  text: string,
  container: Page | Locator,
  options: FindTargetOptions = {},
) {
  const el = await findVisibleTarget(undefined, container, options)
  await expect(el).toBeEditable({ timeout: options.timeout })
  el.fill(text)
}

/**
 * Helper method to find a combo box and set value of said combo box
 *
 * @param text of the option to be chosen
 * @param container where the combobox can be found
 * @param options ways to locate this combobox
 */
export async function selectComboBox(
  text: string,
  container: Page | Locator,
  options: FindTargetOptions = {},
) {
  // click the combo box to reveal the options
  const comboBox = await findVisibleTarget(undefined, container, options)
  await expect(comboBox).toBeVisible({
    timeout: options.timeout,
  })
  await comboBox.click()

  // select the option matching the text
  const listBox = container
    .getByRole("listbox")
    .filter({ visible: true })
    .first()
  await expect(listBox).toBeVisible({ timeout: options.timeout })
  const option = listBox
    .getByRole("option", {
      name: text,
      exact: options.exact ?? false,
    })
    .filter({ visible: true })
    .first()
  await expect(option).toBeVisible({ timeout: options.timeout })
  await option.click()
}

// ==== HTML =======================================================

/**
 * Click on a visible element within a container.
 */
export async function clickOn(
  text: string | undefined,
  container: Page | Locator,
  options: FindTargetOptions = {},
) {
  const target = await findVisibleTarget(text, container, options)
  await target.first().click()
}

export async function longPress(page: Page, element: Locator) {
  await element.dispatchEvent("pointerdown", {
    bubbles: true,
    cancelable: true,
  })
  await page.waitForTimeout(600) // > 500ms threshold before pointerup clears the timer
  await element.dispatchEvent("pointerup", { bubbles: true, cancelable: true })
}

/**
 * Hover over a visible element within a container.
 */
export async function hoverOn(
  text: string | undefined,
  container: Page | Locator,
  options: FindTargetOptions = {},
) {
  const target = await findVisibleTarget(text, container, options)
  await target.first().hover()
  return target
}

interface TextLocatorOption {
  timeout?: number
  exact?: boolean
}

export async function hasText(
  text: string,
  locator: Page | Locator,
  { timeout = COMMON_TIMEOUT_TIME, exact = true }: TextLocatorOption = {},
) {
  const target = await waitUntilVisible(locator.getByText(text, { exact }), {
    timeout,
  })

  expect(target).toBeDefined()
}

export async function hasNoText(
  text: string,
  locator: Page | Locator,
  { timeout = COMMON_TIMEOUT_TIME, exact = true }: TextLocatorOption = {},
) {
  await expect(locator.getByText(text, { exact })).toHaveCount(0, { timeout })
}

export async function getFieldByLabel(
  text: string,
  container: Page | Locator,
  { timeout = COMMON_TIMEOUT_TIME, exact = true }: TextLocatorOption = {},
) {
  const label = await waitUntilVisible(container.getByText(text, { exact }), {
    timeout,
  })
  expect(label).toBeDefined()

  // attempt semantic association first
  const fieldByLabel = container.getByLabel(text, { exact })
  const semanticField = await waitUntilVisible(fieldByLabel, {
    timeout,
    failable: false,
  })
  if (semanticField) return semanticField

  // fallback: find nearest form field near label
  if (!label) return undefined
  const wrapper = label.locator(
    `xpath=ancestor-or-self::*[
      .//input or .//textarea or .//*[@role="textbox"]
    ][1]`,
  )
  const fallbackField = wrapper.locator('input, textarea, [role="textbox"]')
  const visibleFallback = await waitUntilVisible(fallbackField, {
    timeout,
  })
  expect(visibleFallback).toBeDefined()
  return visibleFallback
}

export async function hasElement(
  text: string | undefined,
  container: Page | Locator,
  options: FindTargetOptions = {},
): Promise<Locator> {
  const target = await findVisibleTarget(text, container, options)
  await expect(target).toBeVisible()
  return target
}

/**
 * Check that there's no element that we want. The timeout used is half
 * smaller than the timeout we used to check for an element visibility.
 */
export async function hasNoElement(
  text: string | undefined,
  container: Page | Locator,
  options: FindTargetOptions = {},
) {
  console.log("PASSED OPTIONS", options)
  const target = await locateTarget(text, container, options)
  await expect(target.filter({ visible: true })).toHaveCount(0, {
    timeout: options.timeout ?? COMMON_TIMEOUT_TIME - 0.5 * COMMON_TIMEOUT_TIME,
  })
}

export async function hasButton(
  text: string,
  container: Page | Locator,
  options: FindTargetOptions = {},
) {
  return await hasElement(text, container, { role: "button", ...options })
}

export async function hasFormLabel(
  text: string,
  container: Page | Locator,
  options: FindTargetOptions = {},
) {
  await hasElement(text, container, {
    ariaLabel: "stateful-form-label-text",
    ...options,
  })
}

type FindTargetOptions = {
  /**
   * Intentional delay before starting the search. We may need this
   * such as when combobox has been rendered, but we cannot act upon
   * it immediately, as it's polling data from the backend. So we must
   * wait, to give time for the asynchronicity element to be fulfilled.
   * So, this is a hard, fixed time we need to wait before we even
   * locating the element.
   */
  waitTime?: number
  /**
   * Maximum time allowed for the element to become visible once finding.
   */
  timeout?: number
  role?: Parameters<Page["getByRole"]>[0]
  ariaLabel?: string

  /**
   * Find by the form label. The finding is by default inexact,
   * unless exact is of course, specified
   */
  formLabel?: string

  id?: string
  className?: string
  /**
   * If set to true, the given text must match exactly. Sometimes, we
   * cannot match text exactly, such as when a field has `*` marker
   * to indicate it's important, yet we just don't care to include the
   * `*` marker to the finding process. But at other times, strictness
   * is necessary, such as when choosing an option from a combobox,
   * and there are 2 options: Abc and Abcdef, if we want to choose Abc
   * we must match it exactly.
   */
  exact?: boolean
}

export async function locateTarget(
  text: string | undefined,
  container: Page | Locator,
  options: Omit<FindTargetOptions, "timeout"> = {},
): Promise<Locator> {
  const {
    waitTime = 0,
    role,
    ariaLabel,
    formLabel,
    id,
    className,
    exact,
  } = options

  // pass certain given time before even starting the search process
  if (waitTime > 0) await pause(waitTime)

  // when formLabel is specified, we actually not finding the label, but
  // the component associated to said label
  if (formLabel) {
    // first, try to find by label using playwright's own technique
    // that is, without actual DOM traversal; this usually works for
    // textbox
    const foundNatively = container.getByLabel(formLabel, { exact })
    if (await foundNatively.count()) return foundNatively

    // otherwise, traverse to find the label and the component
    const label = container
      .locator("label")
      .filter(
        exact
          ? { hasText: formLabel }
          : { hasText: new RegExp(formLabel, "i") },
      )
      .first()
    const forId = await label.getAttribute("for")
    if (!forId) throw new Error(`No target found for formLabel "${formLabel}"`)

    return container.locator(`#${forId}`)
  }

  if (role)
    return container
      .getByRole(role, { exact, name: text })
      .or(container.locator(role).filter({ hasText: text }))

  if (ariaLabel)
    return container.locator(
      `[aria-label="${ariaLabel}"]`,
      text ? { hasText: text } : undefined,
    )

  if (id)
    return container.locator(
      `[id="${id}"]`,
      text ? { hasText: text } : undefined,
    )

  if (className)
    return container.locator(
      `.${className}`,
      text ? { hasText: text } : undefined,
    )

  if (!text)
    throw new Error(
      "`text` is required when neither else is provided to locate the element. Given options: " +
        JSON.stringify(options),
    )

  return container.getByText(text, { exact })
}

export async function findVisibleTarget(
  text: string | undefined,
  container: Page | Locator,
  options: FindTargetOptions = {},
): Promise<Locator> {
  const target = await waitUntilVisible(
    await locateTarget(text, container, options),
    {
      timeout: options.timeout,
    },
  )

  if (!target) {
    throw new Error(
      `Could not find visible element${text ? `: "${text}"` : ""}`,
    )
  }

  return target
}

/**
 * Wait until the element pointed by a given locator is visible;
 * if until the timeout time it's not on the screen, return null
 */
export async function waitUntilVisible(
  locator: Locator,
  {
    timeout = COMMON_TIMEOUT_TIME,
    failable = true,
  }: { timeout?: number; failable?: boolean } = {},
): Promise<Locator | undefined> {
  // locator may return many elements; but expect(locator) requires
  // a single element. this way, it's safer, as we allow multiple matches
  const target = locator.filter({ visible: true }).first()

  try {
    await expect(target).toBeVisible({ timeout })
    return target
  } catch (e) {
    if (failable) throw e
    return undefined
  }
}

export async function waitUntilInvisible(
  locator: Locator,
  {
    timeout = COMMON_TIMEOUT_TIME,
    failable = true,
  }: { timeout?: number; failable?: boolean } = {},
): Promise<Locator | undefined> {
  // locator may return many elements; but expect(locator) requires
  // a single element. this way, it's safer, as we allow multiple matches
  const target = locator.filter().first()

  try {
    await expect(target).toBeHidden({ timeout })
    return target
  } catch (e) {
    if (failable) throw e
    return undefined
  }
}

/**
 * Get that main tab of the app that consists of Project, Infernece,
 * Benchmark, Dataset and so on and so forth
 */
export async function getTabsSection(page: Page | Locator) {
  const tabsSection = await findVisibleTarget(undefined, page, {
    ariaLabel: "nav-tab-tabs-sections",
  })

  return tabsSection
}

export async function getPaperDialog(page: Page | Locator) {
  const paperDialog = await findVisibleTarget(undefined, page, {
    ariaLabel: "paper-dialog-content",
  })
  return paperDialog
}

/** Drags the paper dialog's indicator down fast enough to slide it off-screen. */
async function dragDownFastToClose(page: Page) {
  const indicator = page
    .locator('[aria-label="paper-dialog-drag-indicator"]')
    .first()

  await indicator.dispatchEvent("pointerdown", {
    clientY: 0,
    bubbles: true,
    cancelable: true,
  })
  await indicator.dispatchEvent("pointermove", {
    clientY: 20,
    bubbles: true,
    cancelable: true,
  })
  await page.waitForTimeout(16) // real gap so velocity tracking sees it as a fast flick
  await indicator.dispatchEvent("pointermove", {
    clientY: 200,
    bubbles: true,
    cancelable: true,
  })
  await indicator.dispatchEvent("pointerup", {
    clientY: 200,
    bubbles: true,
    cancelable: true,
  })
}

/**
 * Dismisses the paper dialog (no close button); rotates deterministically
 * across Escape, backdrop click, and fast drag-down based on the caller's
 * source line
 */
export async function closePaperDialog(page: Page | Locator) {
  const actualPage = "keyboard" in page ? page : page.page()

  const callerLine = new Error().stack?.split("\n")[2] ?? ""
  const hash = Array.from(callerLine).reduce(
    (sum, ch) => sum + ch.charCodeAt(0),
    0,
  )

  switch (hash % 3) {
    case 0:
      await actualPage.keyboard.press("Escape")
      break
    case 1:
      await actualPage
        .locator('[aria-label="overlay-blocker"]')
        .first()
        .click({ position: { x: 5, y: 5 } })
      break
    default:
      await dragDownFastToClose(actualPage)
      break
  }

  await actualPage.waitForTimeout(300)
}

// ==== TIMER ======================================================

export const COMMON_TIMEOUT_TIME = 4000
export const ONE_MINUTE = 60 * 1000

/**
 * Create a pause that must be awaited before some
 * other action can be done
 */
export async function pause(ms: number) {
  return new Promise((f) => setTimeout(f, ms))
}

// ==== QURAN ======================================================

export async function openSidebar(page: Page) {
  await page.locator('[aria-label="title-action"]:not(aside *)').last().click()
  await page.waitForTimeout(300) // sidebar CSS transition is 220ms
}

export async function closeSidebar(page: Page) {
  // The back/close button is the only title-action with caption="Left" —
  // stable regardless of which sidebar content type (Settings, Bookmarks,
  // Export, Import, ...) is currently showing.
  await page
    .locator('[aria-label="title-action"][caption="Left"]')
    .last()
    .dispatchEvent("click")
  await page.waitForTimeout(300) // sidebar CSS transition is 220ms
}

export async function openSearchSheet(page: Page) {
  await page.locator('[aria-label="title-action"]:not(aside *)').first().click()
  await page.waitForTimeout(300)
}

/** Opens the sidebar and toggles a word-by-word translation option. */
export async function toggleWbwTranslation(label: string, page: Page) {
  await openSidebar(page)

  const input = await findVisibleTarget(undefined, page, {
    formLabel: "Word-by-word translations",
  })
  await input.click()

  const drawer = page
    .locator('[aria-label="combobox-drawer"]')
    .filter({ visible: true })
  await expect(drawer).toBeVisible({ timeout: 5000 })

  const item = drawer.getByRole("option").filter({ hasText: label }).first()
  await expect(item).toBeVisible({ timeout: 5000 })
  await item.click()

  await page.keyboard.press("Escape") // close drawer
  await page.waitForTimeout(150)
  await closeSidebar(page)
}

/**
 * Opens the sidebar and toggles an exegesis source on/off via its display
 * name (e.g. "Ali Quli Qara'i"). Options are grouped by locale (like the
 * Font field), so every collapsed group is expanded before searching.
 */
export async function toggleExegesis(label: string, page: Page) {
  await openSidebar(page)

  const input = await findVisibleTarget(undefined, page, {
    formLabel: "Exegesis",
  })
  await input.click()

  const drawer = page
    .locator('[aria-label="combobox-drawer"]')
    .filter({ visible: true })
  await expect(drawer).toBeVisible({ timeout: 5000 })

  const groupHeaders = drawer.locator(
    '[aria-label="tree-list-group-title"][data-has-options="true"]',
  )
  for (let i = 0; i < (await groupHeaders.count()); i++) {
    await groupHeaders.nth(i).click()
  }
  await page.waitForTimeout(250)

  const item = drawer
    .locator('[aria-label="tree-list-item"]')
    .filter({ hasText: label })
    .first()
  await expect(item).toBeVisible({ timeout: 5000 })
  await item.click()

  await page.keyboard.press("Escape") // close drawer
  await page.waitForTimeout(150)
  await closeSidebar(page)
}

/** Long-press a verse row (by "chapterId:verseNumber") to open the exegesis dialog. */
export async function openExegesisDialog(page: Page, verseKey: string) {
  const row = page.locator(`[data-verse="${verseKey}"]`)
  await waitUntilVisible(row, { timeout: 10_000 })
  await longPress(page, row)
  return getPaperDialog(page)
}

/** @returns true when the scroll container has reached the top. */
export async function scrollUp(page: Page, px: number): Promise<boolean> {
  return page.evaluate((amount) => {
    const row = document.querySelector("[data-index]")
    if (!row) return true

    let el: Element | null = row.parentElement
    while (el) {
      const style = window.getComputedStyle(el as HTMLElement)
      if (style.overflow === "auto" || style.overflowY === "auto") {
        const container = el as HTMLElement
        container.scrollTop -= amount
        return container.scrollTop <= 0
      }
      el = el.parentElement
    }

    return true
  }, px)
}

/** Scroll up/down N steps, asserting markers stay visible at each step. */
export async function scrollCertainPixels(
  page: Page,
  direction: "up" | "down",
  steps: number,
  callback?: () => void,
) {
  const px = 400
  const scrollerFunc = direction === "up" ? scrollUp : scrollDown

  for (let i = 0; i < steps; i++) {
    await page.waitForTimeout(80)
    if (callback) callback()
    const atPeak = await scrollerFunc(page, px)
    if (atPeak) break
  }
}

/** @returns true when the scroll container has reached the bottom. */
export async function scrollDown(page: Page, px: number): Promise<boolean> {
  return page.evaluate((amount) => {
    const row = document.querySelector("[data-index]")
    if (!row) return true

    let el: Element | null = row.parentElement
    while (el) {
      const style = window.getComputedStyle(el as HTMLElement)
      if (style.overflow === "auto" || style.overflowY === "auto") {
        const container = el as HTMLElement
        container.scrollTop += amount
        return (
          container.scrollTop + container.clientHeight >=
          container.scrollHeight - 10
        )
      }
      el = el.parentElement
    }

    return true
  }, px)
}

/** Presses down at startX, drags to endX in a few steps, then releases. */
export async function dragHorizontally(
  page: Page,
  startX: number,
  endX: number,
  y: number,
) {
  await page.mouse.move(startX, y)
  await page.mouse.down()
  const steps = 10
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(startX + ((endX - startX) * i) / steps, y)
  }
  await page.mouse.up()
}

/** Presses down at (x, startY), drags to (x, endY) in a few steps, then releases. */
export async function dragVertically(
  page: Page,
  x: number,
  startY: number,
  endY: number,
) {
  await page.mouse.move(x, startY)
  await page.mouse.down()
  const steps = 10
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x, startY + ((endY - startY) * i) / steps)
  }
  await page.mouse.up()
}

/**
 * Mushaf-page specific interactivity
 */

/** */
export async function showNavigatorSearch(page: Page) {
  const box = await page.locator("[data-mushaf]").boundingBox()
  const x = box!.x + box!.width / 2
  const y = box!.y + box!.height / 2
  await dragVertically(page, x, y, y - 20) // reveal the Navigator pill first
  await page.locator('[aria-label="navigator-chapter-info"]').click()
}
