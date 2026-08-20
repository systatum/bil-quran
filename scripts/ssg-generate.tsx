import { Asset } from "@constants/assets"
import { Locale } from "@constants/settings"
import { renderExegesisMarkdown } from "@services/markdown"
import * as cheerio from "cheerio"
import { spawn } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
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
}

/** Attributes lifted off one captured word span, reused to build every other verse's words. */
interface WordTemplate {
  wrapper: Record<string, string>
  arabic: Record<string, string>
  transliteration: Record<string, string>
  meaningsWrapper: Record<string, string> | null
  meaning: Record<string, string> | null
}

/** A captured, fully-bootstrapped page, reused as the shell for every verse in this combo. */
interface Shell {
  html: string
  wordTemplate: WordTemplate | null
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

const exegesisNameCache = new Map<string, Promise<string>>()

/** Reads an exegesis work's display name from its `about.json`, cached per slug. */
function getExegesisName(slug: string): Promise<string> {
  let promise = exegesisNameCache.get(slug)

  if (!promise) {
    promise = readFile(
      path.join(EXEGESIS_PATH, slug, "about.json"),
      "utf8",
    ).then((raw) => (JSON.parse(raw) as { name: string }).name)
    exegesisNameCache.set(slug, promise)
  }

  return promise
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

/** Reads the raw interlinear (Imlaei) word list for a chapter. */
async function readImlaeiWords(chapterId: number): Promise<ImlaeiWord[]> {
  const raw = await readFile(
    path.join(PUBLIC_QURAN, "verses", "imlaei", `${chapterId}.json`),
    "utf8",
  )
  return JSON.parse(raw)
}

/** Reads the raw exegesis asset for one work/locale/chapter. */
async function readExegesisChapter(
  slug: string,
  locale: string,
  chapterId: number,
): Promise<ExegesisChapterAsset> {
  const raw = await readFile(
    path.join(EXEGESIS_PATH, slug, locale, `${chapterId}.json`),
    "utf8",
  )
  return JSON.parse(raw)
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
      stdio: ["ignore", "pipe", "pipe"],
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

function stopServer(server: ReturnType<typeof spawn>) {
  if (!server.killed) {
    server.kill("SIGTERM")
  }
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

function getOutputPath(
  exegesisId: string,
  locale: string,
  chapterSlug: string,
  verseNumber: number,
) {
  return path.join(
    "build",
    "tafsir",
    exegesisId,
    locale,
    chapterSlug,
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

/**
 * Captures one fully-bootstrapped page per locale/exegesis combo. Its
 * dialog content (word list, translation, tafsir) is just a placeholder —
 * generatePage() overwrites it via cheerio for every actual verse — so the
 * shell only needs the outer app chrome plus one word span to clone from.
 */
async function captureShell(
  page: Page,
  { locale, exegesisId }: ExegesisEntry,
): Promise<Shell> {
  const route = getAppUrl(BASE_URL, locale, 1, 1, exegesisId)

  await page.goto(route, { waitUntil: "networkidle" })
  await page.reload({ waitUntil: "networkidle" })
  await waitForDialog(page)

  const html = enlargeExegesisShell(await page.content())
  const wordTemplate = extractWordTemplate(cheerio.load(html))

  return { html, wordTemplate }
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

/** Selectors of static-only elements: clicking any of them sends the visitor into the real app. */
const REDIRECT_TRIGGER_SELECTORS = [
  '[aria-label="overlay-blocker"]',
  ".exegesis-source-label",
  ".app-header",
  '[aria-label="verse-bookmarker-btn"]',
  '[aria-label="paper-dialog-drag-indicator"]',
]

/**
 * Static triggers (backdrop, header, bookmark, drag indicator, source label)
 * schedule a redirect to the real app for the verse currently on screen.
 * Prev/next links instead intercept the click, fetch the adjacent static
 * page and splice its dialog content in — a same-origin request identical to
 * what the plain `<a href>` would have navigated to — while independently
 * scheduling their own redirect for the verse being navigated to, without
 * waiting on that fetch. Elements outside the dialog (app header, overlay,
 * drag indicator) are wired once; anything inside it is re-wired after every
 * splice, since that region is replaced wholesale each time.
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
var redirectTimer=null;
var TRIGGER_SELECTORS=${JSON.stringify(REDIRECT_TRIGGER_SELECTORS)};

function realAppUrl(verse){
  var params=new URLSearchParams({tafsir:DATA.exegesisId,transliteration:"1",locale:DATA.locale});
  return DATA.siteUrl+"/#/e/"+DATA.chapterId+"/"+verse+"?"+params.toString();
}

function scheduleRedirect(verse){
  if(redirectTimer)clearTimeout(redirectTimer);
  redirectTimer=setTimeout(function(){window.location.href=realAppUrl(verse)},5000);
}

function wireStaticTriggers(root){
  TRIGGER_SELECTORS.forEach(function(sel){
    root.querySelectorAll(sel).forEach(function(el){
      el.addEventListener("click",function(){scheduleRedirect(DATA.verseNumber)});
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

      scheduleRedirect(targetVerse);

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
  {
    locale,
    chapterId,
    exegesisId,
    chapterSlug,
    chapterName,
    exegesisName,
    verseNumber,
    chapterLength,
  }: {
    locale: string
    chapterId: number
    exegesisId: string
    chapterSlug: string
    chapterName: string
    exegesisName: string
    verseNumber: number
    chapterLength: number
  },
) {
  const verseKey = `${chapterId}:${verseNumber}`
  const verseWords = words.filter((w) => w.id === verseKey)
  const translation = exegesisChapter.translations?.[String(verseNumber)]
  const exegesisText = exegesisChapter.exegesis?.[String(verseNumber)]

  const $ = cheerio.load(shell.html, { decodeEntities: false })

  /*
   * The captured page also renders the main (virtualized) verse list behind
   * the dialog, which has its own [data-word-index]/exegesis-* look-alikes.
   * Every lookup below must stay scoped to the dialog itself.
   */
  const dialogContent = $('[aria-label="paper-dialog-content"]')

  if (shell.wordTemplate && verseWords.length > 0) {
    const existingWords = dialogContent.find("[data-word-index]")

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
  }

  if (exegesisText) {
    dialogContent
      .find('.exegesis-body')
      .html(renderExegesisMarkdown(exegesisText))
  } else {
    dialogContent.find('.exegesis-body').remove()
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

  let html = $.html()

  html = patchTitle(
    html,
    `bil-Quran: ${chapterName}:${verseNumber} with Tafsir ${exegesisName}`,
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

  const outputPath = getOutputPath(exegesisId, locale, chapterSlug, verseNumber)

  await mkdir(path.dirname(outputPath), {
    recursive: true,
  })

  await writeFile(outputPath, productionHtml, "utf8")
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
          const shell = await captureShell(shellPage, entry)
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

          if (!transliteration) {
            console.warn(
              `Skipping chapter ${chapterId}: no transliteration for ${locale}`,
            )

            continue
          }

          const chapterSlug = slugify(transliteration)
          const progressKey = `${locale}:${exegesisId}`
          const exegesisName = await getExegesisName(exegesisId)
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

          for (
            let verseNumber = 1;
            verseNumber <= chapter.length;
            verseNumber++
          ) {
            await generatePage(shell, words, exegesisChapter, wbwTranslations, {
              locale,
              chapterId,
              exegesisId,
              chapterSlug,
              chapterName: transliteration,
              exegesisName,
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
    stopServer(server)
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

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
