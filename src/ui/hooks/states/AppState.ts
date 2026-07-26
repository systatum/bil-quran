import { stringifyError } from "@services/Converter"
import { Screen } from "@ui/index"
import { create } from "zustand"

const useAppState = create<AppState>((set, get) => ({
  errors: [],
  isVersesLoaded: false,
  loadingText: "",
  activeScreens: [],
  isSearchOpen: false,

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

  setActiveScreens(activeScreens) {
    set((state) => ({
      ...state,
      activeScreens,
    }))
  },

  setIsSearchOpen(isSearchOpen) {
    set((state) => ({
      ...state,
      isSearchOpen:
        typeof isSearchOpen === "function"
          ? isSearchOpen(state.isSearchOpen)
          : isSearchOpen,
    }))
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

  activeScreens: Screen[]
  setActiveScreens: (activeScreens: Screen[]) => void

  isSearchOpen: boolean
  setIsSearchOpen: (
    isSearchOpen: boolean | ((prev: boolean) => boolean),
  ) => void
}

export default useAppState
