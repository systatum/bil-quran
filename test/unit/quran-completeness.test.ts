/**
 * @jest-environment node
 *
 * Data integrity: every Arabic word in every verse of every chapter must have
 * a corresponding entry in each word-by-word translation file.
 *
 * Translation keys are structured as "chapter:verse:wordIndex" (1-based).
 * Verse files list words sequentially — the word index is derived by counting
 * resets within each verse id.
 */
import * as fs from "fs"
import * as path from "path"

const QURAN_DIR = path.resolve(__dirname, "../../public/quran")
const TRANSLATION_LOCALES = ["en-US", "id-ID"] as const

interface VerseWord {
  id: string // "chapter:verse"
  word: string
  trans: string
  root: string
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"))
}

const chapterIds = Object.keys(
  readJson<Record<string, unknown>>(path.join(QURAN_DIR, "chapters.json")),
)

describe("Quran word-by-word translation completeness", () => {
  for (const locale of TRANSLATION_LOCALES) {
    test(`every word has a ${locale} translation`, () => {
      const translations = readJson<Record<string, string>>(
        path.join(QURAN_DIR, `wbw_translations/${locale}.json`),
      )

      const missing: string[] = []

      for (const chapterId of chapterIds) {
        const words = readJson<VerseWord[]>(
          path.join(QURAN_DIR, `verses/imlaei/${chapterId}.json`),
        )

        let currentVerseId = ""
        let wordIndex = 0

        for (const word of words) {
          if (word.id !== currentVerseId) {
            currentVerseId = word.id
            wordIndex = 0
          }
          wordIndex++

          const key = `${word.id}:${wordIndex}`
          if (!(key in translations)) {
            missing.push(key)
          }
        }
      }

      expect(missing).toEqual([])
    })
  }
})
