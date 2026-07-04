import { Locale } from "@constants/settings"

export interface ExegesisRecord {
  id: string
  /** The name of the tafsir work in the original language */
  oriName: string
  locNames: Partial<Record<Locale, string>>
  description: Partial<Record<Locale, string>>
  author: string
  authorBio: Partial<Record<Locale, string>>
}

/** Shape of the about.json file sitting in each exegesis directory */
export interface ExegesisMetadata {
  name: string
  author: string
  locNames: Partial<Record<Locale, string>>
  about: Partial<
    Record<
      Locale,
      {
        shortDesc: string
        detailDesc: string[]
        author: string
      }
    >
  >
}

/** Shape of a per-chapter exegesis JSON file (e.g. en-US/1.json) */
export interface ExegesisChapterAsset {
  chapterId: number
  description: string
  /** verse number (string key) → footnote index (string key) → footnote text */
  footnotes: Record<string, Record<string, string>>
  /** verse number (string key) → translation text (may contain inline footnote markers) */
  translations: Record<string, string>
}

/** Resolved content for a single verse */
export interface ExegesisVerseContent {
  translation: string
  /** footnote index → footnote text (only the footnotes for this verse) */
  footnotes: Record<string, string>
}
