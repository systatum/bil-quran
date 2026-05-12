import { useEffect, useMemo, useRef, useState } from "react"

import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import { useVirtualizer } from "@tanstack/react-virtual"
import styled from "styled-components"

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

interface VerseRow {
  id: string
  chapterId: number
  number: number
  words: WordCell[]
}

/**
 * Stable scroll container required by react-virtual.
 * It defines the coordinate system for all offset calculations.
 */
export default function QuranBrowser() {
  const [words, setWords] = useState<WordCell[]>([])
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
      const wbwTranslations = unpackIPC(
        await repo.wbwTranslations.compile("en-US"),
      )
      const words = unpackIPC(await repo.words.findAllBy())
      const translatedWords = words.map((w) => ({
        ...w,
        meaning: wbwTranslations[w.chapterId][w.verse][w.order],
      }))

      console.log("whole trans", translatedWords)
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
          chapterId: word.chapterId,
          number: word.verse,
          words: [],
        }

        grouped.set(key, verse)
      }

      verse.words.push(word)
    }

    return Array.from(grouped.values())
  }, [words])

  /**
   * Virtualizer uses real measured height when available.
   * Fallback estimate is only used before first render.
   */
  const virtualizer = useVirtualizer({
    count: verses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => sizeMap.current.get(index) ?? 140,
    overscan: 8,
  })

  const items = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      style={{
        height: "100vh",
        overflow: "auto",
        background: "#fafafa",
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: "relative",
        }}
      >
        {items.map((item) => {
          const verse = verses[item.index]

          return (
            <VerseRow
              key={verse.id}
              index={item.index}
              verse={verse}
              showTransliteration={showTransliteration}
              showMeaning={showMeaning}
              style={{
                transform: `translateY(${item.start}px)`,
              }}
              sizeMap={sizeMap}
              virtualizer={virtualizer}
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
}: {
  verse: VerseRow
  index: number
  style: React.CSSProperties
  sizeMap: React.RefObject<Map<number, number>>
  virtualizer: any
  showTransliteration?: boolean
  showMeaning?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  /**
   * After render, measure real height.
   * This removes all clipping and overflow issues.
   */
  useEffect(() => {
    if (!ref.current) return

    const height = ref.current.getBoundingClientRect().height

    if (sizeMap.current.get(index) !== height) {
      sizeMap.current.set(index, height)
      virtualizer.measure()
    }
  }, [index, verse.words.length])

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: style.transform,
        boxSizing: "border-box",
        padding: "24px 32px",
        borderBottom: "1px solid #ececec",
        background: "white",
      }}
    >
      <div
        style={{
          direction: "rtl",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          textAlign: "right",
          fontSize: "42px",
          lineHeight: 2.4,
          fontFamily: `"Amiri", serif`,
          whiteSpace: "normal",
        }}
      >
        {/* Verse marker aligned to full row height */}
        <VerseMarker>({verse.number})</VerseMarker>

        {verse.words.map((word) => (
          <span
            key={`${word.chapterId}-${word.verse}-${word.order}`}
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              margin: "0 6px",
              verticalAlign: "top",
            }}
          >
            <span style={{ fontSize: "42px", lineHeight: 1.6 }}>
              {word.token}
            </span>

            {showTransliteration && (
              <span
                style={{
                  fontSize: "14px",
                  color: "#666",
                  marginTop: "4px",
                  direction: "ltr",
                  textAlign: "center",
                }}
              >
                {word.enReading}
              </span>
            )}

            {showMeaning && (
              <span
                style={{
                  fontSize: "14px",
                  color: "#888",
                  marginTop: "2px",
                  direction: "ltr",
                  textAlign: "center",
                  maxWidth: "120px",
                  lineHeight: "16px",
                }}
              >
                {word.meaning}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

const VerseMarker = styled.span`
  font-size: 22px;
  color: #666;
  margin-left: 12px;
  align-self: center;
  white-space: nowrap;
  margin-bottom: 20px;
`
