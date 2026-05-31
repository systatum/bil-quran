export const Locale = {
  IntEnglish: "en-US",
  IntArabic: "ar-IQ",
  Indonesian: "id-ID",
} as const

export type Locale = (typeof Locale)[keyof typeof Locale]

export const DEFAULT_LOCALE = Locale.IntEnglish

/**
 * Where should be the basmala be shown in the quran paper, if
 * basmala is to be shown at all. Some chapters don't have
 * basmala as a starting invocation, such as in Al-Fatihah.
 */
export const BasmalaPosition = {
  /**
   * The basmala is shown alongside in the first verse if possible,
   * to save space.
   */
  Embedded: "0",

  /**
   * The basmala is detached, shown after the name of the verse,
   * if possible.
   */
  Detached: "1",
} as const

export type BasmalaPosition =
  (typeof BasmalaPosition)[keyof typeof BasmalaPosition]
