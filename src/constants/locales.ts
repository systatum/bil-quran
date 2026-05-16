export const Locale = {
  English: "en-US",
} as const

export type Locale = (typeof Locale)[keyof typeof Locale]

export const DEFAULT_LOCALE = Locale.English
