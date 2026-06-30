import { Locale } from "@constants/settings"
import { WordCell } from "../../ui/fragments/QuranPaper/VerseRow"
import { RootRecord } from "./RootRecord"

/**
 * One row in the `words` table — a verse's full word sequence stored as an
 * ordered array of lexeme IDs.
 */
export interface WordRecord {
  /**
   * Which chapter (or surah/surat) this word belongs to
   */
  chapterId: number
  /**
   * The rendering/print style
   */
  renderingId: number
  /** Ordered list of lexeme IDs; position in the array is the word order. */
  lexemeIds: number[]
  verse: number
  partNumber: number
}

/**
 * A single word expanded from a `WordRecord` row, joined with its lexeme data.
 * `order` is 1-based (array index + 1).
 */
export interface WordWithLexemeRecord {
  chapterId: number
  verse: number
  order: number
  partNumber: number
  lexemeId: number
  renderingId: number
  token: string
  root: RootRecord
  readings: Partial<Record<Locale, string>>
}

export interface WordOccurrence {
  chapterId: number
  verse: number
  targetOrder: number
  words: WordCell[]
}
