/**
 * @jest-environment node
 */

// checker.ts transitively imports the browser DB stack — mock it so
// this Node.js test can import mutator.ts without sql.js / idb-keyval.
jest.mock("../../src/services/checker", () => ({
  isPlainObject: jest.fn(),
}))

import { pickLocalized, queryInChunks } from "../../src/services/mutator"
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

describe("queryInChunks", () => {
  it("calls queryChunk once per chunk of the given size", async () => {
    const queryChunk = jest.fn(async (chunk: number[]) => chunk)
    await queryInChunks([1, 2, 3, 4, 5], 2, queryChunk)

    expect(queryChunk).toHaveBeenCalledTimes(3)
    expect(queryChunk).toHaveBeenNthCalledWith(1, [1, 2])
    expect(queryChunk).toHaveBeenNthCalledWith(2, [3, 4])
    expect(queryChunk).toHaveBeenNthCalledWith(3, [5])
  })

  it("preserves item order across chunk boundaries", async () => {
    const result = await queryInChunks([1, 2, 3, 4, 5], 2, async (chunk) =>
      chunk.map((n) => n * 10),
    )
    expect(result).toEqual([10, 20, 30, 40, 50])
  })

  it("makes a single call when items fit within one chunk", async () => {
    const queryChunk = jest.fn(async (chunk: number[]) => chunk)
    await queryInChunks([1, 2], 1000, queryChunk)
    expect(queryChunk).toHaveBeenCalledTimes(1)
  })

  it("makes no calls for an empty items array", async () => {
    const queryChunk = jest.fn(async (chunk: number[]) => chunk)
    const result = await queryInChunks([], 100, queryChunk)
    expect(queryChunk).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })
})
