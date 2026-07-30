import { PaginationStyle } from "./records/Pagination"
import { Rendering } from "./records/RenderingRecord"
import { Locale } from "./settings"

export interface WordByWordTranslationAsset {
  path: string
}

export interface Translation {
  wordByWord: Record<Locale, WordByWordTranslationAsset>
}

export interface ExegesisSource {
  /** Display name of this exegesis work */
  name: string
  /** Full URL path to the exegesis directory (no trailing slash), can serve as an ID */
  path: string
  /** Locales for which verse-level translation files are available */
  availableLocales: Locale[]
}

/** Slug identifying a specific exegesis work, matching its directory name under `exegesis/`. */
export enum ExegesisWork {
  AliQuli = "aliquli",
  MirAli = "mirali",
  IbnKathir = "ibnkathir",
}

export namespace ExegesisWork {
  export function isValid(value: string): value is ExegesisWork {
    return Object.values(ExegesisWork).includes(value as ExegesisWork)
  }
}

/** Fallback exegesis work when a URL names one that isn't valid (see `Asset.resolveExegesisId`). */
export const DEFAULT_FEED_EXEGESIS_WORK: ExegesisWork = ExegesisWork.MirAli

export interface Asset {
  /**
   * Metadata for each of the Quranic chapters
   */
  chaptersMetadata: string
  /** Which style of Quranic pagination to use */
  paginationStyles: Record<PaginationStyle, string>
  renderings: Record<Rendering, string>
  translations: Translation
  exegesisSources: ExegesisSource[]

  /** Find an exegesis source by slug or full exegesisId. Returns null if not found. */
  exegesisOf: (id: string) => ExegesisSource | null
  /** Build the URL for a chapter asset given a slug (or full exegesisId), locale, and chapter number. */
  exegesisAssetUrlOf: (id: string, locale: Locale, chapterId: number) => string
  /** Find default exegesis id for first-time. */
  defaultExegesisId: (locale: Locale) => string | null
}

export const basePath = `${typeof window !== "undefined" ? window.location.origin : ""}${process.env.PUBLIC_URL}`
export const assetPath = `${basePath}/quran`
export const paginationPath = `${assetPath}/paginations`
export const exegesisBasePath = `${assetPath}/exegesis`

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
  exegesisSources: [
    {
      name: "Ali Quli Qara'i",
      path: `${exegesisBasePath}/${ExegesisWork.AliQuli}`,
      availableLocales: [Locale.IntEnglish],
    },
    {
      name: "Mir Ahmad Ali",
      path: `${exegesisBasePath}/${ExegesisWork.MirAli}`,
      availableLocales: [Locale.IntEnglish],
    },
    {
      name: "Ibn Kathir",
      path: `${exegesisBasePath}/${ExegesisWork.IbnKathir}`,
      availableLocales: [Locale.IntEnglish],
    },
  ],

  exegesisOf(id) {
    const slug = id.split("/")[0]
    return (
      Asset.exegesisSources.find((s) => s.path.split("/").pop() === slug) ??
      null
    )
  },
  exegesisAssetUrlOf(id, locale, chapterId) {
    const source = Asset.exegesisOf(id)
    if (!source) throw new Error(`Unknown exegesis source: ${id.split("/")[0]}`)
    return `${source.path}/${locale}/${chapterId}.json`
  },
  defaultExegesisId(locale) {
    const source = Asset.exegesisOf("aliquli")
    if (!source) return null
    const slug = source.path.split("/").pop()!
    const resolvedLocale = source.availableLocales.includes(locale)
      ? locale
      : Locale.IntEnglish
    return `${slug}/${resolvedLocale}`
  },
}
