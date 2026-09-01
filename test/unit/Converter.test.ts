import { Locale } from "@constants/settings"
import {
  ExegesisDeepLink,
  ExegesisSelectionOverride,
  parseExegesisDeepLink,
  resolveExegesisSelection,
} from "@services/Converter"

describe("Converter", () => {
  describe("parseExegesisDeepLink", () => {
    it("parses chapter, verse, and query params", () => {
      expect(
        parseExegesisDeepLink("#/e/10/104?tafsir=ibnkathir&transliteration=1"),
      ).toEqual({
        chapterId: 10,
        verseNumber: 104,
        tafsirParam: "ibnkathir",
        showTransliteration: true,
      } satisfies ExegesisDeepLink)

      expect(
        parseExegesisDeepLink("#/e/10/104?tafsir=ibnkathir&transliteration=0"),
      ).toEqual({
        chapterId: 10,
        verseNumber: 104,
        tafsirParam: "ibnkathir",
        showTransliteration: false,
      } satisfies ExegesisDeepLink)
    })

    it("parses chapter and verse without a query string", () => {
      expect(parseExegesisDeepLink("#/e/1/7")).toEqual({
        chapterId: 1,
        verseNumber: 7,
        tafsirParam: undefined,
        showTransliteration: false,
      } satisfies ExegesisDeepLink)
    })

    it("returns null for a non-exegesis route", () => {
      expect(parseExegesisDeepLink("#/c/1/7")).toBeNull()
    })

    it("returns null for the root route", () => {
      expect(parseExegesisDeepLink("#/")).toBeNull()
    })

    it("returns null for a non-numeric chapter or verse", () => {
      expect(parseExegesisDeepLink("#/e/abc/7")).toBeNull()
    })

    it("parses a locale override", () => {
      expect(
        parseExegesisDeepLink("#/e/10/104?tafsir=ibnkathir&locale=id-ID"),
      ).toEqual({
        chapterId: 10,
        verseNumber: 104,
        tafsirParam: "ibnkathir",
        showTransliteration: false,
        localeParam: "id-ID",
      } satisfies ExegesisDeepLink)
    })
  })

  describe("resolveExegesisSelection", () => {
    it("resolves a valid tafsir slug in the given locale", () => {
      expect(
        resolveExegesisSelection("ibnkathir", false, Locale.IntEnglish),
      ).toEqual({
        exegesisId: "ibnkathir/en-US",
        showTransliteration: false,
      } satisfies ExegesisSelectionOverride)
    })

    it("falls back to the default work for an unknown slug", () => {
      expect(
        resolveExegesisSelection("not-a-real-tafsir", true, Locale.IntEnglish),
      ).toEqual({
        exegesisId: "mirali/en-US",
        showTransliteration: true,
      } satisfies ExegesisSelectionOverride)
    })

    it("falls back to English when the slug lacks the requested locale", () => {
      expect(
        resolveExegesisSelection("ibnkathir", false, Locale.Indonesian),
      ).toEqual({
        exegesisId: "ibnkathir/en-US",
        showTransliteration: false,
      } satisfies ExegesisSelectionOverride)
    })

    it("leaves exegesisId undefined when no tafsir param is given", () => {
      expect(
        resolveExegesisSelection(undefined, false, Locale.IntEnglish)
          .exegesisId,
      ).toBeUndefined()
    })
  })
})
