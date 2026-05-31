import {
  TranslationCorpus,
  TranslationCorpusMap,
  WordTranslationOption,
} from "@constants/records/WordTranslationRecord"
import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import { ensureHasTranslation } from "@services/translations"
import { create } from "zustand"

const useTranslationsState = create<TranslationsState>((set, get) => ({
  corpora: {},
  async getCorpus(locale) {
    let corpus = get().corpora[locale]
    if (corpus) return corpus

    await ensureHasTranslation(locale)
    corpus = unpackIPC(await repo.wbwTranslations.compile(locale))
    if (corpus == null) throw new Error("Corpus remains empty")
    set((s) => ({
      corpora: {
        ...s.corpora,
        [locale]: corpus,
      },
    }))

    return corpus
  },
}))

export interface TranslationsState {
  corpora: Partial<TranslationCorpusMap>
  getCorpus: (locale: WordTranslationOption) => Promise<TranslationCorpus>
}

export default useTranslationsState
