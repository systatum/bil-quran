import { useEffect, useMemo, useRef, useState } from "react"

import { ChapterRecord } from "@constants/records/ChapterRecord"
import { ThemeMode } from "@constants/theme"
import { useTranslatedWords, useWords } from "@hooks/tools/useWordTranslations"
import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual"
import useChaptersState from "../../hooks/states/ChaptersState"
import useUserSettingsState from "../../hooks/states/UserSettingsState"
import ChapterRow from "./ChapterRow"
import VerseRow, { Verse } from "./VerseRow"
import { Bismillah } from "./VerseRow/Bismillah"

// This module contains the content browser of the Quran.
// It includes various components to build the verse, and
// virtualize the view so that, even if we have thousands
// of verse to render, the browser is only displaying only
// a few in the viewport so as not to crumble the device's
// precious RAM and slowing down the device's processor.

interface RenderableChapterRow {
  type: "chapter"
  chapter: ChapterRecord
  hasBasmala: boolean
}

interface RenderableVerseRow {
  type: "verse"
  verse: Verse
}

type RenderRow = RenderableChapterRow | RenderableVerseRow

function isVerseRow(row: RenderRow): row is RenderableVerseRow {
  return row.type === "verse"
}

interface QuranBrowserProps {
  onScroll: (verseRow: Verse) => void
  theme: ThemeMode

  // if given, will scroll to this location
  chapterId: number | null
  verseNumber: number | null
}

/**
 * Stable scroll container required by react-virtual.
 * It defines the coordinate system for all offset calculations.
 */
export default function QuranPaper({
  onScroll,
  theme = "dark",
  chapterId: requestedChapterId,
  verseNumber: requestedVerseNumber,
}: QuranBrowserProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const { chapters } = useChaptersState()
  const { setScrollPosition, userSettings } = useUserSettingsState()

  const rawWords = useWords()
  const words = useTranslatedWords(rawWords, userSettings.wbwTranslations)

  // some flags about the rendering
  const [showTransliteration, setShowTransliteration] = useState(false)
  const [showMeaning, setShowMeaning] = useState(true)

  /**
   * Stores real measured heights per verse index.
   * Virtualizer relies on this for correct positioning.
   */
  const sizeMap = useRef<Map<number, number>>(new Map())

  /**
   * Group words into verses.
   * This is semantic grouping only (not layout logic).
   */
  const verses = useMemo<Verse[]>(
    () => VerseRow.groupVerse(chapters, words),
    [words],
  )

  const renderRows = useMemo<RenderRow[]>(() => {
    // the chapters data must be ready first
    if (chapters == null || Object.keys(chapters).length == 0) return []

    const rows: RenderRow[] = []
    let lastChapterId: number | null = null
    for (const verse of verses) {
      if (verse.chapter.id !== lastChapterId) {
        rows.push({
          type: "chapter",
          chapter: verse.chapter,
          hasBasmala: Bismillah.isRenderableHere(
            verse.number,
            verse.chapter.id,
          ),
        })
        lastChapterId = verse.chapter.id
      }

      rows.push({ type: "verse", verse })
    }

    return rows
  }, [verses, chapters])

  /**
   * Virtualizer uses real measured height when available.
   * Fallback estimate is only used before first render.
   */
  const virtualizer = useVirtualizer({
    count: renderRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => sizeMap.current.get(i) ?? 140,
    overscan: 15,
  })

  const items = virtualizer.getVirtualItems()

  // record scrolling
  const hasRestoredScrollRef = useRef(false)
  // prevent recording while programmatically restoring.
  const isRestoringScrollRef = useRef(false)
  useEffect(() => {
    const el = parentRef.current
    if (!el) return

    let timeout: number | undefined

    // Persist the earliest sufficiently-visible verse
    function recordScrolling() {
      if (isRestoringScrollRef.current) return
      clearTimeout(timeout)

      timeout = window.setTimeout(() => {
        if (!el) return

        const visibleItems = virtualizer.getVirtualItems().filter((item) => {
          const row = renderRows[item.index]
          if (!row) return false
          if (!isVerseRow(row)) return false

          return isVirtualItemNearView(item, el.scrollTop, el.clientHeight)
        })

        // no item? then don't persist
        if (visibleItems.length === 0) return

        // the algorithm above is "imperfect" (and I can't perfect them properly perhaps)
        // but we can do some clever brute-forcing here. the idea is, we want to select
        // the earliest possible verse (within a valid buffer boundary). but, if there's a
        // chapter marker in between (and chapter marker is quite huge-y) let's take the
        // "current" verse, instead of the previous earlier verse that may even partially
        // visible -- which, if there's no chapter row, will be a perfect-esque candidate
        const selected = visibleItems[0]
        let row = renderRows[selected.index]
        if (selected.index > 1) {
          if (renderRows[selected.index - 1].type === "chapter") {
            // tried to backtrack, but got a chapter row; so skip
          } else {
            row = renderRows[selected.index + 1]
          }
        }

        if (!row || row.type !== "verse") return
        const verse = row.verse
        if (onScroll) onScroll(row.verse)

        setScrollPosition(verse.chapter.id, verse.number)
      }, 120)
    }

    el.addEventListener("scroll", recordScrolling)

    return () => {
      clearTimeout(timeout)
      el.removeEventListener("scroll", recordScrolling)
    }
  }, [renderRows])

  async function waitForMeasurements() {
    return new Promise<void>((resolve) => {
      let lastSize = virtualizer.getTotalSize()
      let stableCount = 0

      const check = () => {
        const currentSize = virtualizer.getTotalSize()
        if (currentSize === lastSize) {
          stableCount++
          if (stableCount >= 3) {
            resolve()
            return
          }
        } else {
          stableCount = 0
          lastSize = currentSize
        }
        requestAnimationFrame(check)
      }

      requestAnimationFrame(check)
    })
  }

  async function scrollToVerse(chapterId: number, verse: number) {
    const targetIndex = renderRows.findIndex((row) => {
      return (
        row.type === "verse" &&
        row.verse.chapter.id === chapterId &&
        row.verse.number === verse
      )
    })

    // cannot find the target index? done deal
    if (targetIndex < 0) return
    // mark that we are currently "restoring" scroll
    isRestoringScrollRef.current = true

    // Wait for all fonts to render correctly; not doing this will affect
    // the height and stuff, and result in way much more imprecise scroll
    // restoration
    await document.fonts.ready

    // essentially: wait until multiple pass of painting, before scrolling
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        // on this paint, document might be resized due to font having been
        // downloaded
        requestAnimationFrame(() => {
          // initial scroll
          virtualizer.scrollToIndex(targetIndex, {
            align: "start",
          })

          // wait until scrolling done, then try to re-adjust a bit
          requestAnimationFrame(() => {
            const virtualItems = virtualizer.getVirtualItems()
            const item = virtualItems.find((x) => x.index === targetIndex)
            const previousItem = virtualItems.find(
              (x) => x.index === targetIndex - 1,
            )
            const parentContainer = parentRef.current

            // last scrolling, trying to make the verse fully visible
            if (item && parentContainer) {
              parentContainer.scrollTo({
                top:
                  item.start +
                  (previousItem
                    ? Math.abs(item.start - previousItem.start)
                    : 0),

                behavior: "instant",
              })
            }

            // reenable persistence after much more stable
            window.setTimeout(() => {
              isRestoringScrollRef.current = false
              resolve()
            }, 300)
          })
        })
      })
    })
  }

  // restore persisted scroll position ONCE.
  useEffect(() => {
    if (hasRestoredScrollRef.current) return
    if (renderRows.length === 0) return

    async function restoreScroll() {
      const { lastScroll } = userSettings
      if (lastScroll.chapterId > 0) {
        await waitForMeasurements()
        await scrollToVerse(lastScroll.chapterId, lastScroll.verse)
      }
      hasRestoredScrollRef.current = true
    }

    restoreScroll()
  }, [renderRows])

  useEffect(() => {
    // must have rows on the page
    if (renderRows.length === 0) return
    // must both be provided
    if (!requestedChapterId || !requestedVerseNumber) return
    scrollToVerse(requestedChapterId, requestedVerseNumber)
  }, [requestedChapterId, requestedVerseNumber, renderRows])

  // global resize/orientation observer that invalidates every cached measurement
  // which then would force the virtualizer to recompute
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const onResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        sizeMap.current.clear()
        virtualizer.measure()
      }, 200)
    }

    window.addEventListener("resize", onResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <div
      ref={parentRef}
      style={{
        height: "calc(100vh - 64px)",
        overflow: "auto",
        background: theme === "dark" ? "rgb(31, 31, 31)" : "white",
        color: theme === "dark" ? "rgb(122, 122, 122)" : "black",
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: "relative",
        }}
      >
        {items.map((item) => {
          const row = renderRows[item.index]

          if (row.type === "chapter") {
            return (
              <ChapterRow
                key={item.index}
                theme={theme}
                index={item.index}
                chapter={row.chapter}
                hasBasmala={row.hasBasmala}
                style={{ transform: `translateY(${item.start}px)` }}
                sizeMap={sizeMap}
                virtualizer={virtualizer}
              />
            )
          }

          return (
            <VerseRow
              theme={theme}
              key={row.verse.id}
              index={item.index}
              verse={row.verse}
              style={{ transform: `translateY(${item.start}px)` }}
              sizeMap={sizeMap}
              virtualizer={virtualizer}
              showMeaning={showMeaning}
              showTransliteration={showTransliteration}
            />
          )
        })}
      </div>
    </div>
  )
}

/**
 * Treats an item as "visible" if enough of it remains within the viewport.
 * The visibility buffer scales with row height, so longer verses require
 * more scrolling before being considered out of view. This avoids short
 * verses dropping out too aggressively while preventing long verses from
 * being replaced too early. By default, an item remains active until at
 * least 60% of its height has been scrolled past.
 */
function isVirtualItemNearView(
  item: VirtualItem,
  scrollTop: number,
  viewportHeight: number,
  bufferRatio = 0.6,
) {
  const dynamicBuffer = item.size * bufferRatio
  const viewportTop = scrollTop - dynamicBuffer
  const viewportBottom = scrollTop + viewportHeight + dynamicBuffer
  const itemTop = item.start
  const itemBottom = item.start + item.size

  return itemTop < viewportBottom && itemBottom > viewportTop
}
