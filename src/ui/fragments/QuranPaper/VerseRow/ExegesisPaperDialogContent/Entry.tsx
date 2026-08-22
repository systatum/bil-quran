import { Asset } from "@constants/assets"
import useExegesisState from "@hooks/states/ExegesisState"
import { readMarker, renderExegesisMarkdown } from "@services/markdown"
import React, { useRef, useState } from "react"
import Footnotes from "./Footnotes"
import {
  SourceLabel,
  TranslationText,
  TranslationTextContent,
  VerseText,
  Wrapper,
} from "./ExegesisEntryStyles"
import { NavTarget } from "./index"

export default function Entry({
  exegesisId,
  chapterId,
  verseNumber,
  isChapterIntro,
  theme,
  onNavigate,
  onFootnoteClick,
}: {
  exegesisId: string
  chapterId: number
  verseNumber: number
  isChapterIntro: boolean
  theme: string
  onNavigate: (target: NavTarget) => void
  onFootnoteClick?: () => void
}) {
  const { getVerseExegesis } = useExegesisState()
  const source = Asset.exegesisOf(exegesisId)
  const content = getVerseExegesis(exegesisId, chapterId, verseNumber)
  const [highlightedFn, setHighlightedFn] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleClick = (e: React.MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest("a.inline-marker")
    if (!anchor) return
    e.preventDefault()
    const marker = readMarker(anchor)
    if (!marker) return
    const [type, ...args] = marker as [string, ...unknown[]]
    if (type === "F") {
      const fn = String(args[0])
      clearTimeout(timerRef.current)
      setHighlightedFn(fn)
      timerRef.current = setTimeout(() => setHighlightedFn(null), 2000)
      onFootnoteClick?.()
      document
        .getElementById(`fn-${exegesisId}-${fn}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    } else if (type === "Q") {
      const [ch, v] = String(args[0]).split(":").map(Number)
      onNavigate({ chapterId: ch, verse: v })
    }
  }

  return (
    <Wrapper $theme={theme} onClick={handleClick}>
      <SourceLabel $theme={theme} className="exegesis-source-label">
        Tafsir {source?.name ?? exegesisId}
        {isChapterIntro && " — Introduction"}
      </SourceLabel>
      {isChapterIntro ? (
        <VerseText
          $theme={theme}
          $loaded={content != null}
          className="exegesis-translation"
          dangerouslySetInnerHTML={
            content
              ? { __html: renderExegesisMarkdown(content.translation) }
              : undefined
          }
        />
      ) : (
        <TranslationText $theme={theme}>
          <TranslationTextContent
            $theme={theme}
            $loaded={content != null}
            className="exegesis-translation"
            dangerouslySetInnerHTML={
              content
                ? { __html: renderExegesisMarkdown(content.translation) }
                : undefined
            }
          />
        </TranslationText>
      )}
      {content?.exegesis && (
        <VerseText
          $theme={theme}
          $loaded
          className="exegesis-body"
          dangerouslySetInnerHTML={{
            __html: renderExegesisMarkdown(content.exegesis),
          }}
        />
      )}
      {content && (
        <Footnotes
          content={content}
          exegesisId={exegesisId}
          highlightedFn={highlightedFn}
        />
      )}
    </Wrapper>
  )
}
