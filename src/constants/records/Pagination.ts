/** Range of the verses on a page */
export type PageVerseRange = [number, number]

/** A standardized, organized page of the Quran */
export interface QuranPage {
  /** Which juz/part of the Quran this page belongs to */
  part: number
  /** IDs of the chapters that are on this page */
  chapterIds: number[]
  /** Start-end range of the verses for each chapter on this page */
  verseNumbers: Array<PageVerseRange>
}

/** A record of a specific pagination style */
export interface PaginationRecord {
  id: number
  name: string
  pages: Array<QuranPage>
}

/** Name of known pagination styles */
export const PaginationStyle = {
  Madinah: "madinah",
}
export type PaginationStyle =
  (typeof PaginationStyle)[keyof typeof PaginationStyle]
