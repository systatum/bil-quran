import { WordWithLexemeRecord } from "@constants/records/WordRecord"
import { repo } from "@db/repo"
import { ensureChapterSeeded } from "@db/seeders"
import { unpackIPC } from "@services/Converter"
import { create } from "zustand"
import useChaptersState from "./ChaptersState"

const useWordsState = create<WordsState>((set, get) => ({
  words: [],
  loadedChapters: new Set(),
  loadingChapters: new Set(),

  async loadWords(chapterId) {
    if (chapterId == null) {
      const words = unpackIPC(await repo.words.all({}))
      set({
        words,
        loadedChapters: new Set(words.map((w) => w.chapterId)),
      })
      return
    }

    if (get().loadedChapters.has(chapterId)) return
    if (get().loadingChapters.has(chapterId)) return

    set((s) => ({
      loadingChapters: new Set(s.loadingChapters).add(chapterId),
    }))

    try {
      const { chapters } = useChaptersState.getState()
      await ensureChapterSeeded(chapterId, chapters)

      const chapterWords = unpackIPC(await repo.words.all({ chapterId }))
      set((s) => ({
        words: [...s.words, ...chapterWords],
        loadedChapters: new Set(s.loadedChapters).add(chapterId),
      }))
    } finally {
      set((s) => {
        const loadingChapters = new Set(s.loadingChapters)
        loadingChapters.delete(chapterId)
        return { loadingChapters }
      })
    }
  },
}))

export interface WordsState {
  words: WordWithLexemeRecord[]
  /** Chapter ids currently merged into `words`, so a chapter is never loaded twice. */
  loadedChapters: Set<number>
  /** Chapter ids currently being seeded/loaded on demand. */
  loadingChapters: Set<number>
  /** Loads and merges one chapter's words, or every chapter's words if omitted. */
  loadWords: (chapterId?: number) => Promise<void>
}

export default useWordsState
