import * as cheerio from "cheerio"
import { spawn } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { chromium, type Page } from "playwright"

const PORT = 4173
const BASE_URL = `http://127.0.0.1:${PORT}`
const PRODUCTION_URL = "https://bil-quran.com"

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

  server.stdout.on("data", (data) => {
    process.stdout.write(`[server] ${data}`)
  })

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
    verseNumber,
    chapterLength,
  }: {
    locale: string
    chapterId: number
    exegesisId: string
    chapterSlug: string
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

  const html = await page.content()

  let transformedHtml = html

  if (verseNumber > 1) {
    const result = replaceButtonWithLink(
      transformedHtml,
      '[data-testid="prev-verse-btn"]',
      `/tafsir/${locale}/${exegesisId}/${chapterSlug}/${verseNumber - 1}.html`,
    )

    if (result.replaced) {
      transformedHtml = result.html
    }
  }

  if (verseNumber < chapterLength) {
    const result = replaceButtonWithLink(
      transformedHtml,
      '[data-testid="next-verse-btn"]',
      `/tafsir/${locale}/${exegesisId}/${chapterSlug}/${verseNumber + 1}.html`,
    )

    if (result.replaced) {
      transformedHtml = result.html
    }
  }

  const productionHtml = transformedHtml
    .replaceAll(BASE_URL, PRODUCTION_URL)
    .replaceAll(`http://localhost:${PORT}`, PRODUCTION_URL)

  const outputPath = getOutputPath(locale, exegesisId, chapterSlug, verseNumber)

  await mkdir(path.dirname(outputPath), {
    recursive: true,
  })

  await writeFile(outputPath, productionHtml, "utf8")

  process.stdout.write(`\r${chapterSlug} ${verseNumber}/${chapterLength}`)
}

async function main() {
  const chapters = await loadChapters()
  const exegeses = await loadExegeses()

  console.log(`Found ${Object.keys(chapters).length} chapters.`)

  console.log(`Found ${exegeses.length} locale/exegesis combinations.`)

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
      const page = await browser.newPage()

      /*
       * Every locale/exegesis combination is generated.
       *
       * Example:
       *
       *   en-US / ibn-kathir
       *
       * becomes:
       *
       *   /tafsir/en/ibn-kathir/...
       */
      for (const { locale, exegesisId } of exegeses) {
        /*
         * Only generate SEO pages for locales we want exposed
         * in the public URL.
         *
         * en-US -> en
         * id-ID -> id
         * ar-IQ -> ar
         */
        const seoLocale = locale.split("-")[0]

        for (const [chapterIdString, chapter] of Object.entries(chapters)) {
          const chapterId = Number(chapterIdString)

          /*
           * Prefer transliteration for the locale used by the
           * application.
           *
           * For example:
           *
           *   en-US -> Al-Faatiha -> al-faatiha
           */
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
              verseNumber,
              chapterLength: chapter.length,
            })
          }
        }
      }
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

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
