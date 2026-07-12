import { ChapterRecord } from "@constants/records/ChapterRecord"
import { DEFAULT_LOCALE } from "@constants/settings"
import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
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

  getChapter(arg) {
    const chapterNumber = Number(String(arg))
    const chapter = get().chapters[chapterNumber]
    if (chapter == null) throw new Error(`Chapter '${chapterNumber}' not found`)
    return chapter
  },

  getChapterMeaning(chapterNumber: number) {
    const { userSettings } = useUserSettingsState.getState()
    const { locale } = userSettings
    const chapter = get().getChapter(chapterNumber)
    if (chapter == null) return null
    return chapter.meanings[locale] || chapter.meanings[DEFAULT_LOCALE]
  },

  getChapterArabicName(chapterNumber: number) {
    const { userSettings } = useUserSettingsState.getState()
    const { locale } = userSettings
    const chapter = get().getChapter(chapterNumber)
    if (chapter == null) return null
    return chapter.namings[locale] || chapter.namings[DEFAULT_LOCALE]
  },

  getChapterTransliteratedName(chapterNumber: number) {
    const { userSettings } = useUserSettingsState.getState()
    const { locale } = userSettings
    const chapter = get().getChapter(chapterNumber)
    if (chapter == null) return null
    return (
      chapter.transliterations[locale] ||
      chapter.transliterations[DEFAULT_LOCALE]
    )
  },

  isValidVerse(chapterId, verseNumber) {
    try {
      const chapterNumber = Number(String(chapterId))
      const verse = Number(String(verseNumber))
      if (!Number.isInteger(chapterNumber) || !Number.isInteger(verse))
        return false

      const chapter = get().getChapter(chapterNumber)
      return chapter.partitioning.some(
        ({ start, end }) => verse >= start && verse <= end,
      )
    } catch {
      return false
    }
  },
}))

export interface ChaptersState {
  chapters: Record<number, ChapterRecord>
  loadChapters: () => void
  getChapter: (chapterNumber: number | string) => ChapterRecord
  getChapterMeaning: (chapterNumber: number) => string | null
  getChapterArabicName: (chapterNumber: number) => string | null
  getChapterTransliteratedName: (chapterNumber: number) => string | null
  isValidVerse: (
    chapterId: string | number,
    verseNumber: string | number,
  ) => boolean
}

export default useChaptersState
