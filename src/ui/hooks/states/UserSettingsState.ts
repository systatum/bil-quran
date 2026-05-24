import { DEFAULT_LOCALE, Locale } from "@constants/locales"
import LOGGER from "@services/Logger"
import { mergeKnownKeys } from "@services/mutator"
import { create } from "zustand"

const useUserSettingsState = create<UserSettingsState>((set, get) => ({
  userSettings: {
    locale: DEFAULT_LOCALE,
    lastScroll: {
      chapterId: 0,
      verse: 0,
    },
  },

  persistState() {
    const stringified = JSON.stringify(get().userSettings)
    LOGGER.debug("Persisted as", stringified)
    localStorage.setItem("userSettings", stringified)
  },

  restoreState(): UserSettings {
    const raw = localStorage.getItem("userSettings")
    if (!raw) return get().userSettings

    const parsed = JSON.parse(raw)
    const current = get().userSettings
    const hydrated = mergeKnownKeys(current, parsed) as UserSettings

    set({
      userSettings: hydrated,
    })

    return hydrated
  },

  setScrollPosition(chapterId, verse) {
    set((s) => ({
      userSettings: {
        ...s.userSettings,
        lastScroll: {
          chapterId,
          verse,
        },
      },
    }))

    LOGGER.debug("Persisting scrol position to", chapterId, verse)
    get().persistState()
  },
}))

export default useUserSettingsState

export interface UserSettingsState {
  userSettings: UserSettings

  /**
   * Restore the persisted state out of the localstorage
   */
  restoreState(): UserSettings

  /**
   * Record current user's state to local storage
   */
  persistState(): void

  setScrollPosition(chapterId: number, verse: number): void
}

export interface UserSettings {
  locale: Locale
  lastScroll: {
    chapterId: number
    verse: number
  }
}
