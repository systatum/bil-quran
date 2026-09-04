import { WordOccurrence } from "@constants/records/WordRecord"
import { repo } from "@db/repo"
import usePaperDialogState from "@hooks/states/PaperDialogState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { unpackIPC } from "@services/Converter"
import LOGGER from "@services/Logger"
import { makeSnippet } from "@services/mutator"
import { WordCell } from "../../fragments/QuranPaper/VerseRow"
import { useWordTranslations } from "./useWordTranslations"

/** Looks up other occurrences of a word's lexeme across the Qur'an, for the Lexeme dialog's "similar words" panel. */
export default function useWordOccurrencesFinder() {
  const {
    userSettings: { wbwTranslations },
  } = useUserSettingsState()
  const corpora = useWordTranslations(wbwTranslations)

  return (word: WordCell) => {
    repo.words
      .findOccurrences(word.lexemeId)
      .then((ipcResp) => {
        const rawVerses = unpackIPC(ipcResp)
        const verses = rawVerses.map((v) => {
          const targetIndex = v.words.findIndex(
            (w) => w.order === v.targetOrder,
          )

          // use a deterministic "random" based on the verse so the same
          // occurrence always displays identically instead of changing on
          // every render
          const deterministicCounter = () =>
            ((v.chapterId * 31 + v.verse * 17 + v.targetOrder) % 5) + 1

          const shownWords: WordCell[] = makeSnippet(
            v.words,
            targetIndex,
            deterministicCounter,
          ).map((word) => ({
            ...word,
            meanings: Object.fromEntries(
              wbwTranslations.map((locale) => [
                locale,
                corpora[locale]?.[word.chapterId]?.[word.verse]?.[word.order],
              ]),
            ),
          }))

          return {
            ...v,
            words: shownWords,
          }
        })
        const obj: Record<string, WordOccurrence> = {}
        verses.forEach((v) => {
          const key = `${v.chapterId}:${v.verse}`
          obj[key] = v
        })
        usePaperDialogState.getState().updateLexemeOccurrences(obj)
      })
      .catch((e) => LOGGER.error("Failed getting occurrences data", e))
  }
}
