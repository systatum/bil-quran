import RSS from "rss"
import { mkdir, writeFile, readFile } from "fs/promises"
import { join } from "path"

const SITE_URL = process.env.SITE_URL ?? "https://bil-quran.com"
const QURAN_PATH = join(process.cwd(), "public/quran")

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8")
  return JSON.parse(raw) as T
}

interface ChapterMeta {
  length: number
  meanings: Record<string, string | null>
  namings: Record<string, string | null>
  transliterations: Record<string, string | null>
}

interface Word {
  id: string // "1:1"
  word: string // arabic word
  trans: string
  root: string
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
    const verseId = w.id // "1:1"
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

const Locales = ["en-US", "id-ID"] as const

async function generateRSS() {
  await mkdir("public/rss", { recursive: true })

  const chaptersMetadata = await readJson<Record<string, ChapterMeta>>(
    join(QURAN_PATH, "chapters.json"),
  )

  for (const localeCode of Locales) {
    const translations = await readJson<Record<string, string>>(
      join(QURAN_PATH, `wbw_translations/${localeCode}.json`),
    )

    const feed = new RSS({
      title: "Bil-Quran: Word-by-Word Qur'an",
      description: "Quran chapters and verses",
      feed_url: `${SITE_URL}/rss/${localeCode}.xml`,
      site_url: SITE_URL,
      language: localeCode,
    })

    feed.item({
      title: "Bil-Quran: Word-by-Word Qur'an",
      url: `${SITE_URL}/?locale=${localeCode}`,
      description: descriptions?.[localeCode],
      date: new Date(),
    })

    for (const [chapterIdString, chapter] of Object.entries(chaptersMetadata)) {
      const chapterId = Number(chapterIdString)
      const chapterName =
        chapter.transliterations[localeCode] ??
        chapter.transliterations["en-US"] ??
        ""
      const chapterMeaning = chapter.meanings[localeCode] ?? ""
      const chapterArabic = chapter.namings[localeCode] ?? ""

      const words = await readJson<Word[]>(
        join(QURAN_PATH, "verses/imlaei", `${chapterId}.json`),
      )

      const verses = groupVerses(words, translations)
      const verseEntries = [...verses.entries()] // ["1:1", {...}]

      // Per-chapter item
      const firstThree = verseEntries.slice(0, 3)
      feed.item({
        title: `${chapterId}. ${chapterArabic} (${chapterName})`,
        url: `${SITE_URL}/#/c/${chapterId}/1?locale=${localeCode}`,
        description: firstThree
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
        date: new Date(),
      })

      // Per-verse items
      for (const [verseId, v] of verseEntries) {
        const verseNumber = Number(verseId.split(":")[1])
        feed.item({
          title: `${chapterName}:${verseNumber}`,
          url: `${SITE_URL}/#/v/${chapterId}/${verseNumber}?locale=${localeCode}`,
          description:
            `${chapterName}:${verseNumber} - ${v.arabic}\n\n${v.transliteration}\n\n${v.translation}`.trim(),
          date: new Date(),
        })
      }
    }

    await writeFile(
      `public/rss/${localeCode}.xml`,
      feed.xml({ indent: true }),
      "utf8",
    )

    console.log(`Generated public/rss/${localeCode}.xml`)
  }
}

const descriptions: Record<(typeof Locales)[number], string> = {
  "en-US":
    "A Qur'an app with interlinear word-by-word and verse-by-verse translations, helping readers understand the meaning of the Qur'an beyond recitation alone.",

  "id-ID":
    "Aplikasi Al-Qur'an dengan terjemahan interlinear kata per kata dan ayat per ayat yang membantu pembaca memahami makna Al-Qur'an, bukan hanya membacanya.",
}

generateRSS().catch((err) => {
  console.error(err)
  process.exit(1)
})
