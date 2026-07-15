import { Asset } from "@constants/assets"
import useExegesisState from "@hooks/states/ExegesisState"
import { readMarker, renderExegesisMarkdown } from "@services/markdown"
import React, { useRef, useState } from "react"
import styled from "styled-components"
import Footnotes from "./Footnotes"
import { NavTarget } from "./index"

export default function Entry({
  exegesisId,
  chapterId,
  verseNumber,
  isChapterIntro,
  theme,
  onNavigate,
}: {
  exegesisId: string
  chapterId: number
  verseNumber: number
  isChapterIntro: boolean
  theme: string
  onNavigate: (target: NavTarget) => void
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
      <SourceLabel $theme={theme}>
        {source?.name ?? exegesisId}
        {isChapterIntro && " — Introduction"}
      </SourceLabel>
      {isChapterIntro ? (
        <VerseText
          $theme={theme}
          $loaded={content != null}
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

const Wrapper = styled.div<{ $theme: string }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid
    ${({ $theme }) => ($theme === "dark" ? "#303030" : "#e2d6c3")};

  &:last-child {
    border-bottom: none;
  }

  a.inline-marker {
    cursor: pointer;
  }

  a.marker-type-f {
    color: inherit;
    text-decoration: none;
    sup {
      font-size: 0.72em;
      font-weight: 700;
      vertical-align: super;
      color: ${({ $theme }) => ($theme === "dark" ? "#c8a96e" : "#8a6030")};
    }
  }

  a.marker-type-q {
    color: ${({ $theme }) => ($theme === "dark" ? "#9b9b9b" : "#886c36")};
    text-decoration: underline;
    text-decoration-style: dotted;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
    margin-left: 5px;
    margin-right: 2px;
  }
`

const SourceLabel = styled.span<{ $theme: string }>`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ $theme }) => ($theme === "dark" ? "#7a7a7a" : "#999")};
`

const VerseText = styled.div<{ $theme: string; $loaded: boolean }>`
  font-size: 0.95em;
  line-height: 1.8;
  margin: 0;
  color: ${({ $theme, $loaded }) =>
    $loaded
      ? $theme === "dark"
        ? "#ece0c8"
        : "#1f1f1f"
      : $theme === "dark"
        ? "#555"
        : "#bbb"};

  p {
    margin: 0 0 0.9em;
  }
  p:last-child {
    margin-bottom: 0;
  }
  em {
    color: ${({ $theme }) => ($theme === "dark" ? "#ccae6c" : "#3a5f8a")};
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.9em 0;
    font-size: 0.92em;
  }
  th,
  td {
    border: 1px solid
      ${({ $theme }) => ($theme === "dark" ? "#3a3226" : "#e2d6c3")};
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
  }
  th {
    font-weight: 600;
    background: ${({ $theme }) =>
      $theme === "dark"
        ? "rgba(200, 169, 110, 0.12)"
        : "rgba(138, 96, 48, 0.08)"};
  }
  tbody tr:nth-child(even) td {
    background: ${({ $theme }) =>
      $theme === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.015)"};
  }
`

const TranslationText = styled.div<{ $theme: string }>`
  position: relative;
  overflow: hidden;
  padding: 24px 18px 14px 36px;
  border-radius: 8px;
  border-left: 3px solid
    ${({ $theme }) =>
      $theme === "dark"
        ? "rgba(200, 169, 110, 0.35)"
        : "rgba(138, 96, 48, 0.3)"};
  background: ${({ $theme }) =>
    $theme === "dark"
      ? "rgba(200, 169, 110, 0.05)"
      : "rgba(138, 96, 48, 0.05)"};

  &::before {
    content: "\\201C";
    position: absolute;
    z-index: 0;
    top: -0.1em;
    left: 8px;
    font-family: Georgia, "Times New Roman", serif;
    font-style: normal;
    font-size: 6em;
    line-height: 1;
    color: ${({ $theme }) =>
      $theme === "dark"
        ? "rgba(200, 169, 110, 0.2)"
        : "rgba(138, 96, 48, 0.16)"};
    pointer-events: none;
    user-select: none;
  }
`

const TranslationTextContent = styled.div<{ $theme: string; $loaded: boolean }>`
  position: relative;
  z-index: 1;
  font-size: 0.95em;
  line-height: 1.8;
  color: ${({ $theme, $loaded }) =>
    $loaded
      ? $theme === "dark"
        ? "#d8c7a3"
        : "#1f1f1f"
      : $theme === "dark"
        ? "#555"
        : "#bbb"};

  p {
    margin: 0 0 0.9em;
  }
  p:last-child {
    margin-bottom: 0;
  }
`
