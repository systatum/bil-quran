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
