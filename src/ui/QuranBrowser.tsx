import { CSSProperties, useEffect, useMemo, useRef, useState } from "react"

import { VirtualItem, useVirtualizer } from "@tanstack/react-virtual"

import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import styled from "styled-components"

interface WordRow {
  chapterId: number
  verse: number
  order: number
  token: string
}

interface ChapterRow {
  id: number
  ar: string
  en: string
}

interface TokenItem {
  key: string
  token: string
  chapterId: number
  verse: number

  isVerseEnd: boolean
  isChapterStart: boolean

  chapterName?: string
}

interface VisualRow {
  tokens: TokenItem[]
}

interface VisualBlock {
  rows: VisualRow[]
}

interface QuranBlockProps {
  block: VisualBlock

  item: VirtualItem

  measureElement: ((element: HTMLElement | null) => void) | undefined
}

const ROWS_PER_BLOCK = 24

const blockStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  boxSizing: "border-box",
  background: "#1f1f1f",
  color: "rgb(122 122 122)",
}

// Style for the usual row
const VerseRow = styled.div`
  direction: rtl;
  text-align: right;
  font-size: 42px;
  line-height: 2.6;
  font-family: "Amiri", serif;
  border-bottom: 1px solid #343434;
  min-height: 96px;
`

const verseMarkerStyle: CSSProperties = {
  fontSize: "24px",
  color: "#666",
  verticalAlign: "middle",
}

// Render chapter header (name of chapter) differently
const ChapterHeader = styled.div`
  direction: rtl;
  text-align: center;
  font-size: 54px;
  margin-top: 32px;
  margin-bottom: 12px;
  padding-bottom: 18px;
  border-bottom: 2px solid #343434;
  font-family: "Amiri", serif;
  margin-right: -20px; // negates the parent
`

function createTextMeasurer() {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!
  ctx.font = '42px "Amiri"'

  return (text: string) => ctx.measureText(text).width
}

/**
 * Converts a linear token stream into visually wrapped rows, so that
 * we have deterministic visual rows that match real browser wrapping.
 * We do so by approximating the width using canvas text measurement.
 * At the end, this allows correct virtualization of RTL Quran text.
 *
 * Critical logic:
 * - Each token is measured as rendered text, including verse markers
 * - Tokens are accumulated until the next token would overflow container width
 * - When overflow occurs, a new row is started BEFORE adding the token
 *
 * Subtle edge cases:
 * - Verse markers affect width (e.g. " (12) ")
 * - Rows must never start empty (guard: current.length > 0)
 * - Width is reset exactly when a row boundary is created to avoid drift
 */
function buildRows(tokens: TokenItem[], containerWidth: number): VisualRow[] {
  const rows: VisualRow[] = []
  const measure = createTextMeasurer()
  let current: TokenItem[] = []
  let width = 0

  for (const token of tokens) {
    const rendered =
      token.token + (token.isVerseEnd ? ` (${token.verse}) ` : " ")

    const tokenWidth = measure(rendered)

    if (width + tokenWidth > containerWidth && current.length > 0) {
      rows.push({ tokens: current })
      current = []
      width = 0
    }

    current.push(token)
    width += tokenWidth
  }

  if (current.length > 0) rows.push({ tokens: current })
  return rows
}

/**
 * Groups visual rows into fixed-size blocks for virtualization.
 * Virtualization operates on block units instead of individual rows
 * to reduce the number of DOM nodes and improve scroll performance.
 *
 * This is purely a performance optimization layer and does not
 * affect visual correctness of the text layout.
 */
function buildBlocks(rows: VisualRow[]): VisualBlock[] {
  const blocks: VisualBlock[] = []

  for (let i = 0; i < rows.length; i += ROWS_PER_BLOCK) {
    blocks.push({
      rows: rows.slice(i, i + ROWS_PER_BLOCK),
    })
  }

  return blocks
}

/**
 * Virtualized container of Quran rows. The virtualization is done so
 * that we don't render individual rows. Doing this, we reduce DOM
 * size and improve scrolling performance for the full Quran text.
 *
 * The rows are first computed based on rendered text width so that
 * wrapping remains visually continuous and deterministic.
 *
 * The `block` parameter is a collection of visual rows grouped into one
 * virtualized chunk. The `item` contains metadata such as index and
 * translated position. The `measureElement` is a callback used by the
 * virtualizer to measure block height
 */
function QuranBlock({ block, item, measureElement }: QuranBlockProps) {
  return (
    <div
      ref={measureElement}
      data-index={item.index}
      style={{
        ...blockStyle,
        transform: `translateY(${item.start}px)`,
      }}
    >
      {block.rows.map((row, rowIndex) => (
        <VerseRow key={rowIndex}>
          <div style={{ marginRight: "20px" }}>
            {row.tokens.map((token) => (
              <span key={token.key}>
                {token.isChapterStart && (
                  <ChapterHeader>{token.chapterName}</ChapterHeader>
                )}
                {token.token}&nbsp;
                {token.isVerseEnd && (
                  <span style={verseMarkerStyle}>({token.verse}) </span>
                )}
              </span>
            ))}
          </div>
        </VerseRow>
      ))}
    </div>
  )
}

export default function QuranBrowser() {
  // Fully loaded Quran word records in rendering order.
  const [words, setWords] = useState<WordRow[]>([])
  // Chapter metadata indexed by chapter number for fast lookup.
  const [chapters, setChapters] = useState<Record<number, ChapterRow>>({})
  // Current usable rendering width used to compute visual row wrapping
  const [width, setWidth] = useState(0)
  // Container reference for virtualization and responsive layout measurement
  const parentRef = useRef<HTMLDivElement>(null)

  // load the verses and the chapters metadata
  useEffect(() => {
    async function load() {
      const loadedWords = unpackIPC(await repo.words.findAllBy())
      setWords(loadedWords)

      const uniqueChapterIds = Array.from(
        new Set(loadedWords.map((w) => w.chapterId)),
      )

      const chapterEntries = await Promise.all(
        uniqueChapterIds.map(async (chapterId) => {
          const [chapter] = unpackIPC(
            await repo.chapters.findAllBy({
              id: chapterId,
            }),
          )
          if (!chapter) return null
          return [chapter.id, chapter] as const
        }),
      )

      const chapterMap: Record<number, ChapterRow> = {}
      for (const entry of chapterEntries) {
        if (!entry) continue
        const [id, chapter] = entry
        chapterMap[id] = chapter
      }

      setChapters(chapterMap)
    }

    load().catch(console.error)
  }, [])

  /**
   * Keeps layout width in sync with the actual rendered container width.
   *
   * This is required because Quran rendering depends on precise text wrapping,
   * and wrapping changes when the viewport size changes.
   *
   * The initial measurement is executed once on mount, then updated on
   * every window resize event.
   */
  useEffect(() => {
    function updateWidth() {
      if (!parentRef.current) return
      setWidth(parentRef.current.clientWidth - 64)
    }
    updateWidth()
    window.addEventListener("resize", updateWidth)

    return () => {
      window.removeEventListener("resize", updateWidth)
    }
  }, [])

  const tokens = useMemo<TokenItem[]>(() => {
    return words.map((word, index) => {
      const prev = words[index - 1]

      const next = words[index + 1]

      const isVerseEnd =
        !next || next.chapterId !== word.chapterId || next.verse !== word.verse

      const isChapterStart = !prev || prev.chapterId !== word.chapterId

      return {
        key: `${word.chapterId}-${word.verse}-${word.order}`,
        token: word.token,
        chapterId: word.chapterId,
        isVerseEnd,
        isChapterStart,
        verse: word.verse,
        chapterName: chapters[word.chapterId]?.ar,
      }
    })
  }, [words, chapters])

  const rows = useMemo(() => {
    if (!width) return []

    return buildRows(tokens, width)
  }, [tokens, width])

  const blocks = useMemo(() => {
    return buildBlocks(rows)
  }, [rows])

  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 2400,
    overscan: 2,
    measureElement: (element) => element.getBoundingClientRect().height,
  })

  /**
   * Recompute virtualized block measurements whenever the viewport
   * size changes, since Quran rows are width-dependent and may wrap
   * differently after resizing.
   */
  useEffect(() => {
    function handleResize() {
      virtualizer.measure()
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [virtualizer])

  const items = virtualizer.getVirtualItems()

  return (
    <ScrollViewport ref={parentRef}>
      <FullPaper height={virtualizer.getTotalSize()}>
        {items.map((item) => (
          <QuranBlock
            key={item.key}
            block={blocks[item.index]}
            item={item}
            measureElement={virtualizer.measureElement}
          />
        ))}
      </FullPaper>
    </ScrollViewport>
  )
}

/**
 * This component owns scrolling, and so must be stable. It provides
 * scroll metrics to useVirtualizer. It must not be resized by content.
 * Without it, the virtualizer loses a fixed scroll context.
 */
const ScrollViewport = styled.div`
  height: 100vh;
  overflow: auto;
`

/**
 * This element simulates the total height of the entire dataset
 * so that the browser scrollbar reflects the full scroll range,
 * even though only a subset of rows is actually rendered
 *
 * Essentially, it tricks the browser into correct scrollbar size,
 * in that scrollbar collapses to 0 or viewport height
 */
const FullPaper = styled.div<{ height: number }>`
  height: ${(p) => p.height}px;
  width: 100%;
  position: relative;
  background: rgb(31, 31, 31);
`
