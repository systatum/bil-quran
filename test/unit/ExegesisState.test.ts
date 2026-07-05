/**
 * @jest-environment jsdom
 */

// checker.ts transitively pulls in the browser DB stack — mock it out
jest.mock("@services/checker", () => ({ isPlainObject: jest.fn() }))

jest.mock("@constants/assets", () => ({
  Asset: {
    exegesisOf: jest.fn().mockReturnValue({
      name: "AliQuli",
      path: "/quran/exegesis/aliquli",
      availableLocales: ["en-US"],
    }),
    exegesisAssetUrlOf: jest
      .fn()
      .mockReturnValue("/quran/exegesis/aliquli/en-US/1.json"),
  },
}))

jest.mock("@services/fingerprinter", () => ({
  FingerprintedAsset: { readJson: jest.fn() },
  isAssetCurrent: jest.fn(),
  saveFingerprints: jest.fn(),
}))

jest.mock("@db/repo", () => ({
  repo: {
    exegesis: {
      findAllBy: jest.fn(),
      create: jest.fn(),
      markChapter: jest.fn(),
      unmarkChapter: jest.fn(),
    },
    exegesisContent: {
      findByChapter: jest.fn(),
      createBulk: jest.fn(),
    },
  },
}))

jest.mock("@services/Logger", () => ({
  __esModule: true,
  default: { error: jest.fn(), debug: jest.fn() },
}))

import { act, renderHook } from "@testing-library/react"
import { Asset } from "@constants/assets"
import { ExegesisChapterAsset } from "@constants/records/ExegesisRecord"
import {
  FingerprintedAsset,
  isAssetCurrent,
  saveFingerprints,
} from "@services/fingerprinter"
import { repo } from "@db/repo"
import useExegesisState from "@hooks/states/ExegesisState"

const mockFindAllBy = repo.exegesis.findAllBy as jest.MockedFunction<
  typeof repo.exegesis.findAllBy
>
const mockFindByChapter = repo.exegesisContent
  .findByChapter as jest.MockedFunction<
  typeof repo.exegesisContent.findByChapter
>
const mockIsAssetCurrent = isAssetCurrent as jest.MockedFunction<
  typeof isAssetCurrent
>
const mockReadJson = FingerprintedAsset.readJson as jest.MockedFunction<
  typeof FingerprintedAsset.readJson
>

const EXEGESIS_ID = "aliquli/en-US"
const CHAPTER_ID = 1
const VERSE = 1

const CHAPTER_ASSET: ExegesisChapterAsset = {
  chapterId: CHAPTER_ID,
  description: "Test",
  footnotes: {},
  translations: { [VERSE]: "In the name of God" },
}

const DB_CONTENT = {
  succeed: true,
  data: { [VERSE]: { translation: "Cached verse", footnotes: {} } },
}

function existingRecord(downloadedChapters: number[] = []) {
  return { succeed: true, data: [{ id: EXEGESIS_ID, downloadedChapters }] }
}

beforeEach(() => {
  jest.clearAllMocks()
  // re-establish Asset mocks (clearAllMocks wipes mockReturnValue)
  ;(Asset.exegesisOf as jest.Mock).mockReturnValue({
    name: "AliQuli",
    path: "/quran/exegesis/aliquli",
    availableLocales: ["en-US"],
  })
  ;(Asset.exegesisAssetUrlOf as jest.Mock).mockReturnValue(
    "/quran/exegesis/aliquli/en-US/1.json",
  )
  // reset store state between tests
  useExegesisState.setState({ exegesis: {} })
  mockReadJson.mockResolvedValue(CHAPTER_ASSET as any)
  ;(repo.exegesis.markChapter as jest.Mock).mockResolvedValue(undefined)
  ;(repo.exegesis.unmarkChapter as jest.Mock).mockResolvedValue(undefined)
  ;(repo.exegesisContent.createBulk as jest.Mock).mockResolvedValue({
    succeed: true,
  })
})

describe("ExegesisState.loadChapter", () => {
  describe("downloaded and recent", () => {
    beforeEach(() => {
      // first call: ensureMetadata (record exists → early return)
      // second call: loadChapter checks downloadedChapters
      mockFindAllBy
        .mockResolvedValueOnce(existingRecord([CHAPTER_ID]) as any)
        .mockResolvedValueOnce(existingRecord([CHAPTER_ID]) as any)
      mockIsAssetCurrent.mockResolvedValue(true)
      mockFindByChapter.mockResolvedValue(DB_CONTENT as any)
    })

    it("serves verse content from DB", async () => {
      const { result } = renderHook(() => useExegesisState())
      await act(async () => {
        await result.current.loadChapter(EXEGESIS_ID, CHAPTER_ID)
      })
      expect(
        result.current.getVerseExegesis(EXEGESIS_ID, CHAPTER_ID, VERSE),
      ).toEqual({ translation: "Cached verse", footnotes: {} })
    })

    it("does not fetch the chapter JSON", async () => {
      const { result } = renderHook(() => useExegesisState())
      await act(async () => {
        await result.current.loadChapter(EXEGESIS_ID, CHAPTER_ID)
      })
      expect(mockReadJson).not.toHaveBeenCalled()
    })

    it("does not call markChapter or unmarkChapter", async () => {
      const { result } = renderHook(() => useExegesisState())
      await act(async () => {
        await result.current.loadChapter(EXEGESIS_ID, CHAPTER_ID)
      })
      expect(repo.exegesis.markChapter).not.toHaveBeenCalled()
      expect(repo.exegesis.unmarkChapter).not.toHaveBeenCalled()
    })
  })

  describe("downloaded but not recent (fingerprint drift)", () => {
    beforeEach(() => {
      mockFindAllBy
        .mockResolvedValueOnce(existingRecord([CHAPTER_ID]) as any)
        .mockResolvedValueOnce(existingRecord([CHAPTER_ID]) as any)
      mockIsAssetCurrent.mockResolvedValue(false)
    })

    it("evicts then re-downloads", async () => {
      const { result } = renderHook(() => useExegesisState())
      await act(async () => {
        await result.current.loadChapter(EXEGESIS_ID, CHAPTER_ID)
      })
      expect(repo.exegesis.unmarkChapter).toHaveBeenCalledWith(
        EXEGESIS_ID,
        CHAPTER_ID,
      )
      expect(mockReadJson).toHaveBeenCalled()
      expect(repo.exegesis.markChapter).toHaveBeenCalledWith(
        EXEGESIS_ID,
        CHAPTER_ID,
      )
    })

    it("populates state with freshly fetched content", async () => {
      const { result } = renderHook(() => useExegesisState())
      await act(async () => {
        await result.current.loadChapter(EXEGESIS_ID, CHAPTER_ID)
      })
      expect(
        result.current.getVerseExegesis(EXEGESIS_ID, CHAPTER_ID, VERSE),
      ).toEqual({ translation: "In the name of God", footnotes: {} })
    })
  })

  describe("not yet downloaded", () => {
    beforeEach(() => {
      mockFindAllBy
        .mockResolvedValueOnce(existingRecord([]) as any)
        .mockResolvedValueOnce(existingRecord([]) as any)
      mockIsAssetCurrent.mockResolvedValue(false)
    })

    it("downloads and marks without evicting", async () => {
      const { result } = renderHook(() => useExegesisState())
      await act(async () => {
        await result.current.loadChapter(EXEGESIS_ID, CHAPTER_ID)
      })
      expect(repo.exegesis.unmarkChapter).not.toHaveBeenCalled()
      expect(mockReadJson).toHaveBeenCalled()
      expect(repo.exegesis.markChapter).toHaveBeenCalledWith(
        EXEGESIS_ID,
        CHAPTER_ID,
      )
    })

    it("saves fingerprints after download", async () => {
      const { result } = renderHook(() => useExegesisState())
      await act(async () => {
        await result.current.loadChapter(EXEGESIS_ID, CHAPTER_ID)
      })
      expect(saveFingerprints).toHaveBeenCalledWith({ merge: true })
    })

    it("populates state with downloaded content", async () => {
      const { result } = renderHook(() => useExegesisState())
      await act(async () => {
        await result.current.loadChapter(EXEGESIS_ID, CHAPTER_ID)
      })
      expect(
        result.current.getVerseExegesis(EXEGESIS_ID, CHAPTER_ID, VERSE),
      ).toEqual({ translation: "In the name of God", footnotes: {} })
    })
  })
})
