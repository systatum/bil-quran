/**
 * A translation for a single word. Each word in each verse in
 * each chapter will have this record.
 */
export interface WbwTranslationRecord {
  locale: string
  chapter: number
  ayat: number
  word: number
  meaning: string
}

export type WordByWordTranslation = Record<
  number,
  Record<number, Record<number, string>>
>
