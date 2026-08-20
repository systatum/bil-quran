import * as cheerio from "cheerio"
import { spawn } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { chromium, type Page } from "playwright"

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
    .replace(/[\u0300-\u036f]/g, "")
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
 * Discover exegesis IDs from:
 *
 *   public/quran/exegesis/
 *
 * Expected structure:
 *
 *   public/quran/exegesis/
 *   ├── en-US/
 *   │   ├── ibn-kathir/
 *   │   └── ...
 *   ├── id-ID/
 *   │   └── ...
 *   └── ...
 *
 * The directory name immediately below the locale directory is
 * used as the exegesis ID.
 */
async function loadExegeses() {
  const locales = await readDirectoryNames(EXEGESIS_PATH)

  const result: Array<{
    locale: string
    exegesisId: string
  }> = []

  for (const locale of locales) {
    const localePath = path.join(EXEGESIS_PATH, locale)

    const exegeses = await readDirectoryNames(localePath)

    for (const exegesisId of exegeses) {
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
    promise = readFile(path.join(EXEGESIS_PATH, slug, "about.json"), "utf8").then(
      (raw) => (JSON.parse(raw) as { name: string }).name,
    )
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

  // server.stdout.on("data", (data) => {
  //   process.stdout.write(`[server] ${data}`)
  // })

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

  return (
    `${BASE_URL}/#/e/` + `${chapterId}/${verseNumber}` + `?${params.toString()}`
  )
}

function getOutputPath(
  locale: string,
  exegesisId: string,
  chapterSlug: string,
  verseNumber: number,
) {
  return path.join(
    "build",
    "tafsir",
    locale,
    exegesisId,
    chapterSlug,
    `${verseNumber}.html`,
  )
}

async function waitForTafsir(page: Page) {
  await page.waitForFunction(() => {
    const root = document.querySelector("#root")

    if (!root) {
      return false
    }

    const text = root.textContent?.trim() ?? ""

    return text.length > 100
  })
}

async function generatePage(
  page: Page,
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
  const route = getAppUrl(locale, chapterId, verseNumber, exegesisId)

  await page.goto(route, {
    waitUntil: "networkidle",
  })

  /*
   * The app is a SPA. Navigating between #/e/... routes can reuse
   * the existing DOM. Reload so every generated page starts from
   * the original React-rendered buttons.
   */
  await page.reload({
    waitUntil: "networkidle",
  })

  await waitForTafsir(page)

  let html = await page.content()
  html = enlargeExegesisShell(html)
  html = patchTitle(
    html,
    `bil-Quran: ${chapterName}:${verseNumber} with Tafsir ${exegesisName}`,
  )

  if (verseNumber > 1) {
    const result = replaceButtonWithLink(
      html,
      '[data-testid="prev-verse-btn"]',
      `/tafsir/${locale}/${exegesisId}/${chapterSlug}/${verseNumber - 1}.html`,
    )

    if (result.replaced) {
      html = result.html
    }
  }

  if (verseNumber < chapterLength) {
    const result = replaceButtonWithLink(
      html,
      '[data-testid="next-verse-btn"]',
      `/tafsir/${locale}/${exegesisId}/${chapterSlug}/${verseNumber + 1}.html`,
    )

    if (result.replaced) {
      html = result.html
    }
  }

  const productionHtml = html
    .replaceAll(BASE_URL, PRODUCTION_URL)
    .replaceAll(`http://localhost:${PORT}`, PRODUCTION_URL)

  const outputPath = getOutputPath(locale, exegesisId, chapterSlug, verseNumber)

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

  /*
   * Start the production build server.
   */
  console.log("Starting production build server...")

  const server = startServer()

  try {
    await waitForServer(BASE_URL)

    console.log(`Server ready: ${BASE_URL}`)

    const browser = await chromium.launch()

    try {
      const workerCount = Math.min(MAX_WORKERS, chapterEntries.length)

      /*
       * Progress is tracked independently for every
       * locale/exegesis combination.
       */
      const progress = new Map<string, number>()

      for (const { locale, exegesisId } of exegeses) {
        progress.set(`${locale}:${exegesisId}`, 0)
      }

      /*
       * Shared chapter queue.
       */
      let nextChapterIndex = 0

      async function worker(workerId: number) {
        const page = await browser.newPage()

        try {
          while (true) {
            /*
             * Claim the next chapter.
             */
            const index = nextChapterIndex++

            if (index >= chapterEntries.length) {
              return
            }

            const [chapterIdString, chapter] = chapterEntries[index]
            const chapterId = Number(chapterIdString)

            /*
             * Every locale/exegesis combination is generated.
             */
            for (const { locale, exegesisId } of exegeses) {
              const seoLocale = locale.split("-")[0]

              const transliteration =
                chapter.transliterations[locale] ??
                chapter.transliterations["en-US"]

              if (!transliteration) {
                console.warn(
                  `Skipping chapter ${chapterId}: ` +
                    `no transliteration for ${locale}`,
                )

                continue
              }

              const chapterSlug = slugify(transliteration)
              const progressKey = `${locale}:${exegesisId}`
              const exegesisName = await getExegesisName(locale)

              for (
                let verseNumber = 1;
                verseNumber <= chapter.length;
                verseNumber++
              ) {
                await generatePage(page, {
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
        } finally {
          await page.close()
        }
      }

      await Promise.all(
        Array.from({ length: workerCount }, (_, index) => worker(index + 1)),
      )
    } finally {
      await browser.close()
    }
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
