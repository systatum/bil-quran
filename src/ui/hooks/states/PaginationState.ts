import { PaginationStyle, QuranPage } from "@constants/records/Pagination"
import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import { create } from "zustand"

interface PaginationState {
  juzPages: QuranPage[][]
  loadPagination: () => Promise<void>
  /** Returns the 1-based juz number containing the given chapter+verse, or null if data not loaded. */
  getJuzNumber: (chapterId: number, verse: number) => number | null
}

const usePaginationState = create<PaginationState>((set, get) => ({
  juzPages: [],

  async loadPagination() {
    if (get().juzPages.length > 0) return
    const resp = await repo.paginations.findAllBy({ name: PaginationStyle.Madinah })
    const [pagination] = unpackIPC(resp)
    if (!pagination) return

    const partToJuz = new Map<number, number>()
    const groups: QuranPage[][] = []
    for (const page of pagination.pages) {
      if (!partToJuz.has(page.part)) {
        partToJuz.set(page.part, groups.length)
        groups.push([])
      }
      groups[partToJuz.get(page.part)!].push(page)
    }
    set({ juzPages: groups })
  },

  getJuzNumber(chapterId, verse) {
    const { juzPages } = get()
    for (let juzIdx = 0; juzIdx < juzPages.length; juzIdx++) {
      for (const page of juzPages[juzIdx]) {
        const ci = page.chapterIds.indexOf(chapterId)
        if (ci === -1) continue
        const [start, end] = page.verseNumbers[ci]
        if (verse >= start && verse <= end) return juzIdx + 1
      }
    }
    return null
  },
}))

export default usePaginationState
