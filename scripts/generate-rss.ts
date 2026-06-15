import { mkdir, writeFile, readFile, access } from "fs/promises"
import { join } from "path"
import { createHash } from "crypto"

const SITE_URL = process.env.SITE_URL ?? "https://bil-quran.com"
const QURAN_PATH = join(process.cwd(), "public/quran")
const OUTPUT_DIR = "public/rss"

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8")
  return JSON.parse(raw) as T
}

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

interface ChapterMeta {
  length: number
  meanings: Record<string, string | null>
  namings: Record<string, string | null>
  transliterations: Record<string, string | null>
}

interface Word {
  id: string
  word: string
  trans: string
  root: string
}

interface ExistingItem {
  pubDate: Date
  digest: string
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

function groupVerses(
  words: Word[],
  translations: Record<string, string>,
): Map<
  string,
  {
    arabic: string
    transliteration: string
    translation: string
  }
> {
  const verses = new Map<
    string,
    {
      arabic: string
      transliteration: string
      translation: string
      wordIndex: number
    }
  >()

  for (const w of words) {
    const verseId = w.id
    if (!verses.has(verseId)) {
      verses.set(verseId, {
        arabic: "",
        transliteration: "",
        translation: "",
        wordIndex: 1,
      })
    }
    const v = verses.get(verseId)!
    const [chapter, verse] = verseId.split(":")
    const translationKey = `${chapter}:${verse}:${v.wordIndex}`
    v.arabic += (v.arabic ? " " : "") + w.word
    v.transliteration += (v.transliteration ? " " : "") + w.trans
    v.translation +=
      (v.translation ? " " : "") + (translations[translationKey] ?? "")
    v.wordIndex++
  }

  return verses
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
    <description><![CDATA[${descriptions[opts.localeCode as LocaleCode]}]]></description>
    <language>${opts.localeCode}</language>
    <atom:link href="${SITE_URL}/rss/${opts.localeCode}.xml" rel="self" type="application/rss+xml"/>
    ${opts.items.join("\n")}
  </channel>
</rss>`
}

const Locales = ["en-US", "id-ID"] as const
type LocaleCode = (typeof Locales)[number]

async function generateRSS() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const chaptersMetadata = await readJson<Record<string, ChapterMeta>>(
    join(QURAN_PATH, "chapters.json"),
  )

  for (const localeCode of Locales) {
    const outputPath = join(OUTPUT_DIR, `${localeCode}.xml`)
    const existingItems = await loadExistingFeed(outputPath)

    const translations = await readJson<Record<string, string>>(
      join(QURAN_PATH, `wbw_translations/${localeCode}.json`),
    )

    const items: string[] = []

    const addItem = (title: string, url: string, description: string) => {
      const digest = md5(description)
      const existing = existingItems.get(url)
      let pubDate: Date

      if (!existing) {
        pubDate = new Date()
        console.log(`🆕 New: ${url}`)
      } else if (existing.digest !== digest) {
        pubDate = new Date()
        console.log(`✏️  Updated: ${url}`)
      } else {
        pubDate = existing.pubDate
      }

      items.push(buildItem({ title, url, description, pubDate, digest }))
    }
    // Homepage
    addItem(
      "Bil-Quran: Word-by-Word Qur'an",
      `${SITE_URL}/?locale=${localeCode}`,
      descriptions[localeCode],
    )

    for (const [chapterIdString, chapter] of Object.entries(chaptersMetadata)) {
      const chapterId = Number(chapterIdString)
      const chapterName =
        chapter.transliterations[localeCode] ??
        chapter.transliterations["en-US"] ??
        ""
      const chapterArabic = chapter.namings[localeCode] ?? ""

      const words = await readJson<Word[]>(
        join(QURAN_PATH, "verses/imlaei", `${chapterId}.json`),
      )

      const verses = groupVerses(words, translations)
      const verseEntries = Array.from(verses.entries())

      // Per-chapter item
      addItem(
        `${chapterId}. ${chapterArabic} (${chapterName})`,
        `${SITE_URL}/#/c/${chapterId}/1?locale=${localeCode}`,
        verseEntries
          .slice(0, 3)
          .map(
            ([verseId, v]) => `
<p>
  <b>${verseId}</b><br/>
  ${v.arabic}<br/>
  <i>${v.transliteration}</i><br/>
  ${v.translation}
</p>`,
          )
          .join("\n"),
      )

      // Per-verse items
      for (const [verseId, v] of verseEntries) {
        const verseNumber = Number(verseId.split(":")[1])
        addItem(
          `${chapterName}:${verseNumber}`,
          `${SITE_URL}/#/v/${chapterId}/${verseNumber}?locale=${localeCode}`,
          `${chapterName}:${verseNumber} - ${v.arabic}\n\n${v.transliteration}\n\n${v.translation}`.trim(),
        )
      }
    }

    await writeFile(outputPath, buildFeed({ localeCode, items }), "utf8")
    console.log(`✅ Generated ${outputPath}`)
  }
}

const descriptions: Record<LocaleCode, string> = {
  "en-US":
    "A Qur'an app with interlinear word-by-word and verse-by-verse translations, helping readers understand the meaning of the Qur'an beyond recitation alone.",

  "id-ID":
    "Aplikasi Al-Qur'an dengan terjemahan interlinear kata per kata dan ayat per ayat yang membantu pembaca memahami makna Al-Qur'an, bukan hanya membacanya.",
}

generateRSS().catch((err) => {
  console.error(err)
  process.exit(1)
})
