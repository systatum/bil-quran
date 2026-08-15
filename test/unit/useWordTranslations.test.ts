import { WordWithLexemeRecord } from "@constants/records/WordRecord"
import { renderHook } from "@testing-library/react"

jest.mock("@hooks/states/AppState", () => ({
  __esModule: true,
  default: () => ({
    pushError: jest.fn(),
    setIsVersesLoaded: jest.fn(),
  }),
}))

// A stable object, like the real zustand store, since useTranslatedWords
// keys its memo on this reference to detect real translation-data changes.
const mockCorpora = {}
jest.mock("@hooks/states/TranslationsState", () => ({
  __esModule: true,
  default: () => ({
    corpora: mockCorpora,
    getCorpus: jest.fn(),
  }),
}))

jest.mock("@hooks/tools/useToast", () => ({
  __esModule: true,
  default: () => ({ errorToast: jest.fn() }),
}))

// useWordTranslations.ts also imports useWordsState (for useWords, unused by
// the tests here) which pulls in @db/repo, an ESM/sql.js dependency jest
// can't transform.
jest.mock("@hooks/states/WordsState", () => ({
  __esModule: true,
  default: () => ({ words: [], loadedChapters: new Set(), loadWords: jest.fn() }),
}))

jest.mock("@services/Logger", () => ({
  __esModule: true,
  default: { error: jest.fn(), debug: jest.fn() },
}))

import { useTranslatedWords } from "@hooks/tools/useWordTranslations"

// Stable reference across renders, like a real caller's locales list would be.
const NO_LOCALES: never[] = []

function makeWord(
  chapterId: number,
  verse: number,
  order: number,
): WordWithLexemeRecord {
  return {
    chapterId,
    verse,
    order,
    partNumber: 0,
    lexemeId: 0,
    renderingId: 0,
    token: `${chapterId}:${verse}:${order}`,
    root: {} as WordWithLexemeRecord["root"],
    readings: {},
  }
}

describe("useTranslatedWords", () => {
  it("translates every word on the first render", () => {
    const words = [makeWord(1, 1, 1), makeWord(1, 1, 2)]

    const { result } = renderHook(() => useTranslatedWords(words, NO_LOCALES))

    expect(result.current.map((w) => w.token)).toEqual(
      words.map((w) => w.token),
    )
  })

  describe("when words grows by appending (background chapter merge)", () => {
    it("reuses the previous cells and only translates the new tail", () => {
      const chapter1 = [makeWord(1, 1, 1), makeWord(1, 1, 2)]
      const chapter2 = [makeWord(2, 1, 1)]
      const grown = [...chapter1, ...chapter2]

      const { result, rerender } = renderHook(
        ({ words }) => useTranslatedWords(words, NO_LOCALES),
        { initialProps: { words: chapter1 } },
      )
      const firstCells = result.current

      rerender({ words: grown })

      // Every cell carried over from the first render is the exact same
      // object, not a freshly computed one.
      expect(result.current[0]).toBe(firstCells[0])
      expect(result.current[1]).toBe(firstCells[1])
      expect(result.current.map((w) => w.token)).toEqual(
        grown.map((w) => w.token),
      )
    })
  })

  describe("when a filtered/scoped view sees no new words", () => {
    it("returns the exact same array reference as before", () => {
      const words = [makeWord(1, 1, 1)]

      const { result, rerender } = renderHook(
        ({ words }) => useTranslatedWords(words, NO_LOCALES),
        { initialProps: { words } },
      )
      const firstResult = result.current

      // Same length, same first element (e.g. an unrelated chapter merged
      // into the store while this view stayed scoped to chapter 1).
      rerender({ words: [...words] })

      expect(result.current).toBe(firstResult)
    })
  })

  describe("when words is replaced rather than appended", () => {
    it("retranslates everything", () => {
      const original = [makeWord(1, 1, 1)]
      const replaced = [makeWord(5, 1, 1)]

      const { result, rerender } = renderHook(
        ({ words }) => useTranslatedWords(words, NO_LOCALES),
        { initialProps: { words: original } },
      )

      rerender({ words: replaced })

      expect(result.current.map((w) => w.token)).toEqual(
        replaced.map((w) => w.token),
      )
    })
  })
})
