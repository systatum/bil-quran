import {
  WordTranslationOption,
  WordTranslationRecord,
} from "@constants/records/WordTranslationRecord"
import { persistDb } from "@db/driver"
import { repo } from "@db/repo"
import { unpackIPC } from "./Converter"
import { FingerprintedAsset, saveFingerprints } from "./fingerprinter"
import LOGGER from "./Logger"

/**
 * Promises by locale. This record keeping is to de-duplicate
 * in-flight locale download
 */
const insertionPromises: Partial<Record<WordTranslationOption, Promise<void>>> =
  {}

export async function ensureHasTranslation(locale: WordTranslationOption) {
  const existing = insertionPromises[locale]

  // only one seeding operation per locale can ever run.
  if (existing) {
    await existing
    return
  }

  const promise = (async () => {
    const locales = unpackIPC(await repo.wbwTranslations.findAllBy({ locale }))

    if (locales.length > 0) return
    LOGGER.debug("Seeding word-by-word trans for", locale)

    const translations =
      await FingerprintedAsset.Quran.getLexemeTranslation<
        Record<string, string>
      >(locale)

    const BATCH_SIZE = 1200
    let batch: Partial<WordTranslationRecord>[] = []
    async function flushBatch() {
      if (batch.length === 0) return
      unpackIPC(await repo.wbwTranslations.createBulk(batch))
      batch = []
    }

    for (const [loc, meaning] of Object.entries(translations)) {
      // (1) (2) (3) is a verse marker, but careful not to skip like "2:8:11" "(are) believers (at all)",
      const isVerseMarker = /^\s*\(\d+\)\s*$/.test(meaning)
      if (isVerseMarker) continue // skip verse markers like "(1)"

      const [chapter, verse, word] = loc.split(":")
      batch.push({
        locale: WordTranslationOption.toNumber(locale),
        chapter: parseInt(chapter),
        ayat: parseInt(verse),
        word: parseInt(word),
        meaningSunni: meaning,
      })

      if (batch.length >= BATCH_SIZE) await flushBatch()
    }

    await flushBatch()
    await persistDb()
    saveFingerprints({ merge: true })
  })()

  insertionPromises[locale] = promise

  try {
    await promise
  } finally {
    delete insertionPromises[locale]
  }
}
