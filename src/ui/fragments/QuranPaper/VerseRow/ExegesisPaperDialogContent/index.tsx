import { Asset } from "@constants/assets"
import useChaptersState from "@hooks/states/ChaptersState"
import useExegesisState from "@hooks/states/ExegesisState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { useTranslatedWords, useWords } from "@hooks/tools/useWordTranslations"
import { RiArrowGoBackLine } from "@remixicon/react"
import LOGGER from "@services/Logger"
import { SplitPane } from "@systatum/coneto/split-pane"
import { useTheme } from "@systatum/coneto/theme"
import { marked } from "marked"
import React, { useEffect, useMemo, useRef, useState } from "react"
import styled, { css } from "styled-components"
import CircleButton from "../../CircleButton"
import InterlinearText from "../InterlinearText"
import Footnotes from "./Footnotes"
import { parseInlineMarkers, readMarker } from "./inlineMarkers"

type NavTarget = { chapterId: number; verse: number }

export default function ExegesisPaperDialogContent({
  chapterId,
  verseNumber,
}: {
  chapterId: number
  verseNumber: number
}) {
  const { mode: theme } = useTheme()
  const { userSettings } = useUserSettingsState()
  const { loadChapter } = useExegesisState()
  const { chapters } = useChaptersState()

  const [currentVerse, setCurrentVerse] = useState(verseNumber)
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null)

  useEffect(() => {
    setCurrentVerse(verseNumber)
    setNavTarget(null)
  }, [verseNumber, chapterId])

  const activeChapter = navTarget?.chapterId ?? chapterId
  const activeVerse = navTarget?.verse ?? currentVerse

  const activeIds = userSettings.exegesis

  const rawWords = useWords()
  const words = useTranslatedWords(rawWords, userSettings.wbwTranslations)

  const verseWords = useMemo(
    () =>
      words.filter(
        (w) => w.chapterId === activeChapter && w.verse === activeVerse,
      ),
    [words, activeChapter, activeVerse],
  )

  const maxVerse = useMemo(() => {
    const ch = chapters?.[activeChapter]
    if (!ch?.partitioning.length) return 286
    return Math.max(...ch.partitioning.map((p) => p.end))
  }, [chapters, activeChapter])

  useEffect(() => {
    for (const exegesisId of activeIds) {
      loadChapter(exegesisId, activeChapter).catch((e) =>
        LOGGER.error(`Failed loading exegesis chapter: ${exegesisId}`, e),
      )
    }
  }, [activeChapter, activeIds.join(",")])

  const fontArabic = userSettings.font.arabic

  const prevVerse = () => {
    if (navTarget) setNavTarget((t) => t && { ...t, verse: t.verse - 1 })
    else setCurrentVerse((v) => v - 1)
  }
  const nextVerse = () => {
    if (navTarget) setNavTarget((t) => t && { ...t, verse: t.verse + 1 })
    else setCurrentVerse((v) => v + 1)
  }

  if (activeIds.length === 0) {
    return (
      <Empty $theme={theme}>
        No exegesis selected — enable one in Settings.
      </Empty>
    )
  }

  return (
    <Outer>
      <SplitPane
        orientation="horizontal"
        initialSizeRatio={[0.3, 0.7]}
        styles={{
          self: css`
            padding-left: 1em;
            padding-right: 0.5em;
          `,
          dividerStyle: css`
            border: none;
            height: 5px;
            overflow: visible;
            position: relative;
            background: linear-gradient(
              to bottom,
              transparent 0%,
              ${theme === "dark" ? "rgba(0, 0, 0, 0.22)" : "rgba(0, 0, 0, 0.07)"}
                30%,
              ${theme === "dark" ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.02)"}
                65%,
              ${theme === "dark"
                  ? "rgba(255, 255, 255, 0.03)"
                  : "rgba(255, 255, 255, 0.60)"}
                85%,
              transparent 100%
            );
            box-shadow: 0 4px 8px
              ${theme === "dark" ? "rgba(0, 0, 0, 0.12)" : "rgba(0, 0, 0, 0.04)"};
            margin: 2px 10px;

            &::after {
              content: "";
              position: absolute;
              left: 14px;
              top: 50%;
              transform: translateY(-50%);
              width: 3px;
              height: 3px;
              border-radius: 50%;
              background: ${theme === "dark" ? "rgba(255, 255, 255, 0.09)" : "rgba(0, 0, 0, 0.13)"};
              box-shadow:
                8px 0 0
                  ${theme === "dark" ? "rgba(255, 255, 255, 0.09)" : "rgba(0, 0, 0, 0.13)"},
                16px 0 0
                  ${theme === "dark" ? "rgba(255, 255, 255, 0.09)" : "rgba(0, 0, 0, 0.13)"};
            }
          `,
        }}
      >
        <SplitPane.Cell
          styles={{
            self: css`
              overflow: auto;
              display: flex;
              flex-direction: row;
              scrollbar-width: thin;
              scrollbar-color: rgba(150, 150, 150, 0.5) transparent;
              justify-content: end;
            `,
          }}
        >
          {verseWords.length > 0 && (
            <InterlinearText
              id={`exegesis-${activeChapter}-${activeVerse}`}
              arabicFont={fontArabic}
              words={verseWords}
              shownTranslations={userSettings.wbwTranslations}
              showMeaning
              compact
            />
          )}
        </SplitPane.Cell>

        <SplitPane.Cell
          styles={{
            self: css`
              overflow: auto;
              display: flex;
              flex-direction: row;
            `,
          }}
        >
          <ExegesisScrollArea>
            {activeIds.map((exegesisId) => (
              <ExegesisEntry
                key={exegesisId}
                exegesisId={exegesisId}
                chapterId={activeChapter}
                verseNumber={activeVerse}
                theme={theme}
                onNavigate={setNavTarget}
              />
            ))}
          </ExegesisScrollArea>
        </SplitPane.Cell>
      </SplitPane>
      <TraversalColumn>
        {navTarget && (
          <CircleButton onClick={() => setNavTarget(null)}>
            <RiArrowGoBackLine size={18} />
          </CircleButton>
        )}
        <CircleButton disabled={activeVerse <= 1} onClick={prevVerse}>
          ‹
        </CircleButton>
        <VerseIndicator $theme={theme} data-testid="verse-indicator">
          {activeVerse}
        </VerseIndicator>
        <CircleButton disabled={activeVerse >= maxVerse} onClick={nextVerse}>
          ›
        </CircleButton>
      </TraversalColumn>
    </Outer>
  )
}

function ExegesisEntry({
  exegesisId,
  chapterId,
  verseNumber,
  theme,
  onNavigate,
}: {
  exegesisId: string
  chapterId: number
  verseNumber: number
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
    <Entry $theme={theme} onClick={handleClick}>
      <SourceLabel $theme={theme}>{source?.name ?? exegesisId}</SourceLabel>
      <VerseText
        $theme={theme}
        $loaded={content != null}
        dangerouslySetInnerHTML={
          content
            ? {
                __html: String(
                  marked(parseInlineMarkers(content.translation), {
                    breaks: true,
                  }),
                ),
              }
            : undefined
        }
      />
      {content && (
        <Footnotes
          content={content}
          exegesisId={exegesisId}
          highlightedFn={highlightedFn}
        />
      )}
    </Entry>
  )
}

const Outer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`

const ExegesisScrollArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 0;

  scrollbar-width: thin;
  scrollbar-color: rgba(150, 150, 150, 0.5) transparent;
`

const TraversalColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  flex-shrink: 0;
`

const VerseIndicator = styled.span<{ $theme: string }>`
  font-size: 12px;
  color: ${({ $theme }) => ($theme === "dark" ? "#7a7a7a" : "#999")};
  min-width: 20px;
  text-align: center;
`

const Entry = styled.div<{ $theme: string }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
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
  font-size: 1.25em;
  line-height: 1.7;
  margin: 0;
  color: ${({ $theme, $loaded }) =>
    $loaded
      ? $theme === "dark"
        ? "#d8c7a3"
        : "#1f1f1f"
      : $theme === "dark"
        ? "#555"
        : "#bbb"};
`

const Empty = styled.p<{ $theme: string }>`
  padding: 24px;
  font-size: 1.25em;
  text-align: center;
  color: ${({ $theme }) => ($theme === "dark" ? "#666" : "#999")};
`
