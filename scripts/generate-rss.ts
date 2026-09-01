import * as cheerio from "cheerio"
import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import path from "path"

const SITE_URL = process.env.SITE_URL ?? "https://bil-quran.com"
const BUILD_TAFSIR_DIR = path.join(process.cwd(), "build/tafsir")
const OUTPUT_DIR = "build/rss"
const MAX_DESCRIPTION_WORDS = 140

function escapeXml(input = ""): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

interface TafsirFile {
  path: string
  exegesisId: string
  locale: string
  chapterSlug: string
  verseNumber: number
}

/** Recursively finds every generated verse page under build/tafsir, alphabetically at each level. */
async function findTafsirFiles(dir: string): Promise<string[]> {
  const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  const files: string[] = []

  for (const entry of entries) {
    const full = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await findTafsirFiles(full)))
    } else if (entry.name.endsWith(".html")) {
      files.push(full)
    }
  }

  return files
}

function parseTafsirFile(file: string): TafsirFile {
  const [exegesisId, locale, chapterSlug, verseFile] = path
    .relative(BUILD_TAFSIR_DIR, file)
    .split(path.sep)

  return {
    path: file,
    exegesisId,
    locale,
    chapterSlug,
    verseNumber: Number(verseFile.replace(/\.html$/, "")),
  }
}

function extractTitle(html: string): string {
  const match = html.match(/<title>([^<]*)<\/title>/)
  if (!match) return ""

  return match[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

/**
 * Block-level tags marked's renderer can emit (see renderExegesisMarkdown /
 * parseInlineMarkers's RT blockquote). cheerio's .text() concatenates every
 * descendant text node with no separator at all — same as the DOM's own
 * textContent — so flattening e.g. "<p>criterion</p><p>which is</p>" gives
 * "criterionwhich is" with the paragraph break silently dropped.
 */
const BLOCK_TAGS = new Set([
  "p",
  "div",
  "blockquote",
  "li",
  "hr",
  "tr",
  "ul",
  "ol",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
])

/** Like cheerio's .text(), but inserts a break at block-tag/<br> boundaries so sibling blocks don't run together. */
function blockAwareText($: ReturnType<typeof cheerio.load>, node: any): string {
  if (node.type === "text") return node.data ?? ""
  if (node.type !== "tag" && node.type !== "script" && node.type !== "style") {
    return ""
  }

  if (node.name === "br") return "\n"

  const inner = (node.children ?? [])
    .map((child: any) => blockAwareText($, child))
    .join("")

  return BLOCK_TAGS.has(node.name) ? `${inner}\n\n` : inner
}

function extractBlockText(
  $: ReturnType<typeof cheerio.load>,
  selection: ReturnType<ReturnType<typeof cheerio.load>>,
): string {
  return selection
    .toArray()
    .map((el) => blockAwareText($, el))
    .join("\n\n")
}

/** Full Arabic verse text, then transliteration, then translation/exegesis, capped to MAX_DESCRIPTION_WORDS. */
function extractDescription($: ReturnType<typeof cheerio.load>): string {
  const dialogContent = $('[aria-label="paper-dialog-content"]')

  const arabic = dialogContent
    .find("[data-word-index] .arabic-lex")
    .map((_, el) => $(el).text())
    .get()
    .join(" ")

  const transliteration = dialogContent
    .find('[data-word-index] [data-testid="word-transliteration"]')
    .map((_, el) => $(el).text())
    .get()
    .join(" ")

  const tafsir = extractBlockText(
    $,
    dialogContent.find(".exegesis-translation, .exegesis-body"),
  )

  const text = [arabic, transliteration, tafsir].filter(Boolean).join(" ")

  const words = text.trim().split(/\s+/).filter(Boolean)
  const truncated = words.length > MAX_DESCRIPTION_WORDS

  return (
    words.slice(0, MAX_DESCRIPTION_WORDS).join(" ") + (truncated ? "…" : "")
  )
}

function buildItem(opts: {
  title: string
  url: string
  description: string
}): string {
  return `<item><title><![CDATA[${opts.title}]]></title><link>${escapeXml(opts.url)}</link><description><![CDATA[${opts.description}]]></description></item>`
}

function buildFeed(opts: { localeCode: string; items: string[] }): string {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title><![CDATA[Bil-Quran: Word-by-Word Qur'an]]></title><link>${SITE_URL}</link><description><![CDATA[${
    descriptions[opts.localeCode] ?? descriptions["en-US"]
  }]]></description><language>${opts.localeCode}</language><atom:link href="${SITE_URL}/rss/${opts.localeCode}.xml" rel="self" type="application/rss+xml"/>${opts.items.join("")}</channel></rss>`
}

const descriptions: Record<string, string> = {
  "en-US":
    "A Qur'an app with interlinear word-by-word and verse-by-verse translations, helping readers understand the meaning of the Qur'an beyond recitation alone.",
}

interface FeedItem {
  chapterSlug: string
  verseNumber: number
  exegesisId: string
  xml: string
}

async function generateRSS() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const files = await findTafsirFiles(BUILD_TAFSIR_DIR)
  console.log(`Found ${files.length} generated tafsir page(s).`)

  const itemsByLocale = new Map<string, FeedItem[]>()

  for (const file of files) {
    const { exegesisId, locale, chapterSlug, verseNumber } =
      parseTafsirFile(file)
    const url = `${SITE_URL}/tafsir/${path
      .relative(BUILD_TAFSIR_DIR, file)
      .split(path.sep)
      .join("/")}`

    const html = await readFile(file, "utf8")
    const $ = cheerio.load(html)

    const title = extractTitle(html)
    const description = extractDescription($)

    if (!itemsByLocale.has(locale)) itemsByLocale.set(locale, [])
    itemsByLocale.get(locale)!.push({
      chapterSlug,
      verseNumber,
      exegesisId,
      xml: buildItem({ title, url, description }),
    })
  }

  for (const [locale, items] of itemsByLocale) {
    items.sort(
      (a, b) =>
        a.chapterSlug.localeCompare(b.chapterSlug) ||
        a.verseNumber - b.verseNumber ||
        a.exegesisId.localeCompare(b.exegesisId),
    )

    const homepageItem = buildItem({
      title: "bil-Quran: Word-by-Word Quran",
      url: `${SITE_URL}/?locale=${locale}`,
      description: descriptions[locale] ?? descriptions["en-US"],
    })

    const outputPath = path.join(OUTPUT_DIR, `${locale}.xml`)
    await writeFile(
      outputPath,
      buildFeed({
        localeCode: locale,
        items: [homepageItem, ...items.map((item) => item.xml)],
      }),
      "utf8",
    )
    console.log(`✅ Generated ${outputPath}`)
  }
}

generateRSS().catch((err) => {
  console.error(err)
  process.exit(1)
})
