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

interface VerseRow {
  id: string
  chapterId: number
  number: number
  words: WordCell[]
}

type RenderRow =
  | { type: "chapter"; chapterId: number; name: string }
  | { type: "verse"; verse: VerseRow }

/**
 * Stable scroll container required by react-virtual.
 * It defines the coordinate system for all offset calculations.
 */
export default function QuranBrowser() {
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

  const renderRows = useMemo<RenderRow[]>(() => {
    // the chapters data must be ready first
    if (chapters == null || Object.keys(chapters).length == 0) return []

    const rows: RenderRow[] = []
    let lastChapterId: number | null = null
    for (const verse of verses) {
      if (verse.chapterId !== lastChapterId) {
        rows.push({
          type: "chapter",
          chapterId: verse.chapterId,
          name: chapters[verse.chapterId].ar,
        })

        lastChapterId = verse.chapterId
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
      <VerseRowContainer>
        <VerseMarker>{verse.number}</VerseMarker>

        <VerseText>
          {verse.number === 1 &&
            verse.chapterId != 1 &&
            verse.chapterId != 9 && (
              <Word>
                <Bismillah />

                {showTransliteration && (
                  <Transliteration>
                    Bismillah hir-Rahman nir-Rahim
                  </Transliteration>
                )}

                {showMeaning && (
                  <Meaning marginTop="57px">
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

              {showMeaning && <Meaning>{word.meaning}</Meaning>}
            </Word>
          ))}
        </VerseText>
      </VerseRowContainer>
    </div>
  )
}

const VerseRowContainer = styled.div`
  display: grid;
  grid-template-columns: 72px 1fr;
  direction: rtl;
  align-items: start;
`

const VerseMarker = styled.div`
  width: 42px;
  height: 42px;
  margin-top: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #5a5a5a;
  border-radius: 50%;
  border: 1.5px solid #bdbdbd;
  position: relative;
  background: radial-gradient(circle, #ffffff 40%, #f6f6f6 100%);

  box-shadow:
    inset 0 0 0 2px #e7e7e7,
    0 1px 2px rgba(0, 0, 0, 0.08);

  flex-shrink: 0;

  /* subtle ornamental hint */
  &::after {
    content: "";
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    border: 1px dashed #d0d0d0;
    opacity: 0.6;
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

const Meaning = styled.span<{ marginTop?: string }>`
  font-size: 14px;
  color: #888;
  margin-top: ${({ marginTop }) => marginTop ?? "2px"};
  direction: ltr;
  text-align: center;
  max-width: 120px;
  line-height: 16px;
`

const ChapterHeaderContainer = styled.div`
  text-align: center;
  font-size: 48px;
  font-family: "Amiri", serif;
  padding: 32px 24px;
  border-bottom: 1px solid #eee;
  background: white;
`

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
