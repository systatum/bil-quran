import { WordWithLexemeRecord } from "@constants/records/WordRecord"
import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import { create } from "zustand"

const useWordsState = create<WordsState>((set, get) => ({
  words: [],

  async loadWords() {
    const words = unpackIPC(await repo.words.all({}))
    set({ words })
  },
}))

export interface WordsState {
  words: WordWithLexemeRecord[]
  loadWords: () => Promise<void>
}

export default useWordsState
