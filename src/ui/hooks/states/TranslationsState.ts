import {
  TranslationCorpus,
  TranslationCorpusMap,
  WordTranslationOption,
} from "@constants/records/WordTranslationRecord"
import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import { ensureHasTranslation } from "@services/translations"
import { create } from "zustand"

// Every visible VerseRow calls getCorpus independently, so without this a
// locale's corpus (compiling ~77k rows) gets computed once per row that
// mounts before the first compile resolves, instead of once total.
const inFlightCorpora = new Map<
  WordTranslationOption,
  Promise<TranslationCorpus>
>()

const useTranslationsState = create<TranslationsState>((set, get) => ({
  corpora: {},
  async getCorpus(locale) {
    const corpus = get().corpora[locale]
    if (corpus) return corpus

    const inFlight = inFlightCorpora.get(locale)
    if (inFlight) return inFlight

    const promise = (async () => {
      await ensureHasTranslation(locale)
      const compiled = unpackIPC(await repo.wbwTranslations.compile(locale))
      if (compiled == null) throw new Error("Corpus remains empty")
      set((s) => ({
        corpora: {
          ...s.corpora,
          [locale]: compiled,
        },
      }))

      return compiled
    })()

    inFlightCorpora.set(locale, promise)
    try {
      return await promise
    } finally {
      inFlightCorpora.delete(locale)
    }
  },
}))

export interface TranslationsState {
  corpora: Partial<TranslationCorpusMap>
  getCorpus: (locale: WordTranslationOption) => Promise<TranslationCorpus>
}

export default useTranslationsState
