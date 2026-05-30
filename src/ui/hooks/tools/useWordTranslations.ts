import { useEffect, useMemo, useRef, useState } from "react"

import { WordWithLexemeRecord } from "@constants/records/WordRecord"
import {
  TranslationCorpusMap,
  WordTranslationOption,
} from "@constants/records/WordTranslationRecord"
import { repo } from "@db/repo"
import useAppState from "@hooks/states/AppState"
import useWordsState from "@hooks/states/WordsState"
import { stringifyError, unpackIPC } from "@services/Converter"
import LOGGER from "@services/Logger"
import { ensureHasTranslation } from "@services/translations"
import toast from "react-hot-toast"
import { WordCell } from "../../fragments/QuranPaper/VerseRow"

/**
 * Load word translations
 */
export function useWordTranslations(
  locales: WordTranslationOption[],
): Partial<TranslationCorpusMap> {
  const { pushError, setLoadingText, setIsVersesLoaded } = useAppState()
  const [corpora, setCorpora] = useState<Partial<TranslationCorpusMap>>({})

  /**
   * For solving out-of-order completion issue, by monotonically increasing
   * request version. This prevents stale translation downloads/compilations
   * from overwriting more recent state.
   */
  const requestIdRef = useRef(0)

  useEffect(() => {
    async function load() {
      /**
       * As a new load cycle begins, increments this value. Older async
       * operations are allowed to finish, but they are ignored if a newer
       * request has already started.
       */
      const requestId = ++requestIdRef.current

      const entries = await Promise.all(
        locales.map(async (locale) => {
          // no need to recompile if it is already loaded in memory
          if (corpora[locale] != null) return [locale, corpora[locale]] as const

          if (requestId !== requestIdRef.current) return [locale, {}]
          await ensureHasTranslation(locale)
          const corpus = unpackIPC(await repo.wbwTranslations.compile(locale))
          return [locale, corpus] as const
        }),
      )

      // A newer request started while this one was running.
      // Ignore these results because they are already obsolete.
      if (requestId !== requestIdRef.current) return

      setCorpora(Object.fromEntries(entries))
      setIsVersesLoaded(true)
    }

    load().catch((e) => {
      toast.error(
        "Cannot download locale, please alert the developer of this error: " +
          stringifyError(e),
      )
      LOGGER.error(e)
      pushError(e)
    })
  }, [locales])

  return corpora
}

export function useWords() {
  const { pushError } = useAppState()
  const { words, loadWords } = useWordsState()

  useEffect(() => {
    ;(async () => {
      if (words.length > 0) return
      try {
        loadWords()
      } catch (e) {
        pushError(e)
      }
    })()
  }, [])

  return words
}

export function useTranslatedWords(
  words: WordWithLexemeRecord[],
  locales: WordTranslationOption[],
): WordCell[] {
  const corpora = useWordTranslations(locales)

  return useMemo(() => {
    return words.map((word) => ({
      ...word,

      meanings: Object.fromEntries(
        locales.map((locale) => [
          locale,
          corpora[locale]?.[word.chapterId]?.[word.verse]?.[word.order],
        ]),
      ),
    }))
  }, [words, corpora, locales])
}
