import { renderHook, waitFor } from "@testing-library/react"
import { Locale } from "@constants/settings"
import { ExegesisChapterAsset, ExegesisMetadata } from "@constants/records/ExegesisRecord"

// All mocks need factory functions to prevent jest from loading the real
// modules for auto-mocking (which would pull in sql.js/ESM deps).
jest.mock("@services/checker", () => ({ isPlainObject: jest.fn() }))

jest.mock("@hooks/states/UserSettingsState", () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock("@services/fingerprinter", () => ({
  FingerprintedAsset: { readJson: jest.fn() },
}))

jest.mock("@db/repo", () => ({
  repo: {
    exegesis: {
      findAllBy: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock("@services/Logger", () => ({
  __esModule: true,
  default: { error: jest.fn(), debug: jest.fn() },
}))

// Mock Asset so the exegesis source list is predictable in tests
jest.mock("@constants/assets", () => ({
  Asset: {
    exegesisSources: [
      {
        name: "AliQuli",
        path: "/quran/exegesis/aliquli",
        availableLocales: ["en-US"],
      },
    ],
  },
}))

import useExegesis from "@hooks/tools/useExegesis"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { FingerprintedAsset } from "@services/fingerprinter"
import { repo } from "@db/repo"

const mockSettings = useUserSettingsState as jest.MockedFunction<typeof useUserSettingsState>
const mockReadJson = FingerprintedAsset.readJson as jest.MockedFunction<typeof FingerprintedAsset.readJson>
const mockFindAllBy = repo.exegesis.findAllBy as jest.MockedFunction<typeof repo.exegesis.findAllBy>
const mockCreate = repo.exegesis.create as jest.MockedFunction<typeof repo.exegesis.create>

const CHAPTER_ASSET: ExegesisChapterAsset = {
  chapterId: 1,
  description: "Opening chapter",
  footnotes: { "1": { "1": "Footnote text" } },
  translations: { "1": "In the name of God" },
}

const ABOUT_ASSET: ExegesisMetadata = {
  name: "Tafsir AliQuli",
  author: "Ali Quli Qarai",
  locNames: { [Locale.IntEnglish]: "AliQuli Commentary" },
  about: {
    [Locale.IntEnglish]: {
      shortDesc: "A brief description",
      detailDesc: ["More detail"],
      author: "Ali Quli Qarai",
    },
  },
}

function alreadyInDb() {
  mockFindAllBy.mockResolvedValue({ succeed: true, data: [{ id: "aliquli/en-US" } as any] })
}

function notInDb() {
  mockFindAllBy.mockResolvedValue({ succeed: true, data: [] })
  mockCreate.mockResolvedValue({ succeed: true, data: {} as any })
  mockReadJson.mockImplementation((url: string) => {
    if (url.includes("about.json")) return Promise.resolve(ABOUT_ASSET as any)
    return Promise.resolve(CHAPTER_ASSET as any)
  })
}

function withActiveExegesis(ids: string[]) {
  mockSettings.mockReturnValue({
    userSettings: { exegesis: ids },
  } as any)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockReadJson.mockResolvedValue(CHAPTER_ASSET as any)
})

describe("useExegesis", () => {
  it("returns empty array when no exegesis IDs are active", () => {
    withActiveExegesis([])
    const { result } = renderHook(() => useExegesis(1, 1))
    expect(result.current).toEqual([])
  })

  it("returns null content for each active ID when chapterId is null", () => {
    withActiveExegesis(["aliquli/en-US"])
    const { result } = renderHook(() => useExegesis(null, 1))
    expect(result.current).toEqual([{ id: "aliquli/en-US", content: null }])
  })

  it("returns null content for each active ID when verseNumber is null", () => {
    withActiveExegesis(["aliquli/en-US"])
    const { result } = renderHook(() => useExegesis(1, null))
    expect(result.current).toEqual([{ id: "aliquli/en-US", content: null }])
  })

  it("returns null content for an unknown exegesis source", async () => {
    withActiveExegesis(["unknown-source/en-US"])
    const { result } = renderHook(() => useExegesis(1, 1))
    await waitFor(() => expect(result.current[0].content).toBeNull())
    expect(result.current[0].id).toBe("unknown-source/en-US")
  })

  it("returns null content for an unsupported locale", async () => {
    withActiveExegesis([`aliquli/${Locale.Indonesian}`])
    const { result } = renderHook(() => useExegesis(1, 1))
    await waitFor(() => expect(result.current[0].content).toBeNull())
  })

  it("returns verse content when already in DB", async () => {
    alreadyInDb()
    withActiveExegesis(["aliquli/en-US"])
    const { result } = renderHook(() => useExegesis(1, 1))
    await waitFor(() => expect(result.current[0].content).not.toBeNull())
    expect(result.current[0].content).toEqual({
      translation: "In the name of God",
      footnotes: { "1": "Footnote text" },
    })
    // about.json should not be fetched since record is already in DB
    expect(mockReadJson).not.toHaveBeenCalledWith(expect.stringContaining("about.json"))
  })

  it("seeds metadata from about.json when not yet in DB, then returns content", async () => {
    notInDb()
    withActiveExegesis(["aliquli/en-US"])
    const { result } = renderHook(() => useExegesis(1, 1))
    await waitFor(() => expect(result.current[0].content).not.toBeNull())
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "aliquli/en-US", oriName: "Tafsir AliQuli" }),
    )
    expect(result.current[0].content?.translation).toBe("In the name of God")
  })

  it("returns null content when the verse key is absent from the chapter data", async () => {
    alreadyInDb()
    mockReadJson.mockResolvedValue({ ...CHAPTER_ASSET, translations: {} } as any)
    withActiveExegesis(["aliquli/en-US"])
    const { result } = renderHook(() => useExegesis(1, 99))
    await waitFor(() => result.current.length > 0)
    await waitFor(() => !result.current[0].content || result.current[0].content === null)
    expect(result.current[0].content).toBeNull()
  })

  it("returns null content when the fetch throws", async () => {
    alreadyInDb()
    mockReadJson.mockRejectedValue(new Error("Network error"))
    withActiveExegesis(["aliquli/en-US"])
    const { result } = renderHook(() => useExegesis(1, 1))
    await waitFor(() => expect(result.current[0].content).toBeNull())
  })
})
