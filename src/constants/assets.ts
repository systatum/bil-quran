import { PaginationStyle } from "./records/Pagination"
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
  /** Which style of Quranic pagination to use */
  paginationStyles: Record<PaginationStyle, string>
  renderings: Record<Rendering, string>
  translations: Translation
}

export const basePath = `${typeof window !== "undefined" ? window.location.origin : ""}${process.env.PUBLIC_URL}`
export const assetPath = `${basePath}/quran`
export const paginationPath = `${assetPath}/paginations`
export const Asset: Asset = {
  chaptersMetadata: `${basePath}/quran/chapters.json`,
  paginationStyles: {
    madinah: `${paginationPath}/madinah.json`,
  },
  renderings: {
    [Rendering.Imlaei]: `${basePath}/quran/verses/imlaei`,
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
