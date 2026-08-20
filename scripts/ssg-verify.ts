import * as cheerio from "cheerio"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { Asset } from "@constants/assets"
import { Locale } from "@constants/settings"

const KNOWN_LOCALES: string[] = Object.values(Locale)

/** Mirrors ssg-generate.tsx's REDIRECT_TRIGGER_SELECTORS, kept independent on purpose. */
const REDIRECT_TRIGGER_SELECTORS = [
  '[aria-label="overlay-blocker"]',
  ".exegesis-source-label",
  ".app-header",
  '[aria-label="verse-bookmarker-btn"]',
  '[aria-label="paper-dialog-drag-indicator"]',
]
const CONCURRENCY = 32
const PRODUCTION_URL = "https://bil-quran.com"

const PUBLIC_QURAN = path.resolve("public/quran")
const CHAPTERS_PATH = path.join(PUBLIC_QURAN, "chapters.json")
const EXEGESIS_PATH = path.join(PUBLIC_QURAN, "exegesis")
const BUILD_TAFSIR_PATH = path.resolve("build/tafsir")

interface Chapter {
  length: number
  transliterations: Record<string, string | null>
}

type Chapters = Record<string, Chapter>

interface ExegesisEntry {
  locale: string
  exegesisId: string
}

interface ImlaeiWord {
  id: string
  word: string
  trans: string
  root: string
}

interface ExegesisChapterAsset {
  translations?: Record<string, string>
  exegesis?: Record<string, string | null>
}

interface Failure {
  path: string
  reason: string
}

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
  return JSON.parse(await readFile(CHAPTERS_PATH, "utf8"))
}

async function readDirectoryNames(directory: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises")
  const entries = await readdir(directory, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => e.name)
}

/** Mirrors ssg-generate.tsx's loadExegeses(), kept independent on purpose. */
async function loadExegeses(): Promise<ExegesisEntry[]> {
  const exegesisIds = await readDirectoryNames(EXEGESIS_PATH)
  const result: ExegesisEntry[] = []

  for (const exegesisId of exegesisIds) {
    const locales = await readDirectoryNames(path.join(EXEGESIS_PATH, exegesisId))

    for (const locale of locales) {
      if (!KNOWN_LOCALES.includes(locale)) continue
      result.push({ locale, exegesisId })
    }
  }

  return result
}

const wordsCache = new Map<number, Promise<ImlaeiWord[]>>()

function readImlaeiWords(chapterId: number): Promise<ImlaeiWord[]> {
  let promise = wordsCache.get(chapterId)

  if (!promise) {
    promise = readFile(
      path.join(PUBLIC_QURAN, "verses", "imlaei", `${chapterId}.json`),
      "utf8",
    ).then((raw) => JSON.parse(raw))
    wordsCache.set(chapterId, promise)
  }

  return promise
}

const exegesisChapterCache = new Map<string, Promise<ExegesisChapterAsset>>()

function readExegesisChapter(
  exegesisId: string,
  locale: string,
  chapterId: number,
): Promise<ExegesisChapterAsset> {
  const key = `${exegesisId}:${locale}:${chapterId}`
  let promise = exegesisChapterCache.get(key)

  if (!promise) {
    promise = readFile(
      path.join(EXEGESIS_PATH, exegesisId, locale, `${chapterId}.json`),
      "utf8",
    ).then((raw) => JSON.parse(raw))
    exegesisChapterCache.set(key, promise)
  }

  return promise
}

const WBW_TRANSLATION_LOCALES = ["en-US", "id-ID"]
const wbwTranslationsCache = new Map<string, Promise<Record<string, string>>>()

/** Mirrors ssg-generate.tsx's readWbwTranslations(), kept independent on purpose. */
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

const exegesisNameCache = new Map<string, Promise<string>>()

function getExegesisName(exegesisId: string): Promise<string> {
  let promise = exegesisNameCache.get(exegesisId)

  if (!promise) {
    promise = readFile(
      path.join(EXEGESIS_PATH, exegesisId, "about.json"),
      "utf8",
    ).then((raw) => (JSON.parse(raw) as { name: string }).name)
    exegesisNameCache.set(exegesisId, promise)
  }

  return promise
}

function getOutputPath(
  exegesisId: string,
  locale: string,
  chapterSlug: string,
  verseNumber: number,
) {
  return path.join(
    BUILD_TAFSIR_PATH,
    exegesisId,
    locale,
    chapterSlug,
    `${verseNumber}.html`,
  )
}

function getAppUrl(
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

  return `${PRODUCTION_URL}/#/e/${chapterId}/${verseNumber}?${params.toString()}`
}

/**
 * Checks one generated page against what ssg-generate.tsx should have
 * produced for it. Returns a failure reason, or null if it looks sane.
 */
async function verifyPage(input: {
  outputPath: string
  relativePath: string
  chapterId: number
  chapterName: string
  chapterSlug: string
  exegesisId: string
  exegesisName: string
  locale: string
  verseNumber: number
  chapterLength: number
}): Promise<Failure | null> {
  const {
    outputPath,
    relativePath,
    chapterId,
    chapterName,
    chapterSlug,
    exegesisId,
    exegesisName,
    locale,
    verseNumber,
    chapterLength,
  } = input

  let html: string
  try {
    html = await readFile(outputPath, "utf8")
  } catch {
    return { path: relativePath, reason: "file missing" }
  }

  const expectedTitle = `bil-Quran: ${chapterName}:${verseNumber} with Tafsir ${exegesisName}`
  if (!html.includes(`<title>${escapeHtml(expectedTitle)}</title>`)) {
    return { path: relativePath, reason: "title mismatch or missing" }
  }

  const $ = cheerio.load(html, { decodeEntities: false })
  const dialogContent = $('[aria-label="paper-dialog-content"]')

  if (!dialogContent.length) {
    return { path: relativePath, reason: "no dialog content element" }
  }

  const wrapperStyle = $('[aria-label="paper-dialog-wrapper"]').attr("style") ?? ""
  if (!wrapperStyle.includes("transform: none")) {
    return { path: relativePath, reason: "dialog wrapper not enlarged" }
  }

  const expectedAuthorName = Asset.exegesisOf(exegesisId)?.name ?? exegesisId
  const sourceLabelText = dialogContent.find(".exegesis-source-label").text()
  if (sourceLabelText !== `Tafsir ${expectedAuthorName}`) {
    return {
      path: relativePath,
      reason: `source label is "${sourceLabelText}", expected "Tafsir ${expectedAuthorName}"`,
    }
  }

  const verseIndicatorText = dialogContent
    .find('[aria-label="verse-indicator"]')
    .text()
  if (verseIndicatorText !== String(verseNumber)) {
    return {
      path: relativePath,
      reason: `verse indicator is "${verseIndicatorText}", expected "${verseNumber}"`,
    }
  }

  const [words, exegesisChapter] = await Promise.all([
    readImlaeiWords(chapterId),
    readExegesisChapter(exegesisId, locale, chapterId),
  ])

  const verseKey = `${chapterId}:${verseNumber}`
  const expectedWords = words.filter((w) => w.id === verseKey)
  const actualWordEls = dialogContent.find("[data-word-index]")

  if (actualWordEls.length !== expectedWords.length) {
    return {
      path: relativePath,
      reason: `word count ${actualWordEls.length}, expected ${expectedWords.length}`,
    }
  }

  // Word count alone doesn't catch content bleeding in from elsewhere on the
  // page (e.g. the main reading view, which shares this same word markup) —
  // check the actual Arabic text too, not just how many elements exist.
  if (expectedWords.length > 0) {
    const actualFirstWord = actualWordEls.first().find(".arabic-lex").text()
    const actualLastWord = actualWordEls.last().find(".arabic-lex").text()

    if (actualFirstWord !== expectedWords[0].word) {
      return {
        path: relativePath,
        reason: `first word "${actualFirstWord}", expected "${expectedWords[0].word}"`,
      }
    }

    if (actualLastWord !== expectedWords[expectedWords.length - 1].word) {
      return {
        path: relativePath,
        reason: `last word "${actualLastWord}", expected "${expectedWords[expectedWords.length - 1].word}"`,
      }
    }

    const wbwTranslations = await readWbwTranslations(locale)
    const expectedFirstMeaning = wbwTranslations[`${chapterId}:${verseNumber}:1`]

    if (expectedFirstMeaning) {
      const actualFirstMeaning = actualWordEls.first().find(".word-meaning").text()

      if (actualFirstMeaning !== expectedFirstMeaning) {
        return {
          path: relativePath,
          reason: `first word meaning "${actualFirstMeaning}", expected "${expectedFirstMeaning}"`,
        }
      }
    }
  }

  const translation = exegesisChapter.translations?.[String(verseNumber)]
  const translationText = dialogContent
    .find('.exegesis-translation')
    .text()
    .trim()

  if (translation != null && translationText.length === 0) {
    return { path: relativePath, reason: "translation text missing" }
  }

  const exegesisText = exegesisChapter.exegesis?.[String(verseNumber)]
  const bodyEl = dialogContent.find('.exegesis-body')

  if (exegesisText && bodyEl.text().trim().length === 0) {
    return { path: relativePath, reason: "exegesis body missing" }
  }

  if (!exegesisText && bodyEl.length > 0) {
    return { path: relativePath, reason: "exegesis body present but shouldn't be" }
  }

  const expectedRedirect = getAppUrl(locale, chapterId, verseNumber, exegesisId)
  if (!html.includes(expectedRedirect)) {
    return { path: relativePath, reason: "redirect script missing or wrong URL" }
  }

  for (const selector of REDIRECT_TRIGGER_SELECTORS) {
    if ($(selector).length === 0) {
      return { path: relativePath, reason: `redirect trigger "${selector}" not found` }
    }
  }

  const prevLink = $('[data-testid="prev-verse-btn"]')
  const nextLink = $('[data-testid="next-verse-btn"]')

  if (verseNumber > 1) {
    const expectedHref = `/tafsir/${exegesisId}/${locale}/${chapterSlug}/${verseNumber - 1}.html`

    if (prevLink.prop("tagName") !== "A" || prevLink.attr("href") !== expectedHref) {
      return {
        path: relativePath,
        reason: `prev link is "${prevLink.attr("href")}", expected "${expectedHref}"`,
      }
    }
  } else if (prevLink.prop("tagName") !== "BUTTON") {
    return { path: relativePath, reason: "prev should stay a button at verse 1" }
  }

  if (verseNumber < chapterLength) {
    const expectedHref = `/tafsir/${exegesisId}/${locale}/${chapterSlug}/${verseNumber + 1}.html`

    if (nextLink.prop("tagName") !== "A" || nextLink.attr("href") !== expectedHref) {
      return {
        path: relativePath,
        reason: `next link is "${nextLink.attr("href")}", expected "${expectedHref}"`,
      }
    }
  } else if (nextLink.prop("tagName") !== "BUTTON") {
    return { path: relativePath, reason: "next should stay a button at the last verse" }
  }

  return null
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

async function main() {
  const chapters = await loadChapters()
  const exegeses = await loadExegeses()
  const chapterEntries = Object.entries(chapters)

  console.log(`Verifying ${exegeses.length} combo(s) x ${chapterEntries.length} chapters...`)

  interface Task {
    outputPath: string
    relativePath: string
    chapterId: number
    chapterName: string
    chapterSlug: string
    exegesisId: string
    exegesisName: string
    locale: string
    verseNumber: number
    chapterLength: number
  }

  const tasks: Task[] = []

  for (const { locale, exegesisId } of exegeses) {
    const exegesisName = await getExegesisName(exegesisId)

    for (const [chapterIdString, chapter] of chapterEntries) {
      const chapterId = Number(chapterIdString)

      const transliteration =
        chapter.transliterations[locale] ?? chapter.transliterations["en-US"]

      if (!transliteration) continue

      const chapterSlug = slugify(transliteration)

      for (let verseNumber = 1; verseNumber <= chapter.length; verseNumber++) {
        const outputPath = getOutputPath(exegesisId, locale, chapterSlug, verseNumber)

        tasks.push({
          outputPath,
          relativePath: path.relative(process.cwd(), outputPath),
          chapterId,
          chapterName: transliteration,
          chapterSlug,
          exegesisId,
          exegesisName,
          locale,
          verseNumber,
          chapterLength: chapter.length,
        })
      }
    }
  }

  console.log(`Checking ${tasks.length} generated page(s)...`)

  const failures: Failure[] = []
  let checked = 0
  let nextIndex = 0

  async function worker() {
    while (true) {
      const index = nextIndex++
      if (index >= tasks.length) return

      const failure = await verifyPage(tasks[index])
      if (failure) failures.push(failure)

      checked++
      if (checked % 500 === 0 || checked === tasks.length) {
        process.stdout.write(`\r${checked} / ${tasks.length} checked`)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker()),
  )

  process.stdout.write("\n")

  if (failures.length === 0) {
    console.log(`All ${tasks.length} pages look sane.`)
    return
  }

  console.log(`${failures.length} / ${tasks.length} page(s) failed:`)

  for (const failure of failures.slice(0, 50)) {
    console.log(`  ${failure.path}: ${failure.reason}`)
  }

  if (failures.length > 50) {
    console.log(`  ...and ${failures.length - 50} more`)
  }

  process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
