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
    },
  },
}

export interface FontSpecification {
  name: string
  relativePath: string
}

/**
 * List of fonts that the app supports. The "key" acts as the font ID,
 * so it should have never changed once it enters this dictionary.
 * ID of the font should not contains a space, as it also functions as
 * registered CSS name for the font.
 */
export const ArabicFonts = {
  Albayan: {
    name: "Albayan",
    relativePath: "albayan/albayan",
  },
  Almushaf: {
    name: "Almushaf",
    relativePath: "almushaf/almushaf",
  },
  AmiriColor: {
    name: "Amiri Color",
    relativePath: "amiri-color/amiri-quran-colored",
  },
  Amiri: {
    name: "Amiri",
    relativePath: "amiri/amiri_arabic-400-normal",
  },
  Bahij: {
    name: "Bahij",
    relativePath: "bahij/bahij",
  },
  DroidNaskh: {
    name: "Droid Naskh",
    relativePath: "droid-naskh/droid-naskh-regular",
  },
  FarsiSimple: {
    name: "Farsi Simple",
    relativePath: "farsi-simple/farsi-simple-bold",
  },
  NotoNaskhArabic: {
    name: "Noto Naskh Arabic",
    relativePath: "notonaskh/NotoNaskhArabic-Regular",
  },
  TahaNaskh: {
    name: "Taha Naskh",
    relativePath: "taha-naskh/taha-naskh",
  },
  Ubuntu: {
    name: "Ubuntu Arabic",
    relativePath: "ubuntu/Ubuntu-Arabic_R",
  },
} satisfies Record<string, FontSpecification>

export type ArabicFontFamily = keyof typeof ArabicFonts
