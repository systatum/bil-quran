import { create } from "zustand"

const useNoteVerseDialogState = create<NoteVerseDialogState>((set, get) => ({
  isOpen: false,
  verseKey: "",

  showNoteVerseDialog(verseKey) {
    set({ verseKey: verseKey, isOpen: true })
  },

  closeNoteVerseDialog() {
    set({ isOpen: false })
  },

  setIsOpen(isOpen) {
    set({ isOpen })
  },
}))

export interface NoteVerseDialogState {
  isOpen: boolean
  verseKey: string
  showNoteVerseDialog: (verseKey: string) => void
  closeNoteVerseDialog: () => void
  setIsOpen: (isOpen: boolean) => void
}

export default useNoteVerseDialogState
