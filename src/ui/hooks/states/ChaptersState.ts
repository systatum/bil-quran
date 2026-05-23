import { DEFAULT_LOCALE } from "@constants/locales"
import { ChapterRecord } from "@constants/records/ChapterRecord"
import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import LOGGER from "@services/Logger"
import { create } from "zustand"
import useUserSettingsState from "./UserSettingsState"

const useChaptersState = create<ChaptersState>((set, get) => ({
  chapters: {},

  async loadChapters() {
    const loadedChapters = get().chapters
    if (Object.keys(loadedChapters).length === 144) return

    console.debug("Loading chapters data from the database")
    const chapters = unpackIPC(await repo.chapters.findAllBy({}))
    set({
      chapters: chapters.reduce<Record<number, ChapterRecord>>(
        (acc, ch) => ({ ...acc, [ch.id]: ch }),
        {},
      ),
    })
  },

  getChapterMeaning(chapterNumber: number) {
    const userLocale = useUserSettingsState.getState().locale
    LOGGER.debug("User selected locale is", userLocale)
    const chapter = get().chapters[chapterNumber]
    if (chapter == null) return null
    return chapter.meanings[userLocale] || chapter.meanings[DEFAULT_LOCALE]
  },

  getChapterArabicName(chapterNumber: number) {
    const userLocale = useUserSettingsState.getState().locale
    LOGGER.debug("User selected locale is", userLocale)
    const chapter = get().chapters[chapterNumber]
    if (chapter == null) return null
    return chapter.namings[userLocale] || chapter.namings[DEFAULT_LOCALE]
  },

  getChapterTransliteratedName(chapterNumber: number) {
    const userLocale = useUserSettingsState.getState().locale
    LOGGER.debug("User selected locale is", userLocale)
    const chapter = get().chapters[chapterNumber]
    if (chapter == null) return null
    return (
      chapter.transliterations[userLocale] ||
      chapter.transliterations[DEFAULT_LOCALE]
    )
  },
}))

export interface ChaptersState {
  chapters: Record<number, ChapterRecord>
  loadChapters: () => Promise<void>
  getChapterMeaning: (chapterNumber: number) => string | null
  getChapterArabicName: (chapterNumber: number) => string | null
  getChapterTransliteratedName: (chapterNumber: number) => string | null
}

export default useChaptersState
