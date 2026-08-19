import { useEffect, useMemo, useRef } from "react"

import { WordWithLexemeRecord } from "@constants/records/WordRecord"
import {
  TranslationCorpusMap,
  WordTranslationOption,
} from "@constants/records/WordTranslationRecord"
import useAppState from "@hooks/states/AppState"
import useTranslationsState from "@hooks/states/TranslationsState"
import useWordsState from "@hooks/states/WordsState"
import useToast from "@hooks/tools/useToast"
import { stringifyError } from "@services/Converter"
import LOGGER from "@services/Logger"
import { WordCell } from "../../fragments/QuranPaper/VerseRow"

/**
 * Load word translations
 */
export function useWordTranslations(
  locales: WordTranslationOption[],
): Partial<TranslationCorpusMap> {
  const { pushError, setIsVersesLoaded } = useAppState()
  const { corpora, getCorpus } = useTranslationsState()
  const { errorToast } = useToast()

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

      await Promise.all(
        locales.map(async (locale) => {
          // no need to recompile if it is already loaded in memory
          if (corpora[locale] != null) return
          if (requestId !== requestIdRef.current) return
          await getCorpus(locale)
        }),
      )

      // A newer request started while this one was running.
      // Ignore these results because they are already obsolete.
      if (requestId !== requestIdRef.current) return
      setIsVersesLoaded(true)
    }

    load().catch((e) => {
      errorToast(
        "Cannot download locale, please alert the developer of this error: " +
          stringifyError(e),
        "Error downloading",
      )
      LOGGER.error(e)
      pushError(e)
    })
  }, [locales])

  return corpora
}

/**
 * Loads and returns one chapter's words, or every loaded chapter's words if
 * `chapterId` is omitted.
 */
export function useWords(chapterId?: number) {
  const { pushError } = useAppState()
  const { words, loadedChapters, loadWords } = useWordsState()

  useEffect(() => {
    if (chapterId == null) {
      if (words.length > 0) return
      loadWords().catch((e) => pushError(e))
      return
    }

    if (loadedChapters.has(chapterId)) return
    loadWords(chapterId).catch((e) => pushError(e))
  }, [chapterId])

  return useMemo(
    () =>
      chapterId == null ? words : words.filter((w) => w.chapterId === chapterId),
    [words, chapterId],
  )
}

function translateWord(
  word: WordWithLexemeRecord,
  locales: WordTranslationOption[],
  corpora: Partial<TranslationCorpusMap>,
): WordCell {
  return {
    ...word,
    meanings: Object.fromEntries(
      locales.map((locale) => [
        locale,
        corpora[locale]?.[word.chapterId]?.[word.verse]?.[word.order],
      ]),
    ),
  }
}

export function useTranslatedWords(
  words: WordWithLexemeRecord[],
  locales: WordTranslationOption[],
): WordCell[] {
  const corpora = useWordTranslations(locales)

  // `words` only ever grows by appending whole chapters (never reorders or
  // removes), so a background chapter merge keeps every previous element's
  // identity. Reusing the previous result and translating just the new tail
  // keeps this O(new words) instead of O(all words loaded so far) on every
  // single background-seeded chapter.
  const prevRef = useRef<{
    words: WordWithLexemeRecord[]
    locales: WordTranslationOption[]
    corpora: Partial<TranslationCorpusMap>
    result: WordCell[]
  } | null>(null)

  return useMemo(() => {
    const prev = prevRef.current
    const isAppend =
      prev != null &&
      prev.locales === locales &&
      prev.corpora === corpora &&
      words.length >= prev.words.length &&
      words[0] === prev.words[0]

    const newWords = isAppend ? words.slice(prev!.words.length) : words

    // Nothing new for this particular filtered/scoped `words` view (e.g. a
    // single-chapter dialog while an unrelated chapter merges in the
    // background). Reuse the previous result as-is rather than allocating
    // an identical array.
    if (isAppend && newWords.length === 0) {
      prevRef.current = { words, locales, corpora, result: prev!.result }
      return prev!.result
    }

    const newCells = newWords.map((word) => translateWord(word, locales, corpora))
    const result = isAppend ? [...prev!.result, ...newCells] : newCells

    prevRef.current = { words, locales, corpora, result }
    return result
  }, [words, corpora, locales])
}
