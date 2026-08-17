import { createHash } from "crypto"
import { access, mkdir, readFile, writeFile } from "fs/promises"
import { join } from "path"

const SITE_URL = process.env.SITE_URL ?? "https://bil-quran.com"
const QURAN_PATH = join(process.cwd(), "public/quran")
const OUTPUT_DIR = "build/rss"

const EXEGESIS_WORKS = ["aliquli", "ibnkathir", "mirali"] as const
type ExegesisWork = (typeof EXEGESIS_WORKS)[number]

const EXEGESIS_WORK_NAMES: Record<ExegesisWork, string> = {
  aliquli: "Ali Quli Qara'i",
  ibnkathir: "Ibn Kathir",
  mirali: "Mir Ahmad Ali",
}

// Locales each exegesis work currently has content for.
const EXEGESIS_WORK_LOCALES: Record<ExegesisWork, readonly string[]> = {
  aliquli: ["en-US"],
  ibnkathir: ["en-US"],
  mirali: ["en-US"],
}

function exegesisPathFor(work: ExegesisWork): string {
  return join(QURAN_PATH, "exegesis", work)
}

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

interface ExegesisChapter {
  chapterId: number
  description: string
  footnotes: Record<string, Record<string, string>>
  translations: Record<string, string>
  /** Tafsir/commentary text, distinct from translation. Not every work has this. */
  exegesis?: Record<string, string>
}

async function loadExegesis(
  work: ExegesisWork,
  localeCode: string,
  chapterId: number,
): Promise<ExegesisChapter | null> {
  if (!EXEGESIS_WORK_LOCALES[work].includes(localeCode)) return null

  try {
    return await readJson<ExegesisChapter>(
      join(exegesisPathFor(work), localeCode, `${chapterId}.json`),
    )
  } catch {
    // no exegesis for this locale/chapter, fail quietly
    return null
  }
}

// Converts **bold**, _italic_, and the <{["F",n]}> / <{["Q","c:v"]}> markers into HTML.
function renderMarkers(
  text: string,
  opts: { verseFootnotes?: Record<string, string> } = {},
): string {
  let out = text
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/_(.+?)_/g, "<i>$1</i>")
    .replace(/\n/g, "<br/>")

  out = out.replace(
    /<\{\[\s*"([A-Z])"\s*,\s*(?:"([^"]+)"|(\d+))\s*\]\}>/g,
    (
      _match,
      tag: string,
      strArg: string | undefined,
      numArg: string | undefined,
    ) => {
      if (tag === "F" && numArg && opts.verseFootnotes) {
        return `<sup>[${numArg}]</sup>`
      }
      if (tag === "Q" && strArg) {
        return ` (Q ${strArg})`
      }
      return "" // unknown marker, drop it rather than leak raw syntax into RSS
    },
  )

  return out
}

function renderFootnotes(verseFootnotes?: Record<string, string>): string {
  if (!verseFootnotes) return ""
  const entries = Object.entries(verseFootnotes)
  if (!entries.length) return ""
  return `<ul>${entries
    .map(([n, note]) => `<li><sup>[${n}]</sup> ${renderMarkers(note)}</li>`)
    .join("")}</ul>`
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
    <description><![CDATA[${
      descriptions[opts.localeCode as LocaleCode]
    }]]></description>
    <language>${opts.localeCode}</language>
    <atom:link href="${SITE_URL}/rss/${
      opts.localeCode
    }.xml" rel="self" type="application/rss+xml"/>
    ${opts.items.join("\n")}
  </channel>
</rss>`
}

// Only en-US has exegesis content across all works right now; add id-ID
// back here once at least one work has id-ID chapter files.
const Locales = ["en-US"] as const
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
      "bil-Quran: Word-by-Word Quran",
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

      // Tafsir items, one set per exegesis work -> e/{chapter}/{verse}
      for (const work of EXEGESIS_WORKS) {
        const exegesis = await loadExegesis(work, localeCode, chapterId)
        if (!exegesis) continue

        const authorName = EXEGESIS_WORK_NAMES[work]

        // chapter-level tafsir overview -> e/{chapter}/0
        addItem(
          `${chapterId}. ${chapterArabic} (${chapterName})`,
          `${SITE_URL}/#/e/${chapterId}/0?tafsir=${work}&transliteration=1&locale=${localeCode}`,
          [
            `<b>Tafsir ${authorName}</b>`,
            `<p>${renderMarkers(exegesis.description)}</p>`,
          ].join("\n\n"),
        )

        // per-verse tafsir -> e/{chapter}/{verse}
        for (const [verseNumberString, translationText] of Object.entries(
          exegesis.translations,
        )) {
          const verseNumber = Number(verseNumberString)
          const verseFootnotes = exegesis.footnotes[verseNumberString]
          const v = verses.get(`${chapterId}:${verseNumber}`)
          const exegesisText = exegesis.exegesis?.[verseNumberString]

          addItem(
            `${chapterName}:${verseNumber}`,
            `${SITE_URL}/#/e/${chapterId}/${verseNumber}?tafsir=${work}&transliteration=1&locale=${localeCode}`,
            [
              `<b>Tafsir ${authorName}</b>`,
              `<b>${chapterName}:${verseNumber}</b>`,
              v ? `${v.arabic}<br/><i>${v.transliteration}</i>` : "",
              renderMarkers(translationText, { verseFootnotes }),
              exegesisText
                ? renderMarkers(exegesisText, { verseFootnotes })
                : "",
              verseFootnotes ? renderFootnotes(verseFootnotes) : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
          )
        }
      }
    }

    await writeFile(outputPath, buildFeed({ localeCode, items }), "utf8")
    console.log(`✅ Generated ${outputPath}`)
  }
}

const descriptions: Record<LocaleCode, string> = {
  "en-US":
    "A Qur'an app with interlinear word-by-word and verse-by-verse translations, helping readers understand the meaning of the Qur'an beyond recitation alone.",
}

generateRSS().catch((err) => {
  console.error(err)
  process.exit(1)
})
