import {
  Bookmark,
  BookmarkCategory,
  BookmarkColor,
  BookmarkType,
} from "@constants/bookmark"
import { ArabicFontFamily, ArabicFonts } from "@constants/fonts"
import { HighlightColor } from "@constants/highlight"
import { WordTranslationOption } from "@constants/records/WordTranslationRecord"
import {
  BasmalaPosition,
  DEFAULT_LOCALE,
  Locale,
  ReadingStyle,
} from "@constants/settings"
import { ThemeMode } from "@constants/theme"
import { ThoughtSchool } from "@constants/ThoughtSchool"
import { resolveLocale } from "@i18n"
import { isPlainObject } from "@services/checker"
import LOGGER from "@services/Logger"
import { DeepPartial, mergeKnownKeys } from "@services/mutator"
import { create } from "zustand"
import useChaptersState from "./ChaptersState"

/**
 * Schema version of the persisted user settings. Bump this whenever the
 * `UserSettings` shape changes in a way that needs reconciling, so
 * `restoreState()` has a version to compare a persisted blob against
 * instead of discarding it outright.
 */
export const USER_SETTINGS_VERSION = 260708

const DEFAULT_USER_SETTINGS: UserSettings = {
  version: USER_SETTINGS_VERSION,
  locale: DEFAULT_LOCALE,
  theme: "light",
  basmalaPosition: BasmalaPosition.Detached,
  readingStyle: ReadingStyle.Detached,
  wbwTranslations: [WordTranslationOption.AmericanEnglish],
  showPageIndicator: true,
  alphabeticalChaptersSorting: false,
  showTransliteration: false,
  exegesis: [],
  hasSeenExegesisDialog: false,
  prostrationVersesSchools: [],
  font: {
    arabic: {
      family: "NotoNaskhArabic",
      size: 42.5,
    },
  },
  forceFit: false,
  bookmarks: {
    categories: {},
    list: {},
  },
  highlightedVerses: {},
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
    // same reason as bookmarks above — mergeKnownKeys can't merge new keys into {}
    hydrated.highlightedVerses = parsed.highlightedVerses ?? {}
    // Reconciliation point for future migrations: branch on `parsed.version`
    // here before stamping forward, once the schema actually needs one.
    hydrated.version = USER_SETTINGS_VERSION

    set({
      userSettings: hydrated,
    })

    // normalize localStorage to the current schema immediately
    get().persistState()

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

  setReadingStyle(readingStyle) {
    get().partialUpdate({ readingStyle })
  },

  setShowPageIndicator(show) {
    get().partialUpdate({ showPageIndicator: !!show })
  },

  setAlphabeticalChaptersSorting(sort) {
    get().partialUpdate({ alphabeticalChaptersSorting: !!sort })
  },

  setShowTransliteration(show) {
    get().partialUpdate({ showTransliteration: !!show })
  },

  setForceFit(forceFit) {
    get().partialUpdate({ forceFit: !!forceFit })
  },

  setExegesis(ids) {
    get().partialUpdate({ exegesis: ids })
  },

  setProstrationVersesSchools(schools) {
    get().partialUpdate({ prostrationVersesSchools: schools })
  },

  setHasSeenExegesisDialog(seen) {
    get().partialUpdate({ hasSeenExegesisDialog: !!seen })
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
    if (!useChaptersState.getState().isValidVerse(chapterId, verseNumber))
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

      // omitted fields fall back to the existing record, so re-bookmarking never wipes a note/color
      if (!isPlainObject(bookmarks.list)) bookmarks.list = {}
      const existing = bookmarks.list[verseKey]
      bookmarks = {
        ...bookmarks,
        list: {
          ...bookmarks.list,
          [verseKey]: {
            type: BookmarkType.Verse,
            key: verseKey,
            addedAt: existing?.addedAt ?? Date.now(),
            category: usedCategory.id,
            note:
              "note" in args
                ? note
                  ? String(note)
                  : undefined
                : existing?.note,
            color:
              "color" in args
                ? color
                  ? Number(color)
                  : BookmarkColor.Gray
                : (existing?.color ?? BookmarkColor.Gray),
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

  highlightVerse(verseKey, color) {
    const validKeyFormat = /^\d{1,3}:\d{1,3}$/.test(verseKey)
    if (!validKeyFormat) throw new Error("Unexpected verse key: " + verseKey)
    const [chapterId, verseNumber] = verseKey.split(":")
    if (!useChaptersState.getState().isValidVerse(chapterId, verseNumber))
      throw new Error(`Verse ${verseKey} not found`)

    try {
      const userSettings = get().userSettings
      const highlightedVerses = isPlainObject(userSettings.highlightedVerses)
        ? userSettings.highlightedVerses
        : {}

      get().partialUpdate({
        highlightedVerses: {
          ...highlightedVerses,
          [verseKey]: color,
        },
      })
      return true
    } catch (e) {
      LOGGER.error("Failed highlighting verse", e)
      return false
    }
  },

  removeHighlight(verseKey) {
    const { [verseKey]: _removed, ...rest } = isPlainObject(
      get().userSettings.highlightedVerses,
    )
      ? get().userSettings.highlightedVerses
      : {}

    get().partialUpdate({ highlightedVerses: rest })
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
  setReadingStyle(readingStyle: ReadingStyle): void
  setShowPageIndicator(show: boolean): void
  setAlphabeticalChaptersSorting(sort: boolean): void
  setShowTransliteration(show: boolean): void
  setForceFit(forceFit: boolean): void
  setExegesis(ids: string[]): void
  setProstrationVersesSchools(schools: ThoughtSchool[]): void
  setHasSeenExegesisDialog(seen: boolean): void
  setWordByWordTranslations(wbwTranslation: WordTranslationOption[]): void
  setScrollPosition(chapterId: number, verse: number): void

  // bookmark related
  bookmarkVerse(args: BookmarkVerseFunctionArgs): boolean

  // highlight related
  highlightVerse(verseKey: string, color: HighlightColor): boolean
  removeHighlight(verseKey: string): void
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
  /** Schema version of this persisted blob; see `USER_SETTINGS_VERSION`. */
  version: number

  locale: Locale
  theme: ThemeMode
  font: UserFontSettings

  /**
   * Whether to show page indicator so user knows which part and page they are in
   */
  showPageIndicator: boolean

  /**
   * Whether to sort the chapter lookup list alphabetically by transliterated
   * name (ignoring leading definite-article prefixes like "Al-"/"An-")
   * instead of natural chapter-id order
   */
  alphabeticalChaptersSorting: boolean

  /**
   * Whether to show each word's transliteration alongside the Arabic text,
   * both in the main QuranPaper view and the exegesis dialog's interlinear pane
   */
  showTransliteration: boolean

  /** Whether to shrink the font till the whole page fits the Mushaf frame */
  forceFit: boolean

  /**
   * IDs of the exegeses the user has activated (e.g. ["aliquli/en-US"]).
   * Multiple exegeses can be active at the same time.
   */
  exegesis: string[]

  /** Whether ever seen exegesis paper dialog. Used to set default exegesis selection. */
  hasSeenExegesisDialog: boolean

  /** According to which juristic schools the sajdah-verses-to-be-marked are */
  prostrationVersesSchools: ThoughtSchool[]

  /**
   * To record bookmarks
   */
  bookmarks: {
    categories: Record<string, BookmarkCategory>
    list: Record<string, Bookmark>
  }

  /**
   * Highlighted verses, keyed by "chapterId:verseNumber", valued by the
   * `HighlightColor` chosen for that verse.
   */
  highlightedVerses: Record<string, HighlightColor>

  basmalaPosition: BasmalaPosition
  readingStyle: ReadingStyle

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
