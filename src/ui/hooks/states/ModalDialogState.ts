import { create } from "zustand"

const useModalDialogState = create<ModalDialogState>((set) => ({
  content: null,

  showNoteVerseDialog(verseKey) {
    set({ content: { type: "note", verseKey } })
  },

  showHighlightVerseDialog(verseKey) {
    set({ content: { type: "highlight", verseKey } })
  },

  showBackupDialog() {
    set({ content: { type: "backup" } })
  },

  close() {
    set({ content: null })
  },
}))

export interface ModalDialogState {
  content: ModalDialogContent | null
  showNoteVerseDialog: (verseKey: string) => void
  showHighlightVerseDialog: (verseKey: string) => void
  showBackupDialog: () => void
  close: () => void
}

export type ModalDialogContent =
  | { type: "note"; verseKey: string }
  | { type: "highlight"; verseKey: string }
  | { type: "backup" }

export default useModalDialogState
