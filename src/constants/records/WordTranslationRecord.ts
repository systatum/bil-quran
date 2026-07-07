import { Locale } from "@constants/settings"

/**
 * A translation for a single word. Each word in each verse in
 * each chapter will have this record.
 */
export interface WordTranslationRecord {
  locale: number
  chapter: number
  ayat: number // TODO: replace this with verse
  word: number
  meaningSunni: string
  meaningShia: string
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
  export function values(): WordTranslationOption[] {
    return Object.values(WordTranslationOption).filter(
      (value): value is WordTranslationOption => typeof value === "string",
    )
  }

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

  const LOCALE_TO_NUMBER: Record<Locale, number> = {
    "ar-IQ": 100,
    "en-US": 200,
    "id-ID": 300,
  } as const

  /** The locale is stored in the database as number; we need to convert back-and-forth */
  export function toNumber(locale: WordTranslationOption): number {
    const val = LOCALE_TO_NUMBER[locale]
    if (!val) throw new Error("Unknown locale: " + locale)
    return val
  }

  export function fromNumber(number: number): Locale {
    const locale = Object.keys(LOCALE_TO_NUMBER).find(
      (key) => LOCALE_TO_NUMBER[key as Locale] === number,
    )
    if (!locale) throw new Error("Unknown number: " + number)
    return locale as Locale
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
