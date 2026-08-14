/**
 * @jest-environment jsdom
 */

// useAligner (used internally by InterlinearText) relies on ResizeObserver,
// which jsdom doesn't implement.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(global as any).ResizeObserver = MockResizeObserver

jest.mock("@services/fingerprinter", () => ({
  FingerprintedAsset: {
    Quran: { getVerseRendering: jest.fn() },
    readJson: jest.fn(),
  },
}))

jest.mock("@hooks/states/UserSettingsState", () => ({
  __esModule: true,
  default: jest.fn(),
}))

// Footnotes pulls in @systatum/coneto/theme, which is ESM-only and unresolvable
// by jest's CJS resolver. Not under test here, so stub it out.
jest.mock(
  "../../src/ui/fragments/QuranPaper/VerseRow/ExegesisPaperDialogContent/Footnotes",
  () => ({
    __esModule: true,
    default: () => null,
  }),
)

import { render, screen, waitFor } from "@testing-library/react"
import { Asset } from "../../src/constants/assets"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { FingerprintedAsset } from "@services/fingerprinter"
// Tests the content directly, skipping index.tsx's PaperDialog chrome:
// @systatum/coneto ships ESM-only exports, and jest's CJS resolver can't
// reach subpaths like "/paper-dialog" that lack a "require" condition.
import { ExegesisPreviewContent as ExegesisPreviewShell } from "../../src/ui/fragments/ExegesisPreviewShell/Content"

const mockSettings = useUserSettingsState as jest.MockedFunction<
  typeof useUserSettingsState
>
const mockGetVerseRendering =
  FingerprintedAsset.Quran.getVerseRendering as jest.MockedFunction<
    typeof FingerprintedAsset.Quran.getVerseRendering
  >
const mockReadJson = FingerprintedAsset.readJson as jest.MockedFunction<
  typeof FingerprintedAsset.readJson
>

const BASE_USER_SETTINGS = {
  theme: "light",
  locale: "en-US",
  exegesis: [] as string[],
  showTransliteration: false,
  font: { arabic: { family: "NotoNaskhArabic", size: 42.5 } },
}

/** Mirrors the real store: applies the selector if given, else returns the whole state. */
function withUserSettings(overrides: Partial<typeof BASE_USER_SETTINGS> = {}) {
  const state = { userSettings: { ...BASE_USER_SETTINGS, ...overrides } }
  mockSettings.mockImplementation(((selector?: (s: typeof state) => unknown) =>
    selector ? selector(state) : state) as any)
}

const VERSE_WORDS = [
  { id: "10:104", word: "قُلْ", trans: "qul", root: "ق و ل" },
  { id: "10:104", word: "يَا", trans: "yā", root: "ي" },
]

const CHAPTER_ASSET = {
  chapterId: 10,
  description: "Chapter intro",
  footnotes: {},
  translations: { "104": "Say [O Muhammad]..." },
  exegesis: { "104": "Commentary on verse 104." },
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetVerseRendering.mockResolvedValue(VERSE_WORDS as any)
  mockReadJson.mockResolvedValue(CHAPTER_ASSET as any)
})

describe("ExegesisPreviewShell", () => {
  it("renders the interlinear words and tafsir translation once fetches resolve", async () => {
    withUserSettings()
    render(
      <ExegesisPreviewShell
        chapterId={10}
        verseNumber={104}
        exegesisIdOverride="ibnkathir/en-US"
      />,
    )

    await waitFor(() =>
      expect(screen.getByText(/Say \[O Muhammad\]/)).toBeInTheDocument(),
    )
    expect(screen.getByText("قُلْ")).toBeInTheDocument()
    expect(screen.getByText(/Commentary on verse 104/)).toBeInTheDocument()
    expect(mockGetVerseRendering).toHaveBeenCalledWith("imlaei", 10)
  })

  it("falls back to the user's saved exegesis when no override is given", async () => {
    withUserSettings({ exegesis: ["ibnkathir/en-US"] })
    render(<ExegesisPreviewShell chapterId={10} verseNumber={104} />)

    await waitFor(() =>
      expect(screen.getByText(/Say \[O Muhammad\]/)).toBeInTheDocument(),
    )
  })

  it("shows the chapter description for the chapter-intro sentinel verse", async () => {
    withUserSettings()
    render(
      <ExegesisPreviewShell
        chapterId={10}
        verseNumber={0}
        exegesisIdOverride="ibnkathir/en-US"
      />,
    )

    await waitFor(() =>
      expect(screen.getByText("Chapter intro")).toBeInTheDocument(),
    )
    expect(mockGetVerseRendering).not.toHaveBeenCalled()
  })

  it("shows a message when no exegesis can be resolved", async () => {
    const originalDefault = Asset.defaultExegesisId
    Asset.defaultExegesisId = () => null
    try {
      withUserSettings({ exegesis: [] })
      render(<ExegesisPreviewShell chapterId={10} verseNumber={104} />)
      expect(screen.getByText(/No exegesis selected/)).toBeInTheDocument()
      // the interlinear words fetch still runs; let it settle within act()
      await waitFor(() => expect(mockGetVerseRendering).toHaveBeenCalled())
    } finally {
      Asset.defaultExegesisId = originalDefault
    }
  })
})
