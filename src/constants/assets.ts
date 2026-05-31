import { Rendering } from "./records/RenderingRecord"
import { Locale } from "./settings"

export interface WordByWordTranslationAsset {
  path: string
}

export interface Translation {
  wordByWord: Record<Locale, WordByWordTranslationAsset>
}

export interface Asset {
  /**
   * Metadata for each of the Quranic chapters
   */
  chaptersMetadata: string

  renderings: Record<Rendering, string>
  translations: Translation
}
const basePath = `${window.location.origin}${process.env.PUBLIC_URL}`
export const Asset: Asset = {
  chaptersMetadata: `${basePath}/quran/chapters.json`,
  renderings: {
    [Rendering.Standard]: `${basePath}/quran/verses/standard.json`,
  },
  translations: {
    wordByWord: {
      [Locale.IntEnglish]: {
        path: `${basePath}/quran/wbw_translations/en-US.json`,
      },
      [Locale.Indonesian]: {
        path: `${basePath}/quran/wbw_translations/id-ID.json`,
      },
    },
  },
}
