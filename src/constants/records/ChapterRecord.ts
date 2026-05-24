import { Locale } from "@constants/settings"

/**
 * Represents a chapter in the Qur'an.
 */
export interface ChapterRecord {
  /**
   * Starts from 1, the numbering of the surat in the Qur'an.
   */
  id: number
  /**
   * Indicates whether the chapter is primarily revealed
   * in Meccan or while the prophet already in Madinah.
   */
  isMeccan: boolean
  partitioning: ChapterPartDivision[]
  // name of the chapters in arabic and other localities
  namings: Record<Locale, string>
  // name of the chapters in arabic and other localities
  transliterations: Record<Locale, string>
  // the meaning of the chapter in various locales
  meanings: Record<Locale, string>
}

/**
 * Indicates the universal compartmentalization of a given
 * chapter into 1/30-th part: which part, and from which
 * verse to what verse
 */
export interface ChapterPartDivision {
  part: number
  start: number
  end: number
}
