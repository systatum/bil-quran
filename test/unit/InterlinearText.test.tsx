/**
 * @jest-environment jsdom
 */

// useAligner (used internally) relies on ResizeObserver, which jsdom doesn't
// implement.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(global as any).ResizeObserver = MockResizeObserver

jest.mock("@hooks/states/UserSettingsState", () => ({
  __esModule: true,
  default: () => ({ userSettings: { theme: "light" } }),
}))

import { render } from "@testing-library/react"
import { WordTranslationOption } from "../../src/constants/records/WordTranslationRecord"
import { DEFAULT_LOCALE } from "../../src/constants/settings"
import type { WordCell } from "../../src/ui/fragments/QuranPaper/VerseRow"
import InterlinearText from "../../src/ui/fragments/QuranPaper/VerseRow/InterlinearText"

const WORD: WordCell = {
  chapterId: 1,
  verse: 1,
  order: 0,
  partNumber: 1,
  lexemeId: 1,
  renderingId: 1,
  token: "بِسْمِ",
  root: { id: 1, root: "بسم" },
  readings: { [DEFAULT_LOCALE]: "bismi" },
  meanings: { [WordTranslationOption.AmericanEnglish]: "In the name" },
}

function renderInterlinear(smaller: boolean) {
  return render(
    <InterlinearText
      id="test-verse"
      arabicFont={{ family: "Amiri" as any, size: 24 }}
      words={[WORD]}
      shownTranslations={[WordTranslationOption.AmericanEnglish]}
      showMeaning
      smaller={smaller}
    />,
  )
}

describe("InterlinearText smaller mode", () => {
  it("shrinks the gap between the Arabic word and its meaning when smaller", () => {
    const { container } = renderInterlinear(true)
    const meaning = container.querySelector(".meaning") as HTMLElement
    expect(meaning).not.toBeNull()
    expect(getComputedStyle(meaning).marginTop).toBe("5px")
  })

  it("uses the wider default gap when not smaller", () => {
    const { container } = renderInterlinear(false)
    const meaning = container.querySelector(".meaning") as HTMLElement
    expect(meaning).not.toBeNull()
    expect(getComputedStyle(meaning).marginTop).toBe("8px")
  })

  it("still honors an explicit marginTop override even in smaller mode", () => {
    const { container } = render(
      <InterlinearText
        id="test-verse-basmala"
        arabicFont={{ family: "Amiri" as any, size: 24 }}
        words={[]}
        withBasmala
        showMeaning
        smaller
      />,
    )

    const meaning = container.querySelector(".meaning") as HTMLElement
    expect(meaning).not.toBeNull()
    expect(getComputedStyle(meaning).marginTop).toBe("57px")

    const css = Array.from(document.querySelectorAll("style"))
      .map((s) => s.textContent)
      .join("\n")
    expect(css).not.toMatch(/!important/)
  })
})
