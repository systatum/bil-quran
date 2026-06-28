import {
  Bookmark,
  BookmarkCategory,
  BookmarkColor,
  BookmarkType,
} from "@constants/bookmark"
import { ArabicFontFamily, ArabicFonts } from "@constants/fonts"
import { WordTranslationOption } from "@constants/records/WordTranslationRecord"
import { BasmalaPosition, DEFAULT_LOCALE, Locale } from "@constants/settings"
import { ThemeMode } from "@constants/theme"
import { resolveLocale } from "@i18n"
import { isPlainObject, isValidVerse } from "@services/checker"
import LOGGER from "@services/Logger"
import { DeepPartial, mergeKnownKeys } from "@services/mutator"
import { create } from "zustand"

const DEFAULT_USER_SETTINGS: UserSettings = {
  locale: DEFAULT_LOCALE,
  theme: "light",
  basmalaPosition: BasmalaPosition.Detached,
  wbwTranslations: [WordTranslationOption.AmericanEnglish],
  showPageIndicator: false,
  font: {
    arabic: {
      family: "NotoNaskhArabic",
      size: 42.5,
    },
  },
  bookmarks: {
    categories: {},
    list: {},
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

    const parsed: UserSettings = JSON.parse(raw)
    const current = get().userSettings
    const hydrated = mergeKnownKeys(current, parsed) as UserSettings
    hydrated.bookmarks = parsed.bookmarks

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

  setBasmalaPosition(basmalaPosition) {
    get().partialUpdate({ basmalaPosition })
  },

  setWordByWordTranslations(wbwTranslations) {
    get().partialUpdate({ wbwTranslations })
  },

  setScrollPosition(chapterId, verse) {
    LOGGER.debug("Persisting scrol position to", chapterId, verse)
    get().partialUpdate({
      lastScroll: { chapterId, verse },
    })
  },

  bookmarkVerse(args) {
    const { verseKey, note, category, color } = args
    const userSettings = get().userSettings
    let bookmarks = userSettings.bookmarks

    // ensure data is always in proper shape
    if (!isPlainObject(bookmarks)) bookmarks = { categories: {}, list: {} }
    if (!isPlainObject(bookmarks.categories)) bookmarks.categories = {}
    if (!isPlainObject(bookmarks.list)) bookmarks.list = {}

    // TODO: each must be tested:
    // Validate regex of verseKey
    const validKeyFormat = /^\d{1,3}:\d{1,3}$/.test(verseKey)
    if (!validKeyFormat) throw new Error("Unexpected verse key: " + verseKey)
    // Check that chapterId and verseNumber is indeed a proper number
    const [chapterId, verseNumber] = verseKey.split(":")
    if (!isValidVerse(chapterId, verseNumber))
      throw new Error(`Verse ${verseKey} not found`)

    // TODO: cannot bookmark an existing verse twice

    try {
      // get the default category
      let usedCategory: BookmarkCategory | undefined = category
      if (usedCategory == null) {
        // the category at index 0 is the default
        usedCategory = bookmarks.categories["default"]
        if (usedCategory == null) {
          usedCategory = {
            id: "default",
            name: "Default",
          }
          LOGGER.debug("Creating a new category: ", usedCategory)

          bookmarks = {
            ...bookmarks,
            categories: {
              ...bookmarks.categories,
              [usedCategory.id]: usedCategory,
            },
          }
        } else {
          LOGGER.debug("Adding to an existing category: ", usedCategory)
        }
      }

      // add bookmark
      if (!isPlainObject(bookmarks.list)) bookmarks.list = {}
      bookmarks = {
        ...bookmarks,
        list: {
          ...bookmarks.list,
          [verseKey]: {
            type: BookmarkType.Verse,
            key: verseKey,
            addedAt: Date.now(),
            category: usedCategory.id,
            note: note ? String(note) : undefined,
            color: color ? Number(color) : BookmarkColor.Gray,
          },
        },
      }

      get().partialUpdate({ bookmarks })
      return true
    } catch (e) {
      LOGGER.error("Failed bookmarking", e)
      return false
    }
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
  setBasmalaPosition(basmalaPosition: BasmalaPosition): void
  setWordByWordTranslations(wbwTranslation: WordTranslationOption[]): void
  setScrollPosition(chapterId: number, verse: number): void

  // bookmark related
  bookmarkVerse(args: BookmarkVerseFunctionArgs): boolean
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

  /**
   * Whether to show page indicator so user knows which part and page they are in
   */
  showPageIndicator: boolean

  /**
   * To record bookmarks
   */
  bookmarks: {
    categories: Record<string, BookmarkCategory>
    list: Record<string, Bookmark>
  }

  basmalaPosition: BasmalaPosition

  /**
   * Which language is going to be used for showing word-by-word translation
   */
  wbwTranslations: WordTranslationOption[]

  /**
   * To restore to last scroll position
   */
  lastScroll: {
    chapterId: number
    verse: number
  }
}

export interface BookmarkVerseFunctionArgs {
  verseKey: string
  note?: string
  category?: BookmarkCategory
  color?: BookmarkColor
}
