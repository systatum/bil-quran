import { Locale } from "@constants/settings"
import { RootRecord } from "./RootRecord"

/**
 * Represent all the unique word in a Quranic "dictionary"
 */
export interface LexemeRecord {
  id: number
  token: string
  rootId: number

  /**
   * The root characters that make up this word
   */
  root: RootRecord

  readings: Partial<Record<Locale, string>>
}

export type NewLexemeRecord = Omit<LexemeRecord, "id">
