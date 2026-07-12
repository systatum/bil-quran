import { ChapterRecord } from "@constants/records/ChapterRecord"
import { Rendering } from "@constants/records/RenderingRecord"
import { DEFAULT_LOCALE, Locale } from "@constants/settings"
import fs from "fs"
import path from "path"
import chaptersData from "../../../public/quran/chapters.json"
import englishLocaleData from "../../../src/i18n/locales/en-US.json"

export const CHAPTERS = chaptersData as Record<
  string,
  Omit<ChapterRecord, "id">
>

export const ENGLISH_LOCALE_NAMES: Record<Locale, string> =
  englishLocaleData.locale

/** Build a verseId → ordered arabic tokens map from the per-chapter. */
export function loadQuranWords(rendering: Rendering): Record<string, string[]> {
  const dir = path.join(__dirname, "../../../public/quran/verses/", rendering)
  const map: Record<string, string[]> = {}
  for (let chapter = 1; chapter <= 114; chapter++) {
    const entries = JSON.parse(
      fs.readFileSync(path.join(dir, `${chapter}.json`), "utf-8"),
    ) as Array<{ id: string; word: string }>
    for (const { id, word } of entries) {
      if (!map[id]) map[id] = []
      map[id].push(word)
    }
  }
  return map
}

export function getTransliteration(chapterId: string, locale: Locale): string {
  const ch = CHAPTERS[chapterId]
  return (ch.transliterations[locale] ?? ch.transliterations[DEFAULT_LOCALE])!
}

export function getMeaning(chapterId: string, locale: Locale): string {
  const ch = CHAPTERS[chapterId]
  return (ch.meanings[locale] ?? ch.meanings[DEFAULT_LOCALE])!
}

export function getArabicName(chapterId: string, locale: Locale): string {
  const ch = CHAPTERS[chapterId]
  return (ch.namings[locale] ?? ch.namings[DEFAULT_LOCALE])!
}
