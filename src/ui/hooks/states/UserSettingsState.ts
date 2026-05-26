import { ArabicFontFamily, ArabicFonts } from "@constants/fonts"
import { DEFAULT_LOCALE, Locale } from "@constants/settings"
import { ThemeMode } from "@constants/theme"
import { resolveLocale } from "@i18n"
import LOGGER from "@services/Logger"
import { DeepPartial, mergeKnownKeys } from "@services/mutator"
import { create } from "zustand"

const DEFAULT_USER_SETTINGS: UserSettings = {
  locale: DEFAULT_LOCALE,
  theme: "light",
  font: {
    arabic: {
      family: "NotoNaskhArabic",
      size: 42,
    },
  },
  lastScroll: {
    chapterId: 0,
    verse: 0,
  },
}

const useUserSettingsState = create<UserSettingsState>((set, get) => ({
  userSettings: DEFAULT_USER_SETTINGS,

  // ==== Local storage handler ==========================================

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

  // ==== Settings updater ===============================================

  partialUpdate(arg) {
    set((state) => {
      const next = typeof arg === "function" ? arg(state.userSettings) : arg

      return {
        userSettings: {
          ...state.userSettings,
          ...next,
        },
      }
    })

    get().persistState()
  },

  setTheme(theme) {
    if (theme != "light" && theme != "dark")
      return LOGGER.error(`Skip setting unknown theme: ${theme}`)

    get().partialUpdate({ theme })
  },

  setLocale(locale) {
    get().partialUpdate({ locale: resolveLocale(locale) })
  },

  setFont(font) {
    const current = get().userSettings.font
    const next: UserFontSettings = {
      arabic: {
        ...current.arabic,
        ...font.arabic,
      },
    }

    if (next.arabic.family && !(next.arabic.family in ArabicFonts))
      return LOGGER.error(`Skip setting unknown font: ${font}`)

    next.arabic.size = Number(String(next.arabic.size))
    if (Number.isNaN(next.arabic.size)) next.arabic.size = 42.5

    LOGGER.debug("Updating font to:", JSON.stringify(next))
    get().partialUpdate({ font: next })
  },

  setScrollPosition(chapterId, verse) {
    LOGGER.debug("Persisting scrol position to", chapterId, verse)
    get().partialUpdate({
      lastScroll: { chapterId, verse },
    })
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

  /**
   * Method to allow partial updates to the user settings
   * @param partial part of user settings data
   */
  partialUpdate(
    partial:
      | Partial<UserSettings>
      | ((current: UserSettings) => Partial<UserSettings>),
  ): void

  setTheme(theme: ThemeMode): void
  setLocale(locale: string): void
  setFont(font: DeepPartial<UserFontSettings>): void
  setScrollPosition(chapterId: number, verse: number): void
}

export interface FontSetting {
  family: ArabicFontFamily

  /**
   * Size of the font to be rendered in pixel
   */
  size: number
}

export interface UserFontSettings {
  arabic: FontSetting
}

export interface UserSettings {
  locale: Locale
  theme: ThemeMode
  font: UserFontSettings
  lastScroll: {
    chapterId: number
    verse: number
  }
}
