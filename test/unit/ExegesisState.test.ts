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
      deleteChapter: jest.fn(),
    },
  },
}))

jest.mock("@services/Logger", () => ({
  __esModule: true,
  default: { error: jest.fn(), debug: jest.fn() },
}))

import { Asset } from "@constants/assets"
import { ExegesisChapterAsset } from "@constants/records/ExegesisRecord"
import { repo } from "@db/repo"
import useExegesisState from "@hooks/states/ExegesisState"
import {
  FingerprintedAsset,
  isAssetCurrent,
  saveFingerprints,
} from "@services/fingerprinter"
import { act, renderHook } from "@testing-library/react"

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

function existingRecord(
  downloadedChapters: number[] = [],
  description: Record<string, string> = {},
) {
  return {
    succeed: true,
    data: [{ id: EXEGESIS_ID, downloadedChapters, description }],
  }
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
  ;(repo.exegesisContent.deleteChapter as jest.Mock).mockResolvedValue({
    succeed: true,
  })
})

describe("getShortDesc", () => {
  const EN = "en-US"
  const ID = "id-ID"
  const AR = "ar-IQ"

  function withDesc(description: Record<string, string>) {
    // Both calls in getShortDesc (ensureMetadata + findAllBy) return the same record
    mockFindAllBy.mockResolvedValue(existingRecord([], description) as any)
  }

  it("returns the description for the requested locale", async () => {
    withDesc({ [EN]: "English desc", [ID]: "Deskripsi" })
    const { result } = renderHook(() => useExegesisState())
    await expect(
      result.current.getShortDesc(EXEGESIS_ID, ID as any),
    ).resolves.toBe("Deskripsi")
  })

  it("falls back to English when the requested locale is absent", async () => {
    withDesc({ [EN]: "English desc" })
    const { result } = renderHook(() => useExegesisState())
    await expect(
      result.current.getShortDesc(EXEGESIS_ID, AR as any),
    ).resolves.toBe("English desc")
  })

  it("falls back to any available locale when both requested and English are absent", async () => {
    withDesc({ [ID]: "Deskripsi" })
    const { result } = renderHook(() => useExegesisState())
    await expect(
      result.current.getShortDesc(EXEGESIS_ID, AR as any),
    ).resolves.toBe("Deskripsi")
  })

  it("returns empty string when description is empty", async () => {
    withDesc({})
    const { result } = renderHook(() => useExegesisState())
    await expect(
      result.current.getShortDesc(EXEGESIS_ID, EN as any),
    ).resolves.toBe("")
  })

  it("returns empty string when no DB record exists", async () => {
    // No record ever appears (even after ensureMetadata's create attempt),
    // so about.json still needs a valid shape for ensureMetadata to parse
    // without throwing before getShortDesc falls through to "".
    mockFindAllBy.mockResolvedValue({ succeed: true, data: [] } as any)
    mockReadJson.mockResolvedValue({
      name: "Tafsir AliQuli",
      thought: "shia-jafari",
      authors: {},
      locNames: {},
      about: {},
      source: "https://example.com",
    } as any)

    const { result } = renderHook(() => useExegesisState())
    await expect(
      result.current.getShortDesc(EXEGESIS_ID, EN as any),
    ).resolves.toBe("")
  })
})

describe("ensureMetadata", () => {
  it("does not insert when another concurrent call already created the record during the about.json fetch", async () => {
    // Simulate the race: first check returns empty, but by the time about.json
    // is fetched the row already exists (inserted by a concurrent call).
    mockFindAllBy
      .mockResolvedValueOnce({ succeed: true, data: [] } as any) // initial check: empty
      .mockResolvedValueOnce(existingRecord([]) as any) // after-fetch re-check: row exists
      .mockResolvedValueOnce(existingRecord([]) as any) // loadChapter downloadedChapters check
    mockIsAssetCurrent.mockResolvedValue(true)
    mockFindByChapter.mockResolvedValue(DB_CONTENT as any)

    const { result } = renderHook(() => useExegesisState())
    await act(async () => {
      await result.current.loadChapter(EXEGESIS_ID, CHAPTER_ID)
    })

    expect(repo.exegesis.create).not.toHaveBeenCalled()
  })
})

describe("downloadChapter", () => {
  beforeEach(() => {
    // Record exists so ensureMetadata exits early on all calls (one findAllBy each)
    mockFindAllBy.mockResolvedValue(existingRecord([]) as any)
    mockIsAssetCurrent.mockResolvedValue(false)
  })

  it("runs createBulk exactly once when two loadChapter calls race for the same chapter", async () => {
    const { result } = renderHook(() => useExegesisState())
    await act(async () => {
      // Fire both concurrently — they should coalesce onto one download
      await Promise.all([
        result.current.loadChapter(EXEGESIS_ID, CHAPTER_ID),
        result.current.loadChapter(EXEGESIS_ID, CHAPTER_ID),
      ])
    })

    expect(repo.exegesisContent.createBulk).toHaveBeenCalledTimes(1)
    expect(repo.exegesisContent.deleteChapter).toHaveBeenCalledTimes(1)
  })
})

describe("loadChapter", () => {
  describe("when downloaded and recent", () => {
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

    it("deletes stale content rows before re-downloading to prevent UNIQUE constraint errors", async () => {
      const { result } = renderHook(() => useExegesisState())
      await act(async () => {
        await result.current.loadChapter(EXEGESIS_ID, CHAPTER_ID)
      })
      expect(repo.exegesisContent.deleteChapter).toHaveBeenCalledWith(
        EXEGESIS_ID,
        CHAPTER_ID,
      )
      // deleteChapter must run before createBulk
      const deleteOrder = (repo.exegesisContent.deleteChapter as jest.Mock).mock
        .invocationCallOrder[0]
      const insertOrder = (repo.exegesisContent.createBulk as jest.Mock).mock
        .invocationCallOrder[0]
      expect(deleteOrder).toBeLessThan(insertOrder)
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
      ).toEqual({
        translation: "In the name of God",
        exegesis: null,
        footnotes: {},
      })
    })
  })

  describe("when not yet downloaded", () => {
    beforeEach(() => {
      mockFindAllBy
        .mockResolvedValueOnce(existingRecord([]) as any)
        .mockResolvedValueOnce(existingRecord([]) as any)
      mockIsAssetCurrent.mockResolvedValue(false)
    })

    it("deletes any orphaned rows before inserting to guard against interrupted previous downloads", async () => {
      const { result } = renderHook(() => useExegesisState())
      await act(async () => {
        await result.current.loadChapter(EXEGESIS_ID, CHAPTER_ID)
      })
      expect(repo.exegesisContent.deleteChapter).toHaveBeenCalledWith(
        EXEGESIS_ID,
        CHAPTER_ID,
      )
      const deleteOrder = (repo.exegesisContent.deleteChapter as jest.Mock).mock
        .invocationCallOrder[0]
      const insertOrder = (repo.exegesisContent.createBulk as jest.Mock).mock
        .invocationCallOrder[0]
      expect(deleteOrder).toBeLessThan(insertOrder)
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
      ).toEqual({
        translation: "In the name of God",
        exegesis: null,
        footnotes: {},
      })
    })
  })
})
