import { create } from "zustand"

const useModalDialogState = create<ModalDialogState>((set) => ({
  content: null,

  showNoteVerseDialog(verseKey) {
    set({ content: { type: "note", verseKey } })
  },

  showHighlightVerseDialog(verseKey) {
    set({ content: { type: "highlight", verseKey } })
  },

  close() {
    set({ content: null })
  },
}))

export interface ModalDialogState {
  content: ModalDialogContent | null
  showNoteVerseDialog: (verseKey: string) => void
  showHighlightVerseDialog: (verseKey: string) => void
  close: () => void
}

export type ModalDialogContent =
  | { type: "note"; verseKey: string }
  | { type: "highlight"; verseKey: string }

export default useModalDialogState
