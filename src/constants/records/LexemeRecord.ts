import { Locale } from "@constants/locales"

/**
 * Represent all the unique word in a Quranic "dictionary"
 */
export interface LexemeRecord {
  id: number
  token: string
  root: string
  readings: Record<Locale, string>
}

export type NewLexemeRecord = Omit<LexemeRecord, "id">
