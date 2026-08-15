import { WordWithLexemeRecord } from "@constants/records/WordRecord"
import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import { create } from "zustand"

const useWordsState = create<WordsState>((set, get) => ({
  words: [],
  loadedChapters: new Set(),

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

    const chapterWords = unpackIPC(await repo.words.all({ chapterId }))
    // Don't cache as loaded if empty — the chapter may just not be
    // background-seeded yet, and a later call should retry rather than be
    // stuck believing it has no words.
    if (chapterWords.length === 0) return

    set((s) => ({
      words: [...s.words, ...chapterWords],
      loadedChapters: new Set(s.loadedChapters).add(chapterId),
    }))
  },
}))

export interface WordsState {
  words: WordWithLexemeRecord[]
  /** Chapter ids currently merged into `words`, so a chapter is never loaded twice. */
  loadedChapters: Set<number>
  /** Loads and merges one chapter's words, or every chapter's words if omitted. */
  loadWords: (chapterId?: number) => Promise<void>
}

export default useWordsState
