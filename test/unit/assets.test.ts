/**
 * @jest-environment node
 */

import { Asset } from "../../src/constants/assets"

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
