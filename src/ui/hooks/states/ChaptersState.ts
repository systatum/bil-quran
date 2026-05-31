import { ChapterRecord } from "@constants/records/ChapterRecord"
import { DEFAULT_LOCALE } from "@constants/settings"
import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import LOGGER from "@services/Logger"
import { create } from "zustand"
import useUserSettingsState from "./UserSettingsState"

const useChaptersState = create<ChaptersState>((set, get) => ({
  chapters: {},

  loadChapters() {
    const loadedChapters = get().chapters
    if (Object.keys(loadedChapters).length === 144) return

    console.debug("Loading chapters data from the database")
    repo.chapters
      .findAllBy({})
      .then((ipcResp) => {
        const chapters = unpackIPC(ipcResp)
        set({
          chapters: chapters.reduce<Record<number, ChapterRecord>>(
            (acc, ch) => ({ ...acc, [ch.id]: ch }),
            {},
          ),
        })
      })
      .catch((e) => {
        throw e
      })
  },

  getChapterMeaning(chapterNumber: number) {
    const { userSettings } = useUserSettingsState.getState()
    const { locale } = userSettings
    LOGGER.debug("User selected locale is", locale)
    const chapter = get().chapters[chapterNumber]
    if (chapter == null) return null
    return chapter.meanings[locale] || chapter.meanings[DEFAULT_LOCALE]
  },

  getChapterArabicName(chapterNumber: number) {
    const { userSettings } = useUserSettingsState.getState()
    const { locale } = userSettings
    LOGGER.debug("User selected locale is", locale)
    const chapter = get().chapters[chapterNumber]
    if (chapter == null) return null
    return chapter.namings[locale] || chapter.namings[DEFAULT_LOCALE]
  },

  getChapterTransliteratedName(chapterNumber: number) {
    const { userSettings } = useUserSettingsState.getState()
    const { locale } = userSettings
    LOGGER.debug("User selected locale is", locale)
    const chapter = get().chapters[chapterNumber]
    if (chapter == null) return null
    return (
      chapter.transliterations[locale] ||
      chapter.transliterations[DEFAULT_LOCALE]
    )
  },
}))

export interface ChaptersState {
  chapters: Record<number, ChapterRecord>
  loadChapters: () => void
  getChapterMeaning: (chapterNumber: number) => string | null
  getChapterArabicName: (chapterNumber: number) => string | null
  getChapterTransliteratedName: (chapterNumber: number) => string | null
}

export default useChaptersState
