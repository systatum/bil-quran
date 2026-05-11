export const Locale = {
  English: "en-US",
}
export type Locale = (typeof Locale)[keyof typeof Locale]

export interface WordByWordTranslationAsset {
  path: string
}

export interface Translation {
  wordByWord: Record<Locale, WordByWordTranslationAsset>
}

export const Rendering = {
  Imlaei: "imlaei",
}
export type Rendering = (typeof Rendering)[keyof typeof Rendering]

export interface Asset {
  /**
   * Metadata for each of the Quranic chapters
   */
  chaptersMetadata: string

  verses: Record<Rendering, string>
  translations: Translation
}
const basePath = `${window.location.origin}${process.env.PUBLIC_URL}`
export const Asset: Asset = {
  chaptersMetadata: `${basePath}/quran/chapters.json`,
  verses: {
    [Rendering.Imlaei]: `${basePath}/`,
  },
  translations: {
    wordByWord: {
      [Locale.English]: {
        path: "https://assets.bil-quran.com/translations/wbw/en-US.json",
      },
    },
  },
}
