import { DEFAULT_LOCALE, Locale } from "@constants/locales"
import { ThemeMode } from "@constants/theme"
import LOGGER from "@services/Logger"
import { mergeKnownKeys } from "@services/mutator"
import { create } from "zustand"

const useUserSettingsState = create<UserSettingsState>((set, get) => ({
  userSettings: {
    locale: DEFAULT_LOCALE,
    theme: "light",
    lastScroll: {
      chapterId: 0,
      verse: 0,
    },
  },

  persistState() {
    const stringified = JSON.stringify(get().userSettings)
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

  setTheme(theme) {
    if (theme != "light" && theme != "dark")
      return LOGGER.error(`Skipping setting unknown theme: ${theme}`)

    set((s) => ({
      userSettings: {
        ...s.userSettings,
        theme: theme,
      },
    }))

    get().persistState()
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

  setTheme(theme: ThemeMode): void
  setScrollPosition(chapterId: number, verse: number): void
}

export interface UserSettings {
  locale: Locale
  theme: ThemeMode
  lastScroll: {
    chapterId: number
    verse: number
  }
}
