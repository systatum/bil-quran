import * as cheerio from "cheerio"
import { createHash } from "crypto"
import { access, mkdir, readdir, readFile, writeFile } from "fs/promises"
import path from "path"

const SITE_URL = process.env.SITE_URL ?? "https://bil-quran.com"
const BUILD_TAFSIR_DIR = path.join(process.cwd(), "build/tafsir")
const OUTPUT_DIR = "build/rss"
const MAX_DESCRIPTION_WORDS = 140

function md5(input: string): string {
  return createHash("md5").update(input, "utf8").digest("hex")
}

function escapeXml(input = ""): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

interface ExistingItem {
  pubDate: Date
  digest: string
}

/** Recursively finds every generated verse page under build/tafsir. */
async function findTafsirFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
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

function extractTitle(html: string): string {
  const match = html.match(/<title>([^<]*)<\/title>/)
  if (!match) return ""

  return match[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

/** Plain-text translation + exegesis body, capped to MAX_DESCRIPTION_WORDS. */
function extractDescription($: ReturnType<typeof cheerio.load>): string {
  const dialogContent = $('[aria-label="paper-dialog-content"]')
  const text = dialogContent
    .find(".exegesis-translation, .exegesis-body")
    .map((_, el) => $(el).text())
    .get()
    .join(" ")

  const words = text.trim().split(/\s+/).filter(Boolean)
  const truncated = words.length > MAX_DESCRIPTION_WORDS

  return words.slice(0, MAX_DESCRIPTION_WORDS).join(" ") + (truncated ? "…" : "")
}

async function loadExistingFeed(
  outputPath: string,
): Promise<Map<string, ExistingItem>> {
  const existing = new Map<string, ExistingItem>()
  try {
    await access(outputPath)
  } catch {
    return existing
  }

  const xml = await readFile(outputPath, "utf8")
  const itemPattern = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null

  while ((match = itemPattern.exec(xml)) !== null) {
    const block = match[1]
    const linkMatch = block.match(/<link>(.*?)<\/link>/)
    const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/)
    const digestMatch = block.match(
      /<bil-quran:item-digest>(.*?)<\/bil-quran:item-digest>/,
    )
    if (!linkMatch) continue

    existing.set(linkMatch[1].trim(), {
      pubDate: pubDateMatch ? new Date(pubDateMatch[1].trim()) : new Date(0),
      digest: digestMatch ? digestMatch[1].trim() : "",
    })
  }

  return existing
}

function buildItem(opts: {
  title: string
  url: string
  description: string
  pubDate: Date
  digest: string
}): string {
  return `
    <item>
      <title><![CDATA[${opts.title}]]></title>
      <link>${escapeXml(opts.url)}</link>
      <guid isPermaLink="true">${escapeXml(opts.url)}</guid>
      <description><![CDATA[${opts.description}]]></description>
      <pubDate>${opts.pubDate.toUTCString()}</pubDate>
      <bil-quran:item-digest>${opts.digest}</bil-quran:item-digest>
    </item>`
}

function buildFeed(opts: { localeCode: string; items: string[] }): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:bil-quran="https://bil-quran.com/rss/extensions">
  <channel>
    <title><![CDATA[Bil-Quran: Word-by-Word Qur'an]]></title>
    <link>${SITE_URL}</link>
    <description><![CDATA[${
      descriptions[opts.localeCode] ?? descriptions["en-US"]
    }]]></description>
    <language>${opts.localeCode}</language>
    <atom:link href="${SITE_URL}/rss/${
      opts.localeCode
    }.xml" rel="self" type="application/rss+xml"/>
    ${opts.items.join("\n")}
  </channel>
</rss>`
}

const descriptions: Record<string, string> = {
  "en-US":
    "A Qur'an app with interlinear word-by-word and verse-by-verse translations, helping readers understand the meaning of the Qur'an beyond recitation alone.",
}

async function generateRSS() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const files = await findTafsirFiles(BUILD_TAFSIR_DIR)
  console.log(`Found ${files.length} generated tafsir page(s).`)

  const itemsByLocale = new Map<string, string[]>()
  const existingByLocale = new Map<string, Map<string, ExistingItem>>()
  let newCount = 0
  let updatedCount = 0

  for (const file of files) {
    const relPath = path.relative(BUILD_TAFSIR_DIR, file).split(path.sep)
    const locale = relPath[1]
    const url = `${SITE_URL}/tafsir/${relPath.join("/")}`

    if (!existingByLocale.has(locale)) {
      existingByLocale.set(
        locale,
        await loadExistingFeed(path.join(OUTPUT_DIR, `${locale}.xml`)),
      )
    }

    const html = await readFile(file, "utf8")
    const $ = cheerio.load(html)

    const title = extractTitle(html)
    const description = extractDescription($)
    const digest = md5(description)

    const existing = existingByLocale.get(locale)!.get(url)
    let pubDate: Date

    if (!existing) {
      pubDate = new Date()
      newCount++
    } else if (existing.digest !== digest) {
      pubDate = new Date()
      updatedCount++
    } else {
      pubDate = existing.pubDate
    }

    if (!itemsByLocale.has(locale)) itemsByLocale.set(locale, [])
    itemsByLocale
      .get(locale)!
      .push(buildItem({ title, url, description, pubDate, digest }))
  }

  for (const [locale, items] of itemsByLocale) {
    const homepageItem = buildItem({
      title: "bil-Quran: Word-by-Word Quran",
      url: `${SITE_URL}/?locale=${locale}`,
      description: descriptions[locale] ?? descriptions["en-US"],
      pubDate: new Date(),
      digest: md5(descriptions[locale] ?? descriptions["en-US"]),
    })

    const outputPath = path.join(OUTPUT_DIR, `${locale}.xml`)
    await writeFile(
      outputPath,
      buildFeed({ localeCode: locale, items: [homepageItem, ...items] }),
      "utf8",
    )
    console.log(`✅ Generated ${outputPath}`)
  }

  console.log(`New: ${newCount}`)
  console.log(`Updated: ${updatedCount}`)
}

generateRSS().catch((err) => {
  console.error(err)
  process.exit(1)
})
