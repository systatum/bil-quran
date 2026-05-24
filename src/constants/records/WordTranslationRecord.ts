/**
 * A translation for a single word. Each word in each verse in
 * each chapter will have this record.
 */
export interface WordTranslationRecord {
  locale: string
  chapter: number
  ayat: number
  word: number
  meaning: string
}

export type WordTranslation = Record<
  number,
  Record<number, Record<number, string>>
>
