/**
 * @jest-environment node
 */

import { Asset } from "../../src/constants/assets"
import { Locale } from "../../src/constants/settings"

describe("Asset.exegesisOf", () => {
  it("finds by slug", () => {
    const source = Asset.exegesisOf("aliquli")
    expect(source).not.toBeNull()
    expect(source?.name).toBe("Ali Quli Qara'i")
  })

  it("finds by full exegesisId", () => {
    const source = Asset.exegesisOf("aliquli/en-US")
    expect(source).not.toBeNull()
    expect(source?.name).toBe("Ali Quli Qara'i")
  })

  it("returns null for unknown slug", () => {
    expect(Asset.exegesisOf("unknown")).toBeNull()
  })

  it("returns null for unknown full id", () => {
    expect(Asset.exegesisOf("unknown/en-US")).toBeNull()
  })
})

describe("Asset.defaultExegesisId", () => {
  const aliquli = Asset.exegesisSources.find((s) =>
    s.path.endsWith("/aliquli"),
  )!
  const originalLocales = aliquli.availableLocales
  const originalSources = Asset.exegesisSources

  afterEach(() => {
    aliquli.availableLocales = originalLocales
    Asset.exegesisSources = originalSources
  })

  it("prefers Ali Quli in the user's locale when it's available", () => {
    aliquli.availableLocales = [Locale.IntEnglish, Locale.Indonesian]
    expect(Asset.defaultExegesisId(Locale.Indonesian)).toBe("aliquli/id-ID")
  })

  it("falls back to the English edition when the user's locale isn't available", () => {
    aliquli.availableLocales = [Locale.IntEnglish]
    expect(Asset.defaultExegesisId(Locale.Indonesian)).toBe("aliquli/en-US")
  })

  it("returns null when the Ali Quli source isn't registered", () => {
    Asset.exegesisSources = []
    expect(Asset.defaultExegesisId(Locale.IntEnglish)).toBeNull()
  })
})
