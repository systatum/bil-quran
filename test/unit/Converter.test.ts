import { Locale } from "@constants/settings"
import {
  parseExegesisDeepLink,
  resolveExegesisSelection,
} from "@services/Converter"

describe("Converter", () => {
  describe("parseExegesisDeepLink", () => {
    it("parses chapter, verse, and query params", () => {
      expect(
        parseExegesisDeepLink(
          "#/e/10/104?tafsir=ibnkathir&transliteration=1",
        ),
      ).toEqual({
        chapterId: 10,
        verseNumber: 104,
        tafsirParam: "ibnkathir",
        transliterationParam: "1",
      })
    })

    it("parses chapter and verse without a query string", () => {
      expect(parseExegesisDeepLink("#/e/1/7")).toEqual({
        chapterId: 1,
        verseNumber: 7,
        tafsirParam: undefined,
        transliterationParam: undefined,
      })
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
        transliterationParam: undefined,
        localeParam: "id-ID",
      })
    })
  })

  describe("resolveExegesisSelection", () => {
    it("resolves a valid tafsir slug in the given locale", () => {
      expect(
        resolveExegesisSelection("ibnkathir", undefined, Locale.IntEnglish),
      ).toEqual({
        exegesisId: "ibnkathir/en-US",
        showTransliteration: undefined,
      })
    })

    it("falls back to the default work for an unknown slug", () => {
      expect(
        resolveExegesisSelection("not-a-real-tafsir", undefined, Locale.IntEnglish),
      ).toEqual({
        exegesisId: "mirali/en-US",
        showTransliteration: undefined,
      })
    })

    it("falls back to English when the slug lacks the requested locale", () => {
      expect(
        resolveExegesisSelection("ibnkathir", undefined, Locale.Indonesian),
      ).toEqual({
        exegesisId: "ibnkathir/en-US",
        showTransliteration: undefined,
      })
    })

    it("leaves exegesisId undefined when no tafsir param is given", () => {
      expect(
        resolveExegesisSelection(undefined, undefined, Locale.IntEnglish)
          .exegesisId,
      ).toBeUndefined()
    })

    it("resolves showTransliteration true only for exactly \"1\"", () => {
      expect(
        resolveExegesisSelection(undefined, "1", Locale.IntEnglish)
          .showTransliteration,
      ).toBe(true)
      expect(
        resolveExegesisSelection(undefined, "0", Locale.IntEnglish)
          .showTransliteration,
      ).toBeUndefined()
      expect(
        resolveExegesisSelection(undefined, undefined, Locale.IntEnglish)
          .showTransliteration,
      ).toBeUndefined()
    })
  })
})
