/**
 * A translation for a single word. Each word in each verse in
 * each chapter will have this record.
 */
export interface WordTranslationRecord {
  locale: string
  chapter: number
  ayat: number // TODO: replace this with verse
  word: number
  meaning: string
}

/**
 * A corpus of translation of a certain locale. This corpus holds translation
 * of that locale, whereby the translation can be found by delving into the
 * chapter, the verse, and then the position of the word of interest.
 */
export type TranslationCorpus = Record<
  number,
  Record<number, Record<number, string>>
>

/**
 * Posisble word-by-word translation locales
 */
export const WordTranslationOption = {
  AmericanEnglish: "en-US",
  Indonesian: "id-ID",
} as const

export type WordTranslationOption =
  (typeof WordTranslationOption)[keyof typeof WordTranslationOption]

/**
 * Mapping corpus translation by the locale
 */
export type TranslationCorpusMap = Record<
  WordTranslationOption,
  TranslationCorpus
>

/**
 * A map of translation of a word in a various different translation options/
 * locales
 */
export type TranslatedWord = Record<WordTranslationOption, string>
