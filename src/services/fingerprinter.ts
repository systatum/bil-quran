import { Asset, basePath } from "@constants/assets"
import { QuranPage } from "@constants/records/Pagination"
import { Rendering } from "@constants/records/RenderingRecord"
import { WordTranslationOption } from "@constants/records/WordTranslationRecord"
import LOGGER from "./Logger"

type AssetPath = string

/**
 * Map of an asset relative path and their MD5 fingerprint
 */
type NotarizedAsset = Record<AssetPath, string>

export const FINGERPRINT_KEY = "fprints.systatum"
const quranBasePath = `${basePath}/quran/`
const fingerprintsPath = `${quranBasePath}fingerprints.json`

let remoteFingerprintsPromise: Promise<NotarizedAsset | null> | null = null
const readFingerprints: NotarizedAsset = {}

export class FingerprintedAsset {
  static Quran = {
    getChaptersMetadata: async <T>(): Promise<T> => {
      return FingerprintedAsset.readJson<T>(Asset.chaptersMetadata)
    },

    /**
     * Download chapter rendering
     */
    getVerseRendering: async <T>(
      rendering: Rendering,
      chapterNumber: number,
    ): Promise<T> => {
      return FingerprintedAsset.readJson<T>(
        `${Asset.renderings[rendering]}/${chapterNumber}.json`,
      )
    },

    getPaginationStyle: async (
      style: keyof typeof Asset.paginationStyles,
    ): Promise<Array<QuranPage>> => {
      return FingerprintedAsset.readJson<Array<QuranPage>>(
        Asset.paginationStyles[style],
      )
    },

    getLexemeTranslation: async <T>(
      locale: WordTranslationOption,
    ): Promise<T> => {
      return FingerprintedAsset.readJson<T>(
        Asset.translations.wordByWord[locale].path,
      )
    },
  }

  /**
   * Read a JSON asset and record its fingerprint. If the fingerprint drifted from previous
   * read, we may do something, but that something is "context-specific"
   */
  static async readJson<T>(assetPath: string): Promise<T> {
    await recordRead(assetPath)

    const response = await fetch(assetPath, { cache: "no-cache" })
    if (!response.ok) {
      LOGGER.error(`Unable to load asset: ${assetPath}`)
      throw new Error(`Unable to load asset: ${assetPath}`)
    }

    return response.json()
  }
}

async function recordRead(assetPath: string): Promise<void> {
  const filePath = canonizePathKey(assetPath)
  if (filePath == null) return

  const remoteFingerprints = await getRemoteFingerprints()
  const fingerprint = remoteFingerprints?.[filePath]
  if (fingerprint == null) return

  readFingerprints[filePath] = fingerprint
}

function canonizePathKey(assetPath: string): AssetPath | null {
  if (!assetPath.startsWith(quranBasePath)) return null

  const relativePath = assetPath.slice(quranBasePath.length)
  return relativePath.length > 0 ? relativePath : null
}

export async function getRemoteFingerprints(): Promise<NotarizedAsset | null> {
  remoteFingerprintsPromise ??= fetch(fingerprintsPath, {
    cache: "no-cache",
  })
    .then((response) => {
      if (!response.ok) {
        LOGGER.error(`Unable to load fingerprint file: ${fingerprintsPath}`)
        return null
      }

      return response.json()
    })
    .catch((error) => {
      LOGGER.error(
        `Unable to load fingerprint file: ${fingerprintsPath}`,
        error,
      )
      return null
    })

  return remoteFingerprintsPromise
}

/**
 * Check if fingerprints of core Qur'an assets (chapters, verses, word
 * translations, etc.) still match the remote manifest. If not, the persisted
 * DB snapshot is skipped so data is re-seeded from fresh files.
 * Exegesis assets are intentionally excluded, as they are optional.
 */
export async function isCoreAssetsRecent(): Promise<boolean> {
  const latest = await getRemoteFingerprints()

  // If the fingerprint file cannot be read, avoid resetting the database just
  // because the user is offline or the network is slow.
  if (latest == null) return true

  const current = loadFingerprints()
  if (current == null) return false

  const coreAssets = Object.fromEntries(
    Object.entries(current).filter(([k]) => !k.startsWith("exegesis/")),
  )

  const isEqual = areStoredFingerprintsCurrent(latest, coreAssets)
  LOGGER.debug(`Core fingerprints equal? ${isEqual ? "Yes!" : "No!"}`)
  return isEqual
}

/**
 * Returns true if the locally stored fingerprint for the given asset path
 * matches the current remote fingerprint.
 */
export async function isAssetCurrent(assetPath: string): Promise<boolean> {
  const filePath = canonizePathKey(assetPath)
  if (filePath == null) return false

  const remote = await getRemoteFingerprints()
  if (remote == null) return true

  const stored = loadFingerprints()
  if (stored == null) return false

  return stored[filePath] === remote[filePath]
}

export function saveFingerprints({ merge = false } = {}): void {
  // Nothing was read this session and we're not merging — preserve whatever is
  // already stored rather than overwriting with an empty object, which would
  // cause isCoreAssetsRecent() to return false on the very next load.
  if (!merge && Object.keys(readFingerprints).length === 0) return

  const existingFingerprints = merge ? loadFingerprints() : null

  localStorage.setItem(
    FINGERPRINT_KEY,
    JSON.stringify({
      ...existingFingerprints,
      ...readFingerprints,
    }),
  )
}

function loadFingerprints(): NotarizedAsset | null {
  const raw = localStorage.getItem(FINGERPRINT_KEY)
  if (raw == null) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function areStoredFingerprintsCurrent(
  latest: NotarizedAsset,
  stored: NotarizedAsset,
): boolean {
  const storedEntries = Object.entries(stored)
  if (storedEntries.length === 0) return false

  return storedEntries.every(([assetPath, checksum]) => {
    return latest[assetPath] === checksum
  })
}
