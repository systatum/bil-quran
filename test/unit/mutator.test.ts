/**
 * @jest-environment node
 */

// checker.ts transitively imports the browser DB stack — mock it so
// this Node.js test can import mutator.ts without sql.js / idb-keyval.
jest.mock("../../src/services/checker", () => ({
  isPlainObject: jest.fn(),
}))

import { pickLocalized } from "../../src/services/mutator"
import { Locale } from "../../src/constants/settings"

describe("pickLocalized", () => {
  it("maps present locales through the pick function", () => {
    const result = pickLocalized(
      { [Locale.IntEnglish]: "hello", [Locale.Indonesian]: "halo" },
      (v) => v.toUpperCase(),
    )
    expect(result).toEqual({
      [Locale.IntEnglish]: "HELLO",
      [Locale.Indonesian]: "HALO",
    })
  })

  it("excludes locales that are absent from the source record", () => {
    const result = pickLocalized({ [Locale.IntEnglish]: "hello" }, (v) => v)
    expect(result).not.toHaveProperty(Locale.Indonesian)
    expect(result).not.toHaveProperty(Locale.IntArabic)
  })

  it("returns an empty object when the record is empty", () => {
    expect(pickLocalized({}, (v: string) => v)).toEqual({})
  })

  it("maps nested values correctly", () => {
    type Entry = { short: string; long: string }
    const source: Partial<Record<Locale, Entry>> = {
      [Locale.IntEnglish]: { short: "A brief desc", long: "A longer desc" },
    }
    const shorts = pickLocalized(source, (v) => v.short)
    expect(shorts).toEqual({ [Locale.IntEnglish]: "A brief desc" })
  })
})
