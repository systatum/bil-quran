import { Asset } from "@constants/assets"
import {
  WordTranslationOption,
  WordTranslationRecord,
} from "@constants/records/WordTranslationRecord"
import { repo } from "@db/repo"
import { unpackIPC } from "./Converter"

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
    console.debug("Seeding word-by-word translations")

    const translations: Record<string, string> = await (
      await fetch(Asset.translations.wordByWord[locale].path)
    ).json()

    const BATCH_SIZE = 1200
    let batch: Partial<WordTranslationRecord>[] = []
    async function flushBatch() {
      if (batch.length === 0) return
      unpackIPC(await repo.wbwTranslations.createBulk(batch))
      batch = []
    }

    for (const [loc, meaning] of Object.entries(translations)) {
      const isVerseMarker = // this is just chapter marker ie (1), (2)
        meaning.length >= 2 &&
        meaning[0] === "(" &&
        meaning[meaning.length - 1] === ")"
      if (isVerseMarker) continue // skip verse markers like "(1)"

      const [chapter, verse, word] = loc.split(":")
      batch.push({
        locale: locale,
        chapter: parseInt(chapter),
        ayat: parseInt(verse),
        word: parseInt(word),
        meaning,
      })

      if (batch.length >= BATCH_SIZE) await flushBatch()
    }

    await flushBatch()
  })()

  insertionPromises[locale] = promise

  try {
    await promise
  } finally {
    delete insertionPromises[locale]
  }
}
