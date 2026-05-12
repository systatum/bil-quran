import { useEffect, useMemo, useRef, useState } from "react"

import { useVirtualizer } from "@tanstack/react-virtual"

import { repo } from "@db/repo"

interface WordRow {
  chapterId: number
  verse: number
  order: number

  partNumber: number

  lexemeId: number
  renderingId: number

  token: string
}

interface VerseRow {
  id: string

  chapterId: number
  verse: number

  words: WordRow[]
}

export default function QuranBrowser() {
  const [words, setWords] = useState<WordRow[]>([])

  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const result = await repo.words.findAllBy()

      if (!result.succeed) {
        console.error(result.errors)

        return
      }

      setWords(result.data ?? [])
    }

    load().catch(console.error)
  }, [])

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

  const virtualizer = useVirtualizer({
    count: verses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
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
            <div
              key={verse.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${item.start}px)`,
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
                }}
              >
                {verse.words.map((word, index) => {
                  const isLast = index === verse.words.length - 1

                  return (
                    <span key={`${word.chapterId}-${word.verse}-${word.order}`}>
                      <span>{word.token}</span>

                      {isLast && (
                        <span
                          style={{
                            fontSize: "24px",
                            marginLeft: "18px",
                            verticalAlign: "middle",
                            color: "#666",
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
        })}
      </div>
    </div>
  )
}
