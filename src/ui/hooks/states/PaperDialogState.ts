import type { WordOccurrence } from "@constants/records/WordRecord"
import { Screen } from "@ui/index"
import { create } from "zustand"
import type { WordCell } from "../../fragments/QuranPaper/VerseRow"
import useAppState from "./AppState"

/**
 * Set by `UIIndex` once the ScreenTransition mounts. `goBack()` only applies
 * a screen's removal ~300ms after being triggered (to let the close
 * animation play), so re-opening the same screen key inside that window
 * doesn't change `activeScreens` at all (pushScreen dedupes it away) and the
 * pending removal has nothing to notice it should stand down. Calling
 * `reopen()` right after re-asserting the screen cancels that stale removal.
 */
let notifyScreenReopened: ((key: Screen) => void) | null = null

export function registerScreenReopenNotifier(
  fn: ((key: Screen) => void) | null,
) {
  notifyScreenReopened = fn
}

const usePaperDialogState = create<PaperDialogState>((set) => ({
  content: null,
  openCount: 0,

  async openLexeme(word) {
    await set((s) => ({
      content: { type: "lexeme", word, occurrences: {} },
      openCount: s.openCount + 1,
    }))
    await useAppState.setState((s) => ({
      activeScreens: pushScreen(s.activeScreens, Screen.Lexeme),
    }))
    notifyScreenReopened?.(Screen.Lexeme)
  },

  updateLexemeOccurrences(occurrences) {
    set((s) => {
      if (s.content?.type !== "lexeme") return {}
      return { content: { ...s.content, occurrences } }
    })
  },

  async openExegesis(chapterId, verseNumber, overrides) {
    await set((s) => ({
      content: {
        type: "exegesis",
        chapterId,
        verseNumber,
        override: overrides,
      },
      openCount: s.openCount + 1,
    }))
    await useAppState.setState((s) => ({
      activeScreens: pushScreen(s.activeScreens, Screen.Exegesis),
    }))
    notifyScreenReopened?.(Screen.Exegesis)
  },

  close() {
    set({ content: null })
  },
}))

/**
 * Pushes `screen` onto the stack, unless it's already on top so revisiting a different
 * `/e/:chapter/:verse` updates the existing screen's content in place
 * instead of stacking a duplicate.
 */
function pushScreen(activeScreens: Screen[], screen: Screen): Screen[] {
  if (activeScreens.at(-1) === screen) return activeScreens
  return [...activeScreens, screen]
}

export interface PaperDialogState {
  content: PaperDialogContent | null
  /** Incremented each open call so a useEffect can fire openDialog() on the ref. */
  openCount: number
  openLexeme: (word: WordCell) => void
  /** Update occurrences in-place after the async DB fetch completes. */
  updateLexemeOccurrences: (occurrences: Record<string, WordOccurrence>) => void
  openExegesis: (
    chapterId: number,
    verseNumber: number,
    overrides?: ExegesisOverrides,
  ) => void
  close: () => void
}

export type LexemeDetailDialogContentProp = {
  type: "lexeme"
  word: WordCell
  occurrences: Record<string, WordOccurrence>
}

export interface ExegesisOverrides {
  /** Show exclusively this exegesisId (e.g. "ibnkathir/en-US") for this view. */
  exegesisId?: string
  /** Force transliteration on for this view. */
  showTransliteration?: boolean
}

export type ExegesisDialogContentProp = {
  type: "exegesis"
  chapterId: number
  verseNumber: number
  override?: ExegesisOverrides
}

export type PaperDialogContent =
  | LexemeDetailDialogContentProp
  | ExegesisDialogContentProp

/** Narrows `content` to one dialog type, since each screen only ever renders its own. */
export function assertPaperDialogContent<T extends PaperDialogContent["type"]>(
  content: PaperDialogContent | null,
  type: T,
): asserts content is Extract<PaperDialogContent, { type: T }> {
  if (content?.type !== type)
    throw new Error(`Type "${type}" expected, got "${content?.type}"`)
}

export default usePaperDialogState
