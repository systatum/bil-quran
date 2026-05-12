import { useEffect, useMemo, useRef, useState } from "react"

import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import { useVirtualizer } from "@tanstack/react-virtual"

interface WordRow {
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
  verse: number
  words: WordRow[]
}

/**
 * Stable scroll container required by react-virtual.
 * It defines the coordinate system for all offset calculations.
 */
export default function QuranBrowser() {
  const [words, setWords] = useState<WordRow[]>([])
  const parentRef = useRef<HTMLDivElement>(null)

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
        meaning: wbwTranslations[w.chapterId][w.verse][w.order + 1],
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
          chapterId: word.chapterId,
          verse: word.verse,
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
}: {
  verse: VerseRow
  index: number
  style: React.CSSProperties
  sizeMap: React.RefObject<Map<number, number>>
  virtualizer: any
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
          textAlign: "right",
          fontSize: "42px",
          lineHeight: 2.4,
          fontFamily: `"Amiri", serif`,
          whiteSpace: "normal",
        }}
      >
        {verse.words.map((word, i) => {
          const isLast = i === verse.words.length - 1

          return (
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
              {/* Arabic token */}
              <span
                style={{
                  fontSize: "42px",
                  lineHeight: 1.6,
                }}
              >
                {word.token}
              </span>

              {/* meaning */}
              <span
                style={{
                  fontSize: "14px",
                  color: "#777",
                  lineHeight: 1.2,
                  marginTop: "6px",
                  direction: "ltr",
                  textAlign: "center",
                  maxWidth: "120px",
                }}
              >
                {word.meaning}
              </span>

              {/* verse marker */}
              {isLast && (
                <span
                  style={{
                    fontSize: "22px",
                    color: "#666",
                    marginTop: "6px",
                  }}
                >
                  ({verse.verse})
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
