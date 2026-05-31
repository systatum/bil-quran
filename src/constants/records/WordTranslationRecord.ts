import { Locale } from "@constants/settings"

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
export enum WordTranslationOption {
  AmericanEnglish = "en-US",
  Indonesian = "id-ID",
}

/**
 * Maps application locale to the closest available word-by-word translation.
 */
export namespace WordTranslationOption {
  export function fromLocale(locale: Locale): WordTranslationOption {
    switch (locale) {
      case Locale.IntEnglish:
        return WordTranslationOption.AmericanEnglish

      case Locale.Indonesian:
        return WordTranslationOption.Indonesian

      default:
        return WordTranslationOption.AmericanEnglish
    }
  }
}

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
