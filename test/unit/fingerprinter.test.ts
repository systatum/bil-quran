import { FingerprintedAsset } from "@services/fingerprinter"

// Outside `${basePath}/quran/` so `readJson` skips fingerprint recording.
const ASSET_URL = "https://example.test/not-quran-asset.json"

function mockFetchOk(payload: unknown) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(payload),
  })
}

describe("FingerprintedAsset", () => {
  describe("readJson", () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    describe("caching", () => {
      it("shares a single fetch across concurrent calls for the same URL", async () => {
        const payload = { hello: "world" }
        global.fetch = mockFetchOk(payload)

        const [a, b] = await Promise.all([
          FingerprintedAsset.readJson(`${ASSET_URL}?concurrent`),
          FingerprintedAsset.readJson(`${ASSET_URL}?concurrent`),
        ])

        expect(a).toEqual(payload)
        expect(b).toEqual(payload)
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      it("serves a later sequential call for the same URL from cache", async () => {
        const payload = { some: "data" }
        global.fetch = mockFetchOk(payload)

        const first = await FingerprintedAsset.readJson(
          `${ASSET_URL}?sequential`,
        )
        const second = await FingerprintedAsset.readJson(
          `${ASSET_URL}?sequential`,
        )

        expect(first).toEqual(payload)
        expect(second).toEqual(payload)
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      it("does not poison the cache on failure, so a later call retries", async () => {
        const url = `${ASSET_URL}?retry`
        global.fetch = jest
          .fn()
          .mockResolvedValueOnce({ ok: false })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ recovered: true }),
          })

        await expect(FingerprintedAsset.readJson(url)).rejects.toThrow()
        const result = await FingerprintedAsset.readJson(url)

        expect(result).toEqual({ recovered: true })
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      it("fetches distinct URLs independently", async () => {
        global.fetch = mockFetchOk({})

        await FingerprintedAsset.readJson(`${ASSET_URL}?a`)
        await FingerprintedAsset.readJson(`${ASSET_URL}?b`)

        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })
  })
})
