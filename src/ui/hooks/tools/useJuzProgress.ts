import { ChapterRecord } from "@constants/records/ChapterRecord"
import useChaptersState from "@hooks/states/ChaptersState"
import usePaginationState from "@hooks/states/PaginationState"
import { useMemo } from "react"

export interface JuzProgress {
  juz: number
  current: number
  total: number
}

/**
 * Returns the reader's progress within the current juz (one of the 30 equal
 * parts of the Qur'an), or null while the required data is still loading.
 */
export function useJuzProgress(
  chapter: ChapterRecord | null,
  verseNumber: number | null,
): JuzProgress | null {
  const { chapters } = useChaptersState()
  const { getJuzNumber } = usePaginationState()

  return useMemo(() => {
    if (!chapter || !verseNumber || Object.keys(chapters).length === 0)
      return null

    // Which of the 30 juz does the current chapter+verse fall in?
    const juz = getJuzNumber(chapter.id, verseNumber)
    if (!juz) return null

    // Walk all 114 chapters to count:
    //   total  — every verse in this juz across all chapters
    //   current — every verse in this juz up to and including verseNumber
    //
    // Each chapter carries a `partitioning` array that maps part numbers to
    // verse ranges. A chapter can span two juz, so we look up only the slice
    // that belongs to `juz`.
    let total = 0
    let current = 0
    for (let chId = 1; chId <= 114; chId++) {
      const ch = chapters[chId]
      if (!ch) continue
      const p = ch.partitioning.find((x) => x.part === juz)
      if (!p) continue // chapter is not part of this juz
      const count = p.end - p.start + 1
      total += count
      if (chId < chapter.id)
        current += count // whole slice already read
      else if (chId === chapter.id) current += verseNumber - p.start + 1 // partial slice
    }
    return total > 0 ? { juz, current, total } : null
  }, [chapter, verseNumber, chapters, getJuzNumber])
}
