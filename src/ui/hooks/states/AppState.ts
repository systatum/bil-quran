import { stringifyError } from "@services/Converter"
import { create } from "zustand"

const useAppState = create<AppState>((set, get) => ({
  errors: [],
  isVersesLoaded: false,
  loadingText: "",

  clearErrors() {
    set({ errors: [] })
  },

  pushError(error) {
    set((s) => ({
      errors: [...s.errors, stringifyError(error)],
    }))
  },

  setIsVersesLoaded(isVersesLoaded) {
    set({ isVersesLoaded })
  },

  setLoadingText(text) {
    set({ loadingText: text })
  },
}))

export interface AppState {
  errors: string[]
  pushError: (error: unknown) => void
  clearErrors: () => void

  isVersesLoaded: boolean
  setIsVersesLoaded: (isVersesLoaded: boolean) => void

  loadingText: string
  setLoadingText: (text: string) => void
}

export default useAppState
