import { Asset } from "@constants/assets"
import { Locale } from "@constants/settings"
import { renderExegesisMarkdown, renderFootnoteText } from "@services/markdown"
import { minify } from "@minify-html/node"
import * as cheerio from "cheerio"
import { createHash } from "node:crypto"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { chromium, type Page } from "playwright"

/**
 * This script generates static HTML pages for every verse of every chapter, for
 * every exegesis work and every locale that has a translation.
 */

const KNOWN_LOCALES: string[] = Object.values(Locale)

const PORT = 4173
const BASE_URL = `http://127.0.0.1:${PORT}`
const PRODUCTION_URL = "https://bil-quran.com"
const MAX_WORKERS = 5

const PUBLIC_QURAN = path.resolve("public/quran")
const CHAPTERS_PATH = path.join(PUBLIC_QURAN, "chapters.json")
const EXEGESIS_PATH = path.join(PUBLIC_QURAN, "exegesis")

const SVG_ASSETS_RELATIVE_DIR = "assets/svg"
const PUBLIC_SVG_DIR = path.resolve("public", SVG_ASSETS_RELATIVE_DIR)
const BUILD_SVG_DIR = path.resolve("build", SVG_ASSETS_RELATIVE_DIR)

const CSS_ASSETS_RELATIVE_DIR = "assets/css"
const PUBLIC_CSS_DIR = path.resolve("public", CSS_ASSETS_RELATIVE_DIR)
const BUILD_CSS_DIR = path.resolve("build", CSS_ASSETS_RELATIVE_DIR)

interface Chapter {
  length: number
  isMeccan: boolean
  partitioning: Array<{
    part: number
    start: number
    end: number
  }>
  meanings: Record<string, string | null>
  namings: Record<string, string | null>
  transliterations: Record<string, string | null>
}

type Chapters = Record<string, Chapter>

interface ExegesisEntry {
  locale: string
  exegesisId: string
}

/** Raw shape of a per-chapter Imlaei rendering asset entry. */
interface ImlaeiWord {
  id: string
  word: string
  trans: string
  root: string
}

/** Raw shape of a per-chapter exegesis asset (see public/quran/exegesis/*). */
interface ExegesisChapterAsset {
  description?: string | null
  translations?: Record<string, string>
  exegesis?: Record<string, string | null>
  footnotes?: Record<string, Record<string, string>>
}

/** Attributes lifted off one captured word span, reused to build every other verse's words. */
interface WordTemplate {
  wrapper: Record<string, string>
  arabic: Record<string, string>
  transliteration: Record<string, string>
  meaningsWrapper: Record<string, string> | null
  meaning: Record<string, string> | null
}

/** Attributes lifted off one captured footnote item, reused to build every other verse's list. */
interface FootnoteTemplate {
  list: Record<string, string>
  item: Record<string, string>
  marker: Record<string, string>
}

/** A captured, fully-bootstrapped page, reused as the shell for every verse in this combo. */
interface Shell {
  html: string
  wordTemplate: WordTemplate | null
  footnoteTemplate: FootnoteTemplate | null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Convert a chapter transliteration into an ASCII URL slug.
 *
 * Examples:
 *
 *   "Al-Faatiha"       -> "al-faatiha"
 *   "Aal-'Imraan"      -> "aal-imraan"
 *   "Al-An'aam"        -> "al-anaam"
 *   "Al-Maa'idah"      -> "al-maa-idah"
 */
function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
}

async function loadChapters(): Promise<Chapters> {
  const raw = await readFile(CHAPTERS_PATH, "utf8")
  return JSON.parse(raw) as Chapters
}

/**
 * Discover exegesis/locale combinations from:
 *
 *   public/quran/exegesis/
 *
 * Expected structure:
 *
 *   public/quran/exegesis/
 *   ├── aliquli/
 *   │   ├── en-US/
 *   │   └── ...
 *   ├── ibnkathir/
 *   │   └── ...
 *   └── ...
 *
 * The top-level directory name is the exegesis ID; the directory name
 * nested below it is the locale.
 */
async function loadExegeses(): Promise<ExegesisEntry[]> {
  const exegesisIds = await readDirectoryNames(EXEGESIS_PATH)

  const result: ExegesisEntry[] = []

  for (const exegesisId of exegesisIds) {
    const exegesisPath = path.join(EXEGESIS_PATH, exegesisId)

    const locales = await readDirectoryNames(exegesisPath)

    for (const locale of locales) {
      // Anything that isn't a recognized locale (e.g. mirali's "raw"
      // scrape source) isn't a real generation target.
      if (!KNOWN_LOCALES.includes(locale)) continue

      result.push({
        locale,
        exegesisId,
      })
    }
  }

  return result
}

async function readDirectoryNames(directory: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises")

  const entries = await readdir(directory, {
    withFileTypes: true,
  })

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

const rawFileCache = new Map<string, Promise<string>>()

/** Reads a file's raw text, cached — also the input source for content hashing. */
function readRawCached(filePath: string): Promise<string> {
  let promise = rawFileCache.get(filePath)

  if (!promise) {
    promise = readFile(filePath, "utf8")
    rawFileCache.set(filePath, promise)
  }

  return promise
}

function imlaeiPath(chapterId: number): string {
  return path.join(PUBLIC_QURAN, "verses", "imlaei", `${chapterId}.json`)
}

function exegesisChapterPath(
  slug: string,
  locale: string,
  chapterId: number,
): string {
  return path.join(EXEGESIS_PATH, slug, locale, `${chapterId}.json`)
}

/** Reads the raw interlinear (Imlaei) word list for a chapter. */
async function readImlaeiWords(chapterId: number): Promise<ImlaeiWord[]> {
  return JSON.parse(await readRawCached(imlaeiPath(chapterId)))
}

/** Reads the raw exegesis asset for one work/locale/chapter. */
async function readExegesisChapter(
  slug: string,
  locale: string,
  chapterId: number,
): Promise<ExegesisChapterAsset> {
  return JSON.parse(await readRawCached(exegesisChapterPath(slug, locale, chapterId)))
}

/**
 * Finds a verse to capture the shell from that exercises as much markup as
 * this exegesis work has: translation, exegesis body, footnotes, and a
 * scripture quote (an RT-block). Styled-components only emits CSS for
 * markup that actually rendered, so a plain verse 1:1 capture can leave a
 * combo missing styles (or, worse, a template with no hook at all) for
 * whatever it never happened to exercise. Stops early once a verse scores
 * the max, so this is cheap for combos that have everything on chapter 1.
 */
async function findRichCaptureVerse(
  exegesisId: string,
  locale: string,
  chapters: Chapters,
): Promise<{ chapterId: number; verseNumber: number }> {
  let best = { chapterId: 1, verseNumber: 1, score: -1 }

  for (const chapterIdString of Object.keys(chapters)) {
    const chapterId = Number(chapterIdString)
    const chapter = await readExegesisChapter(exegesisId, locale, chapterId)

    // A translation-only work (no exegesis body at all) can still carry
    // footnotes on its translation text, so scan every verse key any of
    // these three fields mentions — not just the ones with exegesis text.
    const verseKeys = new Set([
      ...Object.keys(chapter.translations ?? {}),
      ...Object.keys(chapter.exegesis ?? {}),
      ...Object.keys(chapter.footnotes ?? {}),
    ])

    for (const verseKey of verseKeys) {
      const exegesisText = chapter.exegesis?.[verseKey]
      const hasTranslation = Boolean(chapter.translations?.[verseKey])
      const hasExegesis = Boolean(exegesisText)
      const hasFootnote = Object.keys(chapter.footnotes?.[verseKey] ?? {}).length > 0
      const hasScriptureQuote = Boolean(exegesisText?.includes('"RT"'))

      const score =
        Number(hasTranslation) +
        Number(hasExegesis) +
        Number(hasFootnote) +
        Number(hasScriptureQuote)

      if (score > best.score) {
        best = { chapterId, verseNumber: Number(verseKey), score }
      }
    }

    if (best.score === 4) break
  }

  return best
}

/** Locales with their own word-by-word translation corpus; anything else falls back to en-US. */
const WBW_TRANSLATION_LOCALES = ["en-US", "id-ID"]

const wbwTranslationsCache = new Map<string, Promise<Record<string, string>>>()

/** Reads the word-by-word translation corpus for a locale, keyed by "chapter:verse:word". */
function readWbwTranslations(locale: string): Promise<Record<string, string>> {
  const resolvedLocale = WBW_TRANSLATION_LOCALES.includes(locale) ? locale : "en-US"

  let promise = wbwTranslationsCache.get(resolvedLocale)

  if (!promise) {
    promise = readFile(
      path.join(PUBLIC_QURAN, "wbw_translations", `${resolvedLocale}.json`),
      "utf8",
    ).then((raw) => JSON.parse(raw))
    wbwTranslationsCache.set(resolvedLocale, promise)
  }

  return promise
}

/** The exact per-chapter slice of a locale's wbw corpus, deterministically ordered for hashing. */
function wbwSliceForChapter(
  wbwTranslations: Record<string, string>,
  chapterId: number,
): string {
  const prefix = `${chapterId}:`

  return JSON.stringify(
    Object.entries(wbwTranslations)
      .filter(([key]) => key.startsWith(prefix))
      .sort(([a], [b]) => a.localeCompare(b)),
  )
}

/** Fingerprints everything that determines one chapter's generated output for a combo. */
async function computeChapterHash(
  exegesisId: string,
  locale: string,
  chapterId: number,
  wbwTranslations: Record<string, string>,
): Promise<string> {
  const [imlaeiRaw, exegesisRaw] = await Promise.all([
    readRawCached(imlaeiPath(chapterId)),
    readRawCached(exegesisChapterPath(exegesisId, locale, chapterId)),
  ])

  return createHash("sha256")
    .update(imlaeiRaw)
    .update(exegesisRaw)
    .update(wbwSliceForChapter(wbwTranslations, chapterId))
    .digest("hex")
    .slice(0, 16)
}

const HASH_COMMENT_PATTERN = /<!--ssg-hash:([0-9a-f]+)-->/

function buildHashComment(hash: string): string {
  return `<!--ssg-hash:${hash}-->`
}

/**
 * Decides which verses in a chapter/combo actually need (re)generating: none
 * of them if the folder's already up to date, only the missing ones if the
 * hash still matches but a previous run was cut short, or all of them if the
 * folder is empty/absent or its hash is stale.
 */
async function decideChapterWork(
  chapterDir: string,
  chapterLength: number,
  currentHash: string,
): Promise<number[]> {
  const allVerses = Array.from({ length: chapterLength }, (_, i) => i + 1)

  let entries: string[]
  try {
    entries = await readdir(chapterDir)
  } catch {
    return allVerses
  }

  const existingFiles = new Set(entries.filter((name) => name.endsWith(".html")))
  if (existingFiles.size === 0) return allVerses

  const sampleFile = path.join(chapterDir, [...existingFiles][0])
  const sampleHtml = await readFile(sampleFile, "utf8").catch(() => "")
  const existingHash = sampleHtml.match(HASH_COMMENT_PATTERN)?.[1]

  if (existingHash !== currentHash) return allVerses

  return allVerses.filter((verse) => !existingFiles.has(`${verse}.html`))
}

async function waitForServer(url: string) {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(url)

      if (response.ok) {
        return
      }
    } catch {
      // Server isn't ready yet.
    }

    await sleep(500)
  }

  throw new Error(`Server did not start: ${url}`)
}

function startServer() {
  const server = spawn(
    "pnpm",
    ["exec", "serve", "-s", "build", "-l", String(PORT)],
    {
      // Its own process group, so stopServer can signal any child pnpm
      // spawns for the actual server, not just the pnpm wrapper itself.
      detached: true,
      stdio: ["ignore", "ignore", "pipe"],
    },
  )

  server.stderr.on("data", (data) => {
    process.stderr.write(`[server] ${data}`)
  })

  server.on("error", (error) => {
    console.error("[server process error]", error)
  })

  server.on("exit", (code, signal) => {
    console.error(`[server exited] code=${code} signal=${signal}`)
  })

  return server
}

/** Kills the server's whole process group and waits for it to actually exit. */
function stopServer(server: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve) => {
    if (server.exitCode !== null || server.signalCode !== null || !server.pid) {
      resolve()
      return
    }

    const forceKillTimer = setTimeout(() => {
      try {
        process.kill(-server.pid!, "SIGKILL")
      } catch {
        // Already gone.
      }
    }, 5000)

    server.once("exit", () => {
      clearTimeout(forceKillTimer)
      resolve()
    })

    try {
      process.kill(-server.pid, "SIGTERM")
    } catch {
      clearTimeout(forceKillTimer)
      resolve()
    }
  })
}

function getAppUrl(
  base: string,
  locale: string,
  chapterId: number,
  verseNumber: number,
  exegesisId: string,
) {
  const params = new URLSearchParams({
    tafsir: exegesisId,
    transliteration: "1",
    locale,
  })

  return `${base}/#/e/${chapterId}/${verseNumber}?${params.toString()}`
}

function getChapterDir(exegesisId: string, locale: string, chapterSlug: string) {
  return path.join("build", "tafsir", exegesisId, locale, chapterSlug)
}

function getOutputPath(
  exegesisId: string,
  locale: string,
  chapterSlug: string,
  verseNumber: number,
) {
  return path.join(
    getChapterDir(exegesisId, locale, chapterSlug),
    `${verseNumber}.html`,
  )
}

/**
 * Waits specifically for the exegesis dialog to open and render its content
 * — root text length alone can pass from the reading view before the
 * dialog ever mounts.
 */
async function waitForDialog(page: Page) {
  await page.waitForSelector('[aria-label="paper-dialog-content"]')

  await page.waitForFunction(() => {
    const content = document.querySelector(
      '[aria-label="paper-dialog-content"]',
    )
    return (content?.textContent?.trim().length ?? 0) > 50
  })
}

/** Waits for a chapter header row to mount and render its name, not just exist. */
async function waitForChapterHeader(page: Page, chapterId: number) {
  const selector = `[data-chapterid="${chapterId}"]`
  await page.waitForSelector(selector)

  await page.waitForFunction(
    (sel) => (document.querySelector(sel)?.textContent?.trim().length ?? 0) > 0,
    selector,
  )
}

/**
 * Removes the background reading list's per-verse rows. The chapter header
 * row stays; generatePage() overwrites its text for the real chapter.
 */
function stripBackgroundVerseRows(html: string): string {
  const $ = cheerio.load(html, { decodeEntities: false })

  $("div[data-verse]").each((_, el) => {
    const $el = $(el)

    if ($el.closest('[aria-label="paper-dialog-content"]').length === 0) {
      $el.remove()
    }
  })

  // Virtualization can render a neighboring chapter's header row too — keep
  // only chapter 1's, since that's the one generatePage() splices into.
  $('div[data-chapterid]:not([data-chapterid="1"])').remove()

  return $.html()
}

/**
 * Removes the app bundle and its build-info banner script. Without this,
 * the deferred bundle hydrates the real SPA over the static page, and its
 * hash-based router (which sees no hash on this page's plain URL path)
 * silently swaps the rendered dialog for the plain reading view. Our own
 * redirect script is added later and is plain JS, so it needs none of this.
 */
function stripAppBootstrapScripts(html: string): string {
  const $ = cheerio.load(html, { decodeEntities: false })

  $("script").each((_, el) => {
    const $script = $(el)
    const src = $script.attr("src") ?? ""
    const isAppBundle = src.includes("/static/js/")
    const isBuildInfoBanner = ($script.html() ?? "").includes("window.__systatum_bilquran")

    if (isAppBundle || isBuildInfoBanner) {
      $script.remove()
    }
  })

  return $.html()
}

/** Attributes worth keeping on the <img> that replaces an extracted <svg>. */
const SVG_TO_IMG_ATTRS = ["class", "aria-label", "aria-hidden", "id", "width", "height"]

/** Hashes of SVGs already written to disk this run, so repeats are just a lookup. */
const writtenSvgHashes = new Set<string>()

/**
 * Every icon SVG is the same for every verse in a combo. Extracts each to a
 * content-hashed file once per shell, swapping it for an <img>.
 */
async function extractSvgAssets($: ReturnType<typeof cheerio.load>): Promise<void> {
  for (const el of $("svg").toArray()) {
    const $svg = $(el)
    const svgMarkup = $.html($svg)
    const hash = createHash("sha256").update(svgMarkup).digest("hex").slice(0, 16)
    const fileName = `${hash}.svg`

    if (!writtenSvgHashes.has(hash)) {
      writtenSvgHashes.add(hash)

      await mkdir(PUBLIC_SVG_DIR, { recursive: true })
      await mkdir(BUILD_SVG_DIR, { recursive: true })

      const publicPath = path.join(PUBLIC_SVG_DIR, fileName)
      const buildPath = path.join(BUILD_SVG_DIR, fileName)

      if (!existsSync(publicPath)) await writeFile(publicPath, svgMarkup, "utf8")
      if (!existsSync(buildPath)) await writeFile(buildPath, svgMarkup, "utf8")
    }

    const img = $("<img>")

    for (const attr of SVG_TO_IMG_ATTRS) {
      const value = $svg.attr(attr)
      if (value != null) img.attr(attr, value)
    }

    // A global reset sets this on the svg tag. Keep it explicit since an
    // img tag won't match that rule.
    img.attr("style", `display:block;vertical-align:middle;${$svg.attr("style") ?? ""}`)

    if (!img.attr("aria-label")) {
      img.attr("alt", "")
    }

    img.attr("src", `/${SVG_ASSETS_RELATIVE_DIR}/${fileName}`)

    $svg.replaceWith(img)
  }
}

/** Hashes of stylesheets already written to disk this run, so repeats are just a lookup. */
const writtenCssHashes = new Set<string>()

/**
 * The style blocks are the same for every verse in a combo and are most of
 * a page's weight. Extracts each to a content-hashed stylesheet once per
 * shell, swapping the inline block for a <link>.
 */
async function extractStyleAssets($: ReturnType<typeof cheerio.load>): Promise<void> {
  for (const el of $("style").toArray()) {
    const $style = $(el)
    const css = $style.html() ?? ""

    if (!css.trim()) continue

    const hash = createHash("sha256").update(css).digest("hex").slice(0, 16)
    const fileName = `${hash}.css`

    if (!writtenCssHashes.has(hash)) {
      writtenCssHashes.add(hash)

      await mkdir(PUBLIC_CSS_DIR, { recursive: true })
      await mkdir(BUILD_CSS_DIR, { recursive: true })

      const publicPath = path.join(PUBLIC_CSS_DIR, fileName)
      const buildPath = path.join(BUILD_CSS_DIR, fileName)

      if (!existsSync(publicPath)) await writeFile(publicPath, css, "utf8")
      if (!existsSync(buildPath)) await writeFile(buildPath, css, "utf8")
    }

    const link = $("<link>")
    link.attr("rel", "stylesheet")
    link.attr("href", `/${CSS_ASSETS_RELATIVE_DIR}/${fileName}`)

    $style.replaceWith(link)
  }
}

function attrsOf($el: ReturnType<cheerio.CheerioAPI>): Record<string, string> {
  return { ...($el.attr() ?? {}) }
}

/** Lifts one word span's attributes, to be cloned for every other verse's words. */
function extractWordTemplate(
  $: ReturnType<typeof cheerio.load>,
): WordTemplate | null {
  // The captured page also renders the main verse list behind the dialog,
  // which has its own [data-word-index] words — stay scoped to the dialog.
  const wrapper = $('[aria-label="paper-dialog-content"]')
    .find("[data-word-index]")
    .first()
  if (!wrapper.length) return null

  const meaning = wrapper.find(".word-meaning").first()
  const meaningsWrapper = meaning.length ? meaning.parent() : null

  return {
    wrapper: attrsOf(wrapper),
    arabic: attrsOf(wrapper.find(".arabic-lex").first()),
    transliteration: attrsOf(
      wrapper.find('[data-testid="word-transliteration"]').first(),
    ),
    meaningsWrapper: meaningsWrapper ? attrsOf(meaningsWrapper) : null,
    meaning: meaning.length ? attrsOf(meaning) : null,
  }
}

/** Lifts one captured footnote item's attributes, to build every other verse's list. */
function extractFootnoteTemplate(
  $: ReturnType<typeof cheerio.load>,
): FootnoteTemplate | null {
  const list = $('[aria-label="paper-dialog-content"]')
    .find(".exegesis-footnotes")
    .first()
  if (!list.length) return null

  const item = list.find(".exegesis-footnote-item").first()
  if (!item.length) return null

  return {
    list: attrsOf(list),
    item: attrsOf(item),
    marker: attrsOf(item.find(".exegesis-footnote-marker").first()),
  }
}

const SHELL_CACHE_DIR = path.resolve("scripts", "ssg-shells")

/** Where a combo's captured shell is cached, so reruns can skip Playwright entirely. */
function getShellCachePath(exegesisId: string, locale: string): string {
  return path.join(SHELL_CACHE_DIR, `${exegesisId}.${locale}.html`)
}

/**
 * Swaps in the dialog wrapper from a second capture, keeping the rest of
 * baseHtml (its background reading list) untouched.
 */
function replaceDialogWrapper(baseHtml: string, richHtmlRaw: string): string {
  const $base = cheerio.load(baseHtml, { decodeEntities: false })
  const $rich = cheerio.load(richHtmlRaw, { decodeEntities: false })

  const richWrapper = $rich('[aria-label="paper-dialog-wrapper"]')
  if (!richWrapper.length) return baseHtml

  $base('[aria-label="paper-dialog-wrapper"]').replaceWith($rich.html(richWrapper))

  return $base.html()
}

/**
 * Captures a combo's shell, or reuses a cached one from scripts/ssg-shells.
 * Delete the matching file there to force a fresh capture.
 *
 * Two navigations get merged into one shell: the background reading list
 * always comes from chapter 1 (stable, quick to render, easy to splice a
 * real chapter's name into later), while the dialog comes from whichever
 * verse exercises the richest markup (translation, exegesis, footnotes, a
 * scripture quote) so its CSS and templates are complete.
 */
async function captureShell(
  page: Page,
  { locale, exegesisId }: ExegesisEntry,
  chapters: Chapters,
): Promise<Shell> {
  const cachePath = getShellCachePath(exegesisId, locale)

  let mergedHtml: string

  if (existsSync(cachePath)) {
    mergedHtml = await readFile(cachePath, "utf8")
  } else {
    const backgroundRoute = getAppUrl(BASE_URL, locale, 1, 1, exegesisId)

    await page.goto(backgroundRoute, { waitUntil: "networkidle" })
    await page.reload({ waitUntil: "networkidle" })
    await waitForDialog(page)
    await waitForChapterHeader(page, 1)

    const backgroundHtml = stripBackgroundVerseRows(await page.content())

    const { chapterId, verseNumber } = await findRichCaptureVerse(
      exegesisId,
      locale,
      chapters,
    )
    const richRoute = getAppUrl(BASE_URL, locale, chapterId, verseNumber, exegesisId)

    await page.goto(richRoute, { waitUntil: "networkidle" })
    await page.reload({ waitUntil: "networkidle" })
    await waitForDialog(page)

    const richHtmlRaw = await page.content()

    mergedHtml = stripAppBootstrapScripts(
      enlargeExegesisShell(replaceDialogWrapper(backgroundHtml, richHtmlRaw)),
    )

    await mkdir(SHELL_CACHE_DIR, { recursive: true })
    await writeFile(cachePath, mergedHtml, "utf8")
  }

  const $ = cheerio.load(mergedHtml, { decodeEntities: false })

  await extractStyleAssets($)
  await extractSvgAssets($)

  const html = $.html()
  const wordTemplate = extractWordTemplate($)
  const footnoteTemplate = extractFootnoteTemplate($)

  return { html, wordTemplate, footnoteTemplate }
}

function buildWordsHtml(
  $: ReturnType<typeof cheerio.load>,
  template: WordTemplate,
  words: ImlaeiWord[],
  wbwTranslations: Record<string, string>,
  chapterId: number,
  verseNumber: number,
): string {
  return words
    .map((word, i) => {
      const wrapper = $("<span></span>")
      for (const [name, value] of Object.entries(template.wrapper)) {
        wrapper.attr(name, value)
      }
      wrapper.attr("data-word-index", String(i))

      const arabic = $("<span></span>")
      for (const [name, value] of Object.entries(template.arabic)) {
        arabic.attr(name, value)
      }
      arabic.text(word.word)

      const transliteration = $("<span></span>")
      for (const [name, value] of Object.entries(template.transliteration)) {
        transliteration.attr(name, value)
      }
      transliteration.text(word.trans)

      wrapper.append(arabic).append(transliteration)

      const meaning = wbwTranslations[`${chapterId}:${verseNumber}:${i + 1}`]

      if (meaning && template.meaningsWrapper && template.meaning) {
        const meaningsWrapper = $("<span></span>")
        for (const [name, value] of Object.entries(template.meaningsWrapper)) {
          meaningsWrapper.attr(name, value)
        }

        const meaningEl = $("<span></span>")
        for (const [name, value] of Object.entries(template.meaning)) {
          meaningEl.attr(name, value)
        }
        meaningEl.text(meaning)

        meaningsWrapper.append(meaningEl)
        wrapper.append(meaningsWrapper)
      }

      return $.html(wrapper)
    })
    .join("")
}

function buildFootnotesHtml(
  $: ReturnType<typeof cheerio.load>,
  template: FootnoteTemplate,
  footnotes: Record<string, string>,
  exegesisId: string,
): string {
  return Object.entries(footnotes)
    .map(([key, text]) => {
      const item = $("<li></li>")
      for (const [name, value] of Object.entries(template.item)) {
        item.attr(name, value)
      }
      item.attr("id", `fn-${exegesisId}-${key}`)

      const marker = $("<span></span>")
      for (const [name, value] of Object.entries(template.marker)) {
        marker.attr(name, value)
      }
      marker.text(key)

      const text_ = $("<span></span>")
      text_.attr("class", "exegesis-footnote-text")
      text_.html(renderFootnoteText(text))

      item.append(marker).append(text_)

      return $.html(item)
    })
    .join("")
}

/** Selectors of static-only elements: clicking any of them sends the visitor into the real app. */
const REDIRECT_TRIGGER_SELECTORS = [
  '[aria-label="overlay-blocker"]',
  ".exegesis-source-label",
  ".app-header",
  '[aria-label="verse-bookmarker-btn"]',
  '[aria-label="paper-dialog-drag-indicator"]',
  '[aria-label="split-pane-divider"]',
]

/**
 * Static triggers redirect to the real app immediately. Prev/next links
 * fetch the adjacent static page and splice its content in, with no redirect.
 */
function buildRedirectScript(data: {
  siteUrl: string
  chapterId: number
  verseNumber: number
  exegesisId: string
  locale: string
}): string {
  const script = `(function(){
var DATA=${JSON.stringify(data)};
var TRIGGER_SELECTORS=${JSON.stringify(REDIRECT_TRIGGER_SELECTORS)};

function realAppUrl(verse){
  var params=new URLSearchParams({tafsir:DATA.exegesisId,transliteration:"1",locale:DATA.locale});
  return DATA.siteUrl+"/#/e/"+DATA.chapterId+"/"+verse+"?"+params.toString();
}

function redirectNow(verse){
  window.location.href=realAppUrl(verse);
}

function wireStaticTriggers(root){
  TRIGGER_SELECTORS.forEach(function(sel){
    root.querySelectorAll(sel).forEach(function(el){
      el.addEventListener("click",function(){redirectNow(DATA.verseNumber)});
    });
  });
}

function wireTraversal(root){
  root.querySelectorAll('a[data-testid="prev-verse-btn"],a[data-testid="next-verse-btn"]').forEach(function(link){
    link.addEventListener("click",function(e){
      e.preventDefault();
      var href=link.getAttribute("href");
      var delta=link.getAttribute("data-testid")==="prev-verse-btn"?-1:1;
      var targetVerse=DATA.verseNumber+delta;

      fetch(href).then(function(res){return res.text()}).then(function(html){
        var doc=new DOMParser().parseFromString(html,"text/html");
        var newContent=doc.querySelector('[aria-label="paper-dialog-content"]');
        var oldContent=document.querySelector('[aria-label="paper-dialog-content"]');
        if(!newContent||!oldContent)return;

        oldContent.replaceWith(newContent);
        document.title=doc.title;
        history.pushState(null,"",href);
        DATA.verseNumber=targetVerse;

        wireStaticTriggers(newContent);
        wireTraversal(newContent);
      }).catch(function(){});
    });
  });
}

wireStaticTriggers(document);
wireTraversal(document);
})();`

  return `<script>${script}</script>`
}

async function generatePage(
  shell: Shell,
  words: ImlaeiWord[],
  exegesisChapter: ExegesisChapterAsset,
  wbwTranslations: Record<string, string>,
  hash: string,
  {
    locale,
    chapterId,
    exegesisId,
    chapterSlug,
    chapterName,
    chapterMeaning,
    chapterArabicName,
    verseNumber,
    chapterLength,
  }: {
    locale: string
    chapterId: number
    exegesisId: string
    chapterSlug: string
    chapterName: string
    chapterMeaning: string | null
    chapterArabicName: string | null
    verseNumber: number
    chapterLength: number
  },
) {
  const verseKey = `${chapterId}:${verseNumber}`
  const verseWords = words.filter((w) => w.id === verseKey)
  const translation = exegesisChapter.translations?.[String(verseNumber)]
  const exegesisText = exegesisChapter.exegesis?.[String(verseNumber)]

  const $ = cheerio.load(shell.html, { decodeEntities: false })

  // The app header's title is frozen from whichever chapter the shell was
  // captured from — always overwrite it with the actual chapter shown here.
  $('.app-header [aria-label="title-title"]').text(
    `${chapterId}. ${chapterName} (${chapterMeaning ?? ""})`,
  )

  // Same for the background reading list's chapter panel, always captured
  // as chapter 1 — swap in the real chapter's name and meaning.
  $(".ChapterRow-name").text(chapterArabicName ?? "")
  $(".ChapterRow-description").text(`${chapterName} · ${chapterMeaning ?? ""}`)

  /*
   * The captured page also renders the main (virtualized) verse list behind
   * the dialog, which has its own [data-word-index]/exegesis-* look-alikes.
   * Every lookup below must stay scoped to the dialog itself.
   */
  const dialogContent = $('[aria-label="paper-dialog-content"]')

  const existingWords = dialogContent.find("[data-word-index]")

  if (shell.wordTemplate && verseWords.length > 0) {
    // Word rows can be split across several row-wrapper containers (see
    // useAligner), so a single parent isn't guaranteed to hold them all —
    // mark where the first one was, then remove every word wherever it is.
    const insertionPoint = $("<span></span>")
    existingWords.first().before(insertionPoint)
    existingWords.remove()
    insertionPoint.replaceWith(
      buildWordsHtml(
        $,
        shell.wordTemplate,
        verseWords,
        wbwTranslations,
        chapterId,
        verseNumber,
      ),
    )
  } else {
    // Never leave the shell's own capture-verse words in place — showing
    // Quranic text from the wrong verse is worse than showing none.
    existingWords.remove()
  }

  const exegesisAuthorName = Asset.exegesisOf(exegesisId)?.name ?? exegesisId

  dialogContent
    .find('.exegesis-source-label')
    .text(`Tafsir ${exegesisAuthorName}`)

  dialogContent
    .find('[aria-label="verse-indicator"]')
    .text(String(verseNumber))

  if (translation != null) {
    dialogContent
      .find('.exegesis-translation')
      .html(renderExegesisMarkdown(translation))
  } else {
    // Never leave the shell's own capture-verse translation in place —
    // it belongs to a different verse.
    dialogContent.find('.exegesis-translation').remove()
  }

  if (exegesisText) {
    dialogContent
      .find('.exegesis-body')
      .html(renderExegesisMarkdown(exegesisText))
  } else {
    dialogContent.find('.exegesis-body').remove()
  }

  const verseFootnotes = exegesisChapter.footnotes?.[String(verseNumber)]

  if (shell.footnoteTemplate && verseFootnotes && Object.keys(verseFootnotes).length > 0) {
    const list = dialogContent.find(".exegesis-footnotes")
    list.find(".exegesis-footnote-item").remove()
    list.append(buildFootnotesHtml($, shell.footnoteTemplate, verseFootnotes, exegesisId))
  } else {
    // Never leave the shell's own capture-verse footnotes in place — they
    // belong to a different verse.
    dialogContent.find('.exegesis-footnotes').remove()
  }

  $("body").append(
    buildRedirectScript({
      siteUrl: PRODUCTION_URL,
      chapterId,
      verseNumber,
      exegesisId,
      locale,
    }),
  )
  $("body").append(buildHashComment(hash))

  let html = $.html()

  html = patchTitle(
    html,
    `${chapterName}:${verseNumber} Tafsir ${exegesisAuthorName} - bil-Quran`,
  )

  if (verseNumber > 1) {
    const result = replaceButtonWithLink(
      html,
      '[data-testid="prev-verse-btn"]',
      `/tafsir/${exegesisId}/${locale}/${chapterSlug}/${verseNumber - 1}.html`,
    )

    if (result.replaced) {
      html = result.html
    }
  }

  if (verseNumber < chapterLength) {
    const result = replaceButtonWithLink(
      html,
      '[data-testid="next-verse-btn"]',
      `/tafsir/${exegesisId}/${locale}/${chapterSlug}/${verseNumber + 1}.html`,
    )

    if (result.replaced) {
      html = result.html
    }
  }

  const productionHtml = html
    .replaceAll(BASE_URL, PRODUCTION_URL)
    .replaceAll(`http://localhost:${PORT}`, PRODUCTION_URL)

  const minifiedHtml = minify(Buffer.from(productionHtml, "utf8"), {
    keep_comments: true,
  }).toString("utf8")

  const outputPath = getOutputPath(exegesisId, locale, chapterSlug, verseNumber)

  await mkdir(path.dirname(outputPath), {
    recursive: true,
  })

  await writeFile(outputPath, minifiedHtml, "utf8")
}

async function main() {
  const chapters = await loadChapters()
  const exegeses = await loadExegeses()

  console.log(`Found ${Object.keys(chapters).length} chapters.`)
  console.log(`Found ${exegeses.length} locale/exegesis combinations.`)

  const chapterEntries = Object.entries(chapters)

  const totalVerses = Object.values(chapters).reduce(
    (total, chapter) => total + chapter.length,
    0,
  )

  console.log(`Found ${totalVerses} verses.`)

  console.log("Starting production build server...")

  const server = startServer()

  try {
    await waitForServer(BASE_URL)

    console.log(`Server ready: ${BASE_URL}`)

    const browser = await chromium.launch()

    let shells: Map<string, Shell>

    try {
      const shellPage = await browser.newPage()

      try {
        console.log(`Capturing ${exegeses.length} app shell(s)...`)

        shells = new Map()

        for (const entry of exegeses) {
          const shell = await captureShell(shellPage, entry, chapters)
          shells.set(`${entry.locale}:${entry.exegesisId}`, shell)
        }
      } finally {
        await shellPage.close()
      }
    } finally {
      await browser.close()
    }

    /*
     * Progress is tracked independently for every
     * locale/exegesis combination.
     */
    const progress = new Map<string, number>()

    for (const { locale, exegesisId } of exegeses) {
      progress.set(`${locale}:${exegesisId}`, 0)
    }

    /*
     * Shared chapter queue, consumed by a fixed pool of workers doing pure
     * Node rendering — no browser involved past the shell captures above.
     */
    let nextChapterIndex = 0

    async function worker() {
      while (true) {
        const index = nextChapterIndex++

        if (index >= chapterEntries.length) {
          return
        }

        const [chapterIdString, chapter] = chapterEntries[index]
        const chapterId = Number(chapterIdString)
        const words = await readImlaeiWords(chapterId)

        for (const { locale, exegesisId } of exegeses) {
          const seoLocale = locale.split("-")[0]

          const transliteration =
            chapter.transliterations[locale] ??
            chapter.transliterations["en-US"]

          const chapterMeaning =
            chapter.meanings[locale] ?? chapter.meanings["en-US"]

          const chapterArabicName =
            chapter.namings[locale] ?? chapter.namings["en-US"]

          if (!transliteration) {
            console.warn(
              `Skipping chapter ${chapterId}: no transliteration for ${locale}`,
            )

            continue
          }

          const chapterSlug = slugify(transliteration)
          const progressKey = `${locale}:${exegesisId}`
          const shell = shells.get(progressKey)

          if (!shell) {
            throw new Error(`Missing captured shell for ${progressKey}`)
          }

          const exegesisChapter = await readExegesisChapter(
            exegesisId,
            locale,
            chapterId,
          )
          const wbwTranslations = await readWbwTranslations(locale)

          const hash = await computeChapterHash(
            exegesisId,
            locale,
            chapterId,
            wbwTranslations,
          )

          const chapterDir = getChapterDir(exegesisId, locale, chapterSlug)
          const versesToGenerate = await decideChapterWork(
            chapterDir,
            chapter.length,
            hash,
          )

          const alreadyDone = chapter.length - versesToGenerate.length
          if (alreadyDone > 0) {
            const completed = (progress.get(progressKey) ?? 0) + alreadyDone
            progress.set(progressKey, completed)
            updateProgress(
              progressKey,
              `${exegesisId} - ${seoLocale}`,
              completed,
              totalVerses,
            )
          }

          for (const verseNumber of versesToGenerate) {
            await generatePage(shell, words, exegesisChapter, wbwTranslations, hash, {
              locale,
              chapterId,
              exegesisId,
              chapterSlug,
              chapterName: transliteration,
              chapterMeaning,
              chapterArabicName,
              verseNumber,
              chapterLength: chapter.length,
            })

            const completed = (progress.get(progressKey) ?? 0) + 1

            progress.set(progressKey, completed)

            updateProgress(
              progressKey,
              `${exegesisId} - ${seoLocale}`,
              completed,
              totalVerses,
            )
          }
        }
      }
    }

    const workerCount = Math.min(MAX_WORKERS, chapterEntries.length)

    await Promise.all(Array.from({ length: workerCount }, () => worker()))
  } finally {
    await stopServer(server)
  }

  console.log("SSG generation complete.")
}

function replaceButtonWithLink(html: string, selector: string, href: string) {
  const $ = cheerio.load(html, {
    decodeEntities: false,
  })

  const button = $(selector).first()

  if (!button.length) {
    return {
      html,
      replaced: false,
    }
  }

  if (button[0].tagName !== "button") {
    return {
      html,
      replaced: false,
      reason: `element-is-${button[0].tagName}`,
    }
  }

  const link = $("<a></a>")

  /*
   * Preserve every attribute from the button.
   *
   * This includes:
   *
   *   class="sc-ezrbvT bDHAli"
   *   data-testid="next-verse-btn"
   *   aria-label="next-verse-btn"
   */
  for (const attribute of button[0].attribs
    ? Object.entries(button[0].attribs)
    : []) {
    const [name, value] = attribute

    link.attr(name, value)
  }

  link.attr("href", href)

  /*
   * Preserve the entire contents of the button:
   *
   *   <span>
   *     <svg>
   *       ...
   *     </svg>
   *   </span>
   */
  link.append(button.contents())

  button.replaceWith(link)

  return {
    html: $.html(),
    replaced: true,
  }
}

function patchTitle(html: string, title: string) {
  const pattern = /<title>[^<]*<\/title>/

  if (!pattern.test(html)) {
    console.warn("  did not patch title: element not found")
    return html
  }

  const escaped = title
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

  return html.replace(pattern, `<title>${escaped}</title>`)
}

function enlargeExegesisShell(html: string) {
  const pattern = /(<[^>]*aria-label="paper-dialog-wrapper"[^>]*)(>)/

  if (!pattern.test(html)) {
    console.warn("  did not enlarge exegesis shell: element not found")
    return html
  }

  return html.replace(pattern, (_match, openingTag, closing) => {
    let result = openingTag

    if (/\bstyle="[^"]*"/.test(result)) {
      result = result.replace(
        /style="([^"]*)"/,
        (_styleMatch, styles) =>
          `style="${styles}; transform: none; max-height: 100dvh;"`,
      )
    } else {
      result += ` style="transform: none; max-height: 100dvh;"`
    }

    return result + closing
  })
}

const progressLines = new Map<string, number>()

function updateProgress(
  key: string,
  label: string,
  completed: number,
  total: number,
) {
  let line = progressLines.get(key)

  if (line === undefined) {
    line = progressLines.size
    progressLines.set(key, line)

    process.stdout.write(
      `[${label}] ${completed} / ${total} ` +
        `(${((completed / total) * 100).toFixed(2)}%)\n`,
    )

    return
  }

  /*
   * Save current cursor position.
   */
  process.stdout.write("\x1b7")

  /*
   * Move to the progress line.
   *
   * The cursor is normally at the line immediately after
   * all progress entries.
   */
  const linesUp = progressLines.size - line

  if (linesUp > 0) {
    process.stdout.write(`\x1b[${linesUp}A`)
  }

  /*
   * Replace the entire line.
   */
  process.stdout.write("\r\x1b[2K")

  process.stdout.write(
    `[${label}] ${completed} / ${total} ` +
      `(${((completed / total) * 100).toFixed(2)}%)`,
  )

  /*
   * Restore cursor to where it was.
   */
  process.stdout.write("\x1b8")
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
