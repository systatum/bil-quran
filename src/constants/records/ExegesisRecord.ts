import { Locale } from "@constants/settings"
import { ThoughtSchool } from "@constants/ThoughtSchool"

export interface ExegesisAuthor {
  name: string
  bio: Partial<Record<Locale, string>>
}

export interface ExegesisRecord {
  id: string
  thoughtSchool: ThoughtSchool
  /** Where this exegesis/translation work was sourced from */
  source: string
  /** The name of the tafsir work in the original language */
  oriName: string
  locNames: Partial<Record<Locale, string>>
  description: Partial<Record<Locale, string>>
  authors: ExegesisAuthor[]
  /** Chapter IDs whose verse content has been fully fetched and stored locally */
  downloadedChapters: number[]
}

export interface ExegesisContentRecord {
  exegesisId: string
  chapterId: number
  verseNumber: number
  translation: string
  /** Tafsir/commentary text, distinct from translation (not all sources have this) */
  exegesis: string | null
  /** Footnote index → footnote text for this verse */
  footnotes: Record<string, string>
}

/** Shape of the about.json file sitting in each exegesis directory */
export interface ExegesisMetadata {
  name: string
  /** Raw thought-school name (ie "shia-jafari") */
  thought: string
  /** Keyed by author display name */
  authors: Record<string, { bio: Partial<Record<Locale, string>> }>
  locNames: Partial<Record<Locale, string>>
  about: Partial<
    Record<
      Locale,
      {
        shortDesc: string
        detailDesc: string[]
      }
    >
  >
  source: string
}

/** Shape of a per-chapter exegesis JSON file (e.g. en-US/1.json) */
export interface ExegesisChapterAsset {
  chapterId: number
  description: string
  /** verse number (string key) → footnote index (string key) → footnote text */
  footnotes: Record<string, Record<string, string>>
  /** verse number (string key) → translation text (may contain inline footnote markers) */
  translations: Record<string, string>
  /**
   * verse number (string key) → tafsir/commentary text (may contain inline
   * footnote markers and `<{["E", "chapterId:verseId"]}>` cross-references to
   * another verse's exegesis). Optional: not every exegesis source provides
   * commentary distinct from its translation (e.g. aliquli).
   */
  exegesis?: Record<string, string>
}

/** Resolved content for a single verse */
export interface ExegesisVerseContent {
  translation: string
  /** Tafsir/commentary text, distinct from translation (not all sources have this) */
  exegesis?: string | null
  /** footnote index → footnote text (only the footnotes for this verse) */
  footnotes: Record<string, string>
}
