import type { WordOccurrence } from "@constants/records/WordRecord"
import { create } from "zustand"
import type { WordCell } from "../../fragments/QuranPaper/VerseRow"
import useAppState from "./AppState"
import { Screen } from "@ui/index"

const usePaperDialogState = create<PaperDialogState>((set) => ({
  content: null,
  openCount: 0,

  async openLexeme(word) {
    await set((s) => ({
      content: { type: "lexeme", word, occurrences: {} },
      openCount: s.openCount + 1,
    }))
    await useAppState.setState({ activeScreens: [Screen.Lexeme] })
  },

  updateLexemeOccurrences(occurrences) {
    set((s) => {
      if (s.content?.type !== "lexeme") return {}
      return { content: { ...s.content, occurrences } }
    })
  },

  async openExegesis(chapterId, verseNumber) {
    await set((s) => ({
      content: { type: "exegesis", chapterId, verseNumber },
      openCount: s.openCount + 1,
    }))
    await useAppState.setState({ activeScreens: [Screen.Exegesis] })
  },

  close() {
    set({ content: null })
  },
}))

export interface PaperDialogState {
  content: PaperDialogContent | null
  /** Incremented each open call so a useEffect can fire openDialog() on the ref. */
  openCount: number
  openLexeme: (word: WordCell) => void
  /** Update occurrences in-place after the async DB fetch completes. */
  updateLexemeOccurrences: (occurrences: Record<string, WordOccurrence>) => void
  openExegesis: (chapterId: number, verseNumber: number) => void
  close: () => void
}

export type LexemeDetailDialogContentProp = {
  type: "lexeme"
  word: WordCell
  occurrences: Record<string, WordOccurrence>
}

export type ExegesisDialogContentProp = {
  type: "exegesis"
  chapterId: number
  verseNumber: number
}

export type PaperDialogContent =
  | LexemeDetailDialogContentProp
  | ExegesisDialogContentProp

export default usePaperDialogState
