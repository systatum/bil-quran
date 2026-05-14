import { useEffect, useMemo, useRef, useState } from "react"

import { ChapterRecord } from "@constants/records/chapters"
import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import { useVirtualizer } from "@tanstack/react-virtual"
import styled from "styled-components"
import { Bismillah } from "./fragments/bismillah"

interface WordCell {
  renderingId: number
  chapterId: number
  lexemeId: number
  enReading: string
  order: number
  partNumber: number
  verse: number
  root: string
  token: string
  meaning: string
}

export interface VerseRow {
  id: string
  chapter: ChapterRecord
  number: number
  words: WordCell[]
}

type RenderableChapterRow = { type: "chapter"; chapterId: number; name: string }
type RenderableVerseRow = { type: "verse"; verse: VerseRow }
type RenderRow = RenderableChapterRow | RenderableVerseRow

function isVerseRow(row: RenderRow): row is RenderableVerseRow {
  return row.type === "verse"
}

type ThemeMode = "dark" | "light"
interface QuranBrowserProps {
  onScroll: (verseRow: VerseRow) => void
  theme: ThemeMode
}

/**
 * Stable scroll container required by react-virtual.
 * It defines the coordinate system for all offset calculations.
 */
export default function QuranBrowser({
  onScroll,
  theme = "dark",
}: QuranBrowserProps) {
  const [words, setWords] = useState<WordCell[]>([])
  const [chapters, setChapters] = useState<Record<number, ChapterRecord>>({})
  const parentRef = useRef<HTMLDivElement>(null)

  // some flags about the rendering
  const [showTransliteration, setShowTransliteration] = useState(false)
  const [showMeaning, setShowMeaning] = useState(true)

  /**
   * Stores real measured heights per verse index.
   * Virtualizer relies on this for correct positioning.
   */
  const sizeMap = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    async function load() {
      // load chapters
      const rawChapters = unpackIPC(await repo.chapters.findAllBy({}))
      setChapters(
        rawChapters.reduce<Record<number, ChapterRecord>>((acc, ch) => {
          acc[ch.id] = ch
          return acc
        }, {}),
      )

      // load word-by-word translations and associate to its relevant word in a verse
      const wbwTranslations = unpackIPC(
        await repo.wbwTranslations.compile("en-US"),
      )
      const words = unpackIPC(await repo.words.findAllBy())
      const translatedWords = words.map((w) => ({
        ...w,
        meaning: wbwTranslations[w.chapterId][w.verse][w.order],
      }))

      setWords(translatedWords)
    }

    load().catch(console.error)
  }, [])

  /**
   * Group words into verses.
   * This is semantic grouping only (not layout logic).
   */
  const verses = useMemo<VerseRow[]>(() => {
    const grouped = new Map<string, VerseRow>()

    for (const word of words) {
      const key = `${word.chapterId}:${word.verse}`
      let verse = grouped.get(key)

      if (!verse) {
        verse = {
          id: key,
          chapter: chapters[word.chapterId],
          number: word.verse,
          words: [],
        }

        grouped.set(key, verse)
      }

      verse.words.push(word)
    }

    return Array.from(grouped.values())
  }, [words])

  const renderRows = useMemo<RenderRow[]>(() => {
    // the chapters data must be ready first
    if (chapters == null || Object.keys(chapters).length == 0) return []

    const rows: RenderRow[] = []
    let lastChapterId: number | null = null
    for (const verse of verses) {
      if (verse.chapter.id !== lastChapterId) {
        rows.push({
          type: "chapter",
          chapterId: verse.chapter.id,
          name: chapters[verse.chapter.id].ar,
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
    overscan: 8,
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

      // detect whether an item is sufficiently visible, given the buffer space
      // so that, if the verse is at the top but not 100% in the viewport, that
      // verse is still can be considered. the buffer ratio is in percentage,
      // the idea is that, the larger the row (the longer the verse), should
      // be treated differently than the shorter verse, otherwise, on a shorter
      // verse, half scrolling past that would rule out that row from being
      // "visible" yet when on a longer verse, just scrolling a bit, had this
      // buffer is a static pixel (instead of percentage ratio), would judge
      // so confidently that the verse that follow is the one user is actually
      // reading, while that might not be the case due to the verse being longer.
      // by default, user must consume at least 60% of the pixel of a given item
      // row, for that row to be judged as not the one user is reading.
      function isVirtualItemNearView(
        item: { start: number; size: number },
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
        console.debug("Current scrolling:", verse.chapter.id, verse.number)
        if (onScroll) onScroll(row.verse)

        localStorage.setItem(
          "userSettings",
          JSON.stringify({
            lastScroll: {
              chapterId: verse.chapter.id,
              verse: verse.number,
            },
          }),
        )
      }, 120)
    }

    el.addEventListener("scroll", recordScrolling)

    return () => {
      clearTimeout(timeout)
      el.removeEventListener("scroll", recordScrolling)
    }
  }, [renderRows])

  // restore persisted scroll position ONCE.
  useEffect(() => {
    // do not attempt to restore, ever, if already restored
    if (hasRestoredScrollRef.current) return
    if (renderRows.length === 0) return

    let cancelled = false
    async function restoreScroll() {
      // try to read previous setting, if possible
      const raw = localStorage.getItem("userSettings")
      let parsed: Record<string, any>
      try {
        if (!raw) {
          hasRestoredScrollRef.current = true
          return
        }
        parsed = JSON.parse(raw)
      } catch {
        hasRestoredScrollRef.current = true
        return
      }

      // find the row
      const lastScroll = parsed?.lastScroll
      if (!lastScroll) {
        hasRestoredScrollRef.current = true
        return
      }
      const targetIndex = renderRows.findIndex((row) => {
        return (
          row.type === "verse" &&
          row.verse.chapter.id === lastScroll.chapterId &&
          row.verse.number === lastScroll.verse
        )
      })

      if (targetIndex < 0) {
        hasRestoredScrollRef.current = true
        return
      }

      // ready to scroll, but now prevent persistence during restoration
      isRestoringScrollRef.current = true

      // Wait for all fonts to render correctly; not doing this will affect
      // the height and stuff, and result in way much more imprecise scroll
      // restoration
      await document.fonts.ready

      if (cancelled) return

      // wait until multiple pass of painting
      requestAnimationFrame(() => {
        // on this paint, document might be resized due to font having been
        // downloaded
        requestAnimationFrame(() => {
          if (cancelled) return

          // initial scroll
          virtualizer.scrollToIndex(targetIndex, {
            align: "start",
          })

          // wait until scrolling done, then try to re-adjust a bit
          requestAnimationFrame(() => {
            if (cancelled) return

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
              if (cancelled) return
              isRestoringScrollRef.current = false
              hasRestoredScrollRef.current = true
            }, 300)
          })
        })
      })
    }

    restoreScroll()

    return () => {
      cancelled = true
    }
  }, [renderRows])

  return (
    <div
      ref={parentRef}
      style={{
        height: "100vh",
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
              <ChapterHeaderRow
                key={`ch-${row.chapterId}`}
                index={item.index}
                name={row.name}
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
 * A single virtualized verse row.
 *
 * Responsibility:
 * - render RTL verse text
 * - measure actual DOM height
 * - report height back to virtualizer
 */
function VerseRow({
  verse,
  index,
  style,
  sizeMap,
  virtualizer,
  showTransliteration = false,
  showMeaning = true,
  theme,
}: {
  verse: VerseRow
  index: number
  style: React.CSSProperties
  sizeMap: React.RefObject<Map<number, number>>
  virtualizer: any
  showTransliteration?: boolean
  showMeaning?: boolean
  theme: ThemeMode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const height = ref.current.getBoundingClientRect().height

    if (sizeMap.current.get(index) !== height) {
      sizeMap.current.set(index, height)
      virtualizer.measure()
    }
  }, [index, verse.words.length])

  return (
    <VerseRowWrapper
      ref={ref}
      theme={theme}
      style={{ transform: style.transform }}
    >
      <VerseMarker theme={theme}>{verse.number}</VerseMarker>

      <VerseText>
        {Bismillah.isRenderableHere(verse.number, verse.chapter.id) && (
          <Word>
            <Bismillah />

            {showTransliteration && (
              <Transliteration>Bismillah hir-Rahman nir-Rahim</Transliteration>
            )}

            {showMeaning && (
              <Meaning theme={theme} marginTop="57px">
                In the name of Allah, the Most Gracious, the Most Merciful
              </Meaning>
            )}
          </Word>
        )}

        {verse.words.map((word, idx) => (
          <Word key={`${word.chapterId}-${word.verse}-${word.order}`}>
            <Arabic>{word.token}</Arabic>

            {showTransliteration && (
              <Transliteration>{word.enReading}</Transliteration>
            )}

            {showMeaning && <Meaning theme={theme}>{word.meaning}</Meaning>}
          </Word>
        ))}
      </VerseText>
    </VerseRowWrapper>
  )
}

const VerseRowWrapper = styled.div<{ theme: ThemeMode }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 24px 32px;
  display: grid;
  grid-template-columns: 72px 1fr;
  direction: rtl;
  align-items: start;

  color: ${({ theme }) => (theme === "dark" ? "#d8c7a3" : "#1f1f1f")};
  background: ${({ theme }) => (theme === "dark" ? "#181818" : "#ffffff")};
  border-bottom: 1px solid
    ${({ theme }) => (theme === "dark" ? "#303030" : "#ececec")};
`

const VerseMarker = styled.div<{ theme: ThemeMode }>`
  width: 42px;
  height: 42px;
  margin-top: 15px;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 18px;

  color: ${({ theme }) => (theme === "dark" ? "#e5dcc3" : "#5a5a5a")};

  border-radius: 50%;

  border: 1.5px solid
    ${({ theme }) => (theme === "dark" ? "#5f5644" : "#bdbdbd")};

  position: relative;

  background: ${({ theme }) =>
    theme === "dark"
      ? "radial-gradient(circle, #2b2a26 40%, #1c1b18 100%)"
      : "radial-gradient(circle, #ffffff 40%, #f6f6f6 100%)"};

  box-shadow: ${({ theme }) =>
    theme === "dark"
      ? `
        inset 0 0 0 2px #3b372f,
        0 1px 3px rgba(0, 0, 0, 0.45)
      `
      : `
        inset 0 0 0 2px #e7e7e7,
        0 1px 2px rgba(0, 0, 0, 0.08)
      `};

  flex-shrink: 0;

  /* subtle ornamental hint */
  &::after {
    content: "";
    position: absolute;
    inset: 4px;

    border-radius: 50%;

    border: 1px dashed
      ${({ theme }) => (theme === "dark" ? "#7b715b" : "#d0d0d0")};

    opacity: ${({ theme }) => (theme === "dark" ? 0.4 : 0.6)};
  }
`

const VerseText = styled.div`
  text-align: right;
  font-size: 42px;
  line-height: 2.4;
  font-family: "Amiri", serif;
  white-space: normal;
`

const Word = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 0 6px;
  vertical-align: top;
`

const Arabic = styled.span`
  font-size: 42px;
  line-height: 1.6;
`

const Transliteration = styled.span`
  font-size: 14px;
  color: #666;
  margin-top: 4px;
  direction: ltr;
  text-align: center;
`

const Meaning = styled.span<{ theme: ThemeMode; marginTop?: string }>`
  font-size: 14px;
  color: ${({ theme }) => (theme === "dark" ? "#bebebe" : "#888")};
  margin-top: ${({ marginTop }) => marginTop ?? "2px"};
  direction: ltr;
  text-align: center;
  max-width: 120px;
  line-height: 16px;
`

/**
 * Row for each chapter. Because it is a virtualized row, we still need
 * to report its height. If we don't report, then the difference will cause
 * offset drift, which makes scroll position restoration inaccurate.
 */
function ChapterHeaderRow({
  index,
  name,
  style,
  sizeMap,
  virtualizer,
}: {
  index: number
  name: string
  style: React.CSSProperties
  sizeMap: React.RefObject<Map<number, number>>
  virtualizer: any
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const h = ref.current.getBoundingClientRect().height

    if (sizeMap.current.get(index) !== h) {
      sizeMap.current.set(index, h)
      virtualizer.measure()
    }
  }, [index, name])

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: style.transform,
      }}
    >
      <ChapterHeaderContainer>{name}</ChapterHeaderContainer>
    </div>
  )
}

const ChapterHeaderContainer = styled.div`
  text-align: center;
  font-size: 48px;
  font-family: "Amiri", serif;
  padding: 32px 24px;
  border-bottom: 1px solid #eee;
`
