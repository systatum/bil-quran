import { Asset } from "@constants/assets"
import {
  ExegesisAuthor,
  ExegesisChapterAsset,
  ExegesisMetadata,
  ExegesisVerseContent,
} from "@constants/records/ExegesisRecord"
import { Locale } from "@constants/settings"
import { ThoughtSchool } from "@constants/ThoughtSchool"
import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import { FingerprintedAsset } from "@services/fingerprinter"
import LOGGER from "@services/Logger"
import { pickLocalized } from "@services/picker"
import { useEffect, useState } from "react"
import useUserSettingsState from "../states/UserSettingsState"

export interface ExegesisEntry {
  id: string
  content: ExegesisVerseContent | null
}

/**
 * For each activated exegesis, return its content for the given chapter and verse.
 * Results are keyed in the same order as the user's exegesis array.
 */
export default function useExegesis(
  chapterId: number | null,
  verseNumber: number | null,
): ExegesisEntry[] {
  const {
    userSettings: { exegesis },
  } = useUserSettingsState()

  const [contents, setContents] = useState<
    Record<string, ExegesisVerseContent | null>
  >({})

  const activeKey = exegesis.join(",")

  useEffect(() => {
    if (exegesis.length === 0 || chapterId == null || verseNumber == null) {
      setContents({})
      return
    }

    const cancels: Array<() => void> = []

    for (const id of exegesis) {
      const [slug, locale] = id.split("/") as [string, Locale]
      const source = Asset.exegesisSources.find(
        (s) => s.path.split("/").pop() === slug,
      )

      if (!source || !source.availableLocales.includes(locale)) {
        LOGGER.error(`Unknown exegesis source: ${id}`)
        setContents((prev) => ({ ...prev, [id]: null }))
        continue
      }

      const chapterUrl = `${source.path}/${locale}/${chapterId}.json`

      // Guards against a stale async callback updating state after the effect
      // has re-run (e.g. the user navigated to a different verse mid-fetch).
      let cancelled = false
      cancels.push(() => {
        cancelled = true
      })
      ;(async () => {
        try {
          await fetchExegesis(id, source.path)

          const data =
            await FingerprintedAsset.readJson<ExegesisChapterAsset>(chapterUrl)

          if (cancelled) return

          const verseKey = String(verseNumber)
          const translation = data.translations?.[verseKey] ?? null

          setContents((prev) => ({
            ...prev,
            [id]:
              translation != null
                ? {
                    translation,
                    footnotes: data.footnotes?.[verseKey] ?? {},
                  }
                : null,
          }))
        } catch (e) {
          LOGGER.error(`useExegesis: failed to load ${id}`, e)
          if (!cancelled) setContents((prev) => ({ ...prev, [id]: null }))
        }
      })()
    }

    return () => cancels.forEach((c) => c())
    // activeKey is a stable string derived from the array, avoids reference churn
  }, [activeKey, chapterId, verseNumber])

  return exegesis.map((id) => ({
    id,
    content: contents[id] ?? null,
  }))
}

/** Fetch and store the exegesis work record in the database if it isn't there yet. */
async function fetchExegesis(
  exegesisId: string,
  sourcePath: string,
): Promise<void> {
  const existing = unpackIPC(await repo.exegesis.findAllBy({ id: exegesisId }))
  if (existing.length > 0) return

  const about = await FingerprintedAsset.readJson<ExegesisMetadata>(
    `${sourcePath}/about.json`,
  )

  const locNames = pickLocalized(about.locNames ?? {}, (v) => v)
  const description = pickLocalized(about.about ?? {}, (v) => v.shortDesc)
  const authors: ExegesisAuthor[] = Object.entries(about.authors).map(
    ([name, { bio }]) => ({ name, bio }),
  )

  await repo.exegesis.create({
    id: exegesisId,
    oriName: about.name,
    locNames,
    description,
    authors,
    thoughtSchool: ThoughtSchool.fromNameString(about.thought),
    source: about.source,
  })

  LOGGER.debug(`Stored exegesis: ${exegesisId}`)
}
