export const Locale = {
  English: "en-US",
}
export type Locale = (typeof Locale)[keyof typeof Locale]
