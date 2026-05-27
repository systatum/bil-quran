export const Locale = {
  IntEnglish: "en-US",
  IntArabic: "ar-IQ",
  Indonesian: "id-ID",
} as const

export type Locale = (typeof Locale)[keyof typeof Locale]

export const DEFAULT_LOCALE = Locale.IntEnglish

export const BismillahPosition = {
  Embedded: 0,
  Detached: 1,
}

export type BismillahPosition =
  (typeof BismillahPosition)[keyof typeof BismillahPosition]
