import { Asset } from "@constants/assets"
import {
  ExegesisChapterAsset,
  ExegesisMetadata,
  ExegesisVerseContent,
} from "@constants/records/ExegesisRecord"
import { Locale } from "@constants/settings"
import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import {
  FingerprintedAsset,
  isAssetCurrent,
  saveFingerprints,
} from "@services/fingerprinter"
import LOGGER from "@services/Logger"
import { mergeKeys, pickLocalized } from "@services/mutator"
import { create } from "zustand"

const useExegesisState = create<ExegesisState>((set, get) => ({
  exegesis: {},

  getVerseExegesis(exegesisId, chapterId, verseNumber) {
    return get().exegesis[exegesisId]?.[chapterId]?.[verseNumber] ?? null
  },

  async getShortDesc(exegesisId, locale) {
    await ensureMetadata(exegesisId)
    const records = unpackIPC(await repo.exegesis.findAllBy({ id: exegesisId }))
    const record = records[0]
    if (!record) return ""
    const desc = record.description as Partial<Record<Locale, string>>
    return (
      desc[locale] ??
      desc[Locale.IntEnglish] ??
      Object.values(desc).find(Boolean) ??
      ""
    )
  },

  async loadChapter(exegesisId, chapterId) {
    const [, locale] = exegesisId.split("/")
    const source = Asset.exegesisOf(exegesisId)
    if (!source) throw new Error(`Unknown exegesis source: ${exegesisId}`)

    const chapterUrl = Asset.exegesisAssetUrlOf(
      exegesisId,
      locale as Locale,
      chapterId,
    )
    await ensureMetadata(exegesisId)

    const [exegesis] = unpackIPC(
      await repo.exegesis.findAllBy({ id: exegesisId }),
    )
    const isDownloaded =
      exegesis?.downloadedChapters.includes(chapterId) ?? false
    const isRecent = await isAssetCurrent(chapterUrl)

    let versesExegesis: Record<number, ExegesisVerseContent>

    if (isDownloaded && isRecent) {
      versesExegesis = unpackIPC(
        await repo.exegesisContent.findByChapter(exegesisId, chapterId),
      )
    } else {
      if (isDownloaded) {
        await repo.exegesis.unmarkChapter(exegesisId, chapterId)
        LOGGER.debug(
          `Exegesis fingerprint drifted, re-fetching: ${exegesisId} ch${chapterId}`,
        )
      }
      versesExegesis = await downloadChapter(exegesisId, chapterId)
      await repo.exegesis.markChapter(exegesisId, chapterId)
    }

    set((s) => ({
      exegesis: mergeKeys(s.exegesis, [exegesisId, chapterId], versesExegesis),
    }))
  },
}))

async function downloadChapter(
  exegesisId: string,
  chapterId: number,
): Promise<Record<number, ExegesisVerseContent>> {
  // Delete any stale rows before inserting fresh ones — guards against both
  // fingerprint-drift re-downloads and interrupted previous downloads where
  // markChapter never ran.
  await repo.exegesisContent.deleteChapter(exegesisId, chapterId)

  const [, locale] = exegesisId.split("/")
  const chapterUrl = Asset.exegesisAssetUrlOf(
    exegesisId,
    locale as Locale,
    chapterId,
  )
  const data =
    await FingerprintedAsset.readJson<ExegesisChapterAsset>(chapterUrl)

  const rows = Object.entries(data.translations).map(
    ([verseKey, translation]) => ({
      exegesisId,
      chapterId,
      verseNumber: Number(verseKey),
      translation,
      footnotes: data.footnotes?.[verseKey] ?? {},
    }),
  )

  if (rows.length > 0) await repo.exegesisContent.createBulk(rows)

  saveFingerprints({ merge: true })

  return Object.fromEntries(
    rows.map((r) => [
      r.verseNumber,
      { translation: r.translation, footnotes: r.footnotes },
    ]),
  )
}

async function ensureMetadata(exegesisId: string): Promise<void> {
  const existing = unpackIPC(await repo.exegesis.findAllBy({ id: exegesisId }))
  if (existing.length > 0) return

  const source = Asset.exegesisOf(exegesisId)
  if (!source) throw new Error(`Unknown exegesis source: ${exegesisId}`)

  const about = await FingerprintedAsset.readJson<ExegesisMetadata>(
    `${source.path}/about.json`,
  )

  await repo.exegesis.create({
    id: exegesisId,
    oriName: about.name,
    locNames: pickLocalized(about.locNames ?? {}, (v) => v),
    description: pickLocalized(about.about ?? {}, (v) => v.shortDesc),
    author: about.author,
    authorBio: pickLocalized(about.about ?? {}, (v) => v.author),
    downloadedChapters: [],
  })

  LOGGER.debug(`Stored exegesis metadata: ${exegesisId}`)
}

type VerseExegesis = Record<number, ExegesisVerseContent>
type ChapterExegesis = Record<number, VerseExegesis>

export interface ExegesisState {
  /** In-memory cache of verse content, keyed by exegesisId → chapterId → verseNumber. */
  exegesis: Record<string, ChapterExegesis>

  /**
   * Fetch the short description for an exegesis source in the given locale,
   * before falling back to English/available locale or if neither exists: empty string
   */
  getShortDesc: (exegesisId: string, locale: Locale) => Promise<string>

  /** Return cached verse content for a specific verse, or null if not yet loaded. */
  getVerseExegesis: (
    exegesisId: string,
    chapterId: number,
    verseNumber: number,
  ) => ExegesisVerseContent | null

  /**
   * Ensure a chapter's verse content is available in the cache.
   * On first call: fetches the chapter JSON, stores rows in the DB, and
   * marks the chapter as downloaded. On subsequent calls: serves from the DB
   * unless the remote fingerprint has drifted, in which case stale rows are
   * replaced before re-populating the cache.
   */
  loadChapter: (exegesisId: string, chapterId: number) => Promise<void>
}

export default useExegesisState
