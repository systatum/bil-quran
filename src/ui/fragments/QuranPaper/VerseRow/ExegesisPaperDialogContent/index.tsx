import { Asset } from "@constants/assets"
import useChaptersState from "@hooks/states/ChaptersState"
import useExegesisState from "@hooks/states/ExegesisState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { useTranslatedWords, useWords } from "@hooks/tools/useWordTranslations"
import { messages } from "@i18n/message"
import {
  RiArrowDropLeftFill,
  RiArrowDropRightFill,
  RiArrowGoBackLine,
} from "@remixicon/react"
import LOGGER from "@services/Logger"
import { SplitPane } from "@systatum/coneto/split-pane"
import { useTheme } from "@systatum/coneto/theme"
import { marked } from "marked"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useIntl } from "react-intl"
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
  const { formatMessage } = useIntl()
  const { userSettings, setExegesis, setHasSeenExegesisDialog } =
    useUserSettingsState()
  const { loadChapter } = useExegesisState()
  const { chapters, isValidVerse } = useChaptersState()

  useEffect(() => {
    if (userSettings.hasSeenExegesisDialog) return

    if (userSettings.exegesis.length === 0) {
      const defaultId = Asset.defaultExegesisId(userSettings.locale)
      if (defaultId) setExegesis([defaultId])
    }
    setHasSeenExegesisDialog(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const hasExegesis = activeIds.length > 0

  // Verse 0 isn't a real verse — it's a sentinel representing the chapter's
  // introductory discussion, which precedes its verse-by-verse commentary.
  const isChapterIntro = activeVerse === 0
  const isValid = isChapterIntro
    ? chapters?.[activeChapter] != null
    : isValidVerse(activeChapter, activeVerse)

  if (!isValid) {
    return (
      <Outer>
        <Empty $theme={theme}>
          {formatMessage({ id: messages.errors.verseNotFound })}
        </Empty>
      </Outer>
    )
  }

  return (
    <Outer>
      <SplitPane
        orientation="horizontal"
        initialSizeRatio={
          isChapterIntro ? [0, 1] : hasExegesis ? [0.3, 0.7] : [0.7, 0.3]
        }
        styles={{
          self: css`
            padding-left: 1em;
            padding-right: 0.5em;
          `,
          dividerStyle: css`
            border-top: 3px solid transparent;
            border-bottom: 3px solid transparent;
            height: 8px;
            overflow: visible;
            position: relative;
            background: linear-gradient(
              to bottom,
              transparent 0%,
              ${theme === "dark"
                  ? "rgba(0, 0, 0, 0.22)"
                  : "rgba(0, 0, 0, 0.07)"}
                30%,
              ${theme === "dark"
                  ? "rgba(0, 0, 0, 0.08)"
                  : "rgba(0, 0, 0, 0.02)"}
                65%,
              ${theme === "dark"
                  ? "rgba(255, 255, 255, 0.03)"
                  : "rgba(255, 255, 255, 0.60)"}
                85%,
              transparent 100%
            );
            box-shadow: 0 4px 8px
              ${theme === "dark"
                ? "rgba(0, 0, 0, 0.12)"
                : "rgba(0, 0, 0, 0.04)"};
            margin: 2px 10px;

            &::after {
              content: "";
              position: absolute;
              left: 14px;
              top: 50%;
              transform: translateY(-50%);
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: ${theme === "dark"
                ? "rgba(255, 255, 255, 0.09)"
                : "rgba(0, 0, 0, 0.13)"};
              box-shadow:
                10px 0 0
                  ${theme === "dark"
                    ? "rgba(255, 255, 255, 0.09)"
                    : "rgba(0, 0, 0, 0.13)"},
                20px 0 0
                  ${theme === "dark"
                    ? "rgba(255, 255, 255, 0.09)"
                    : "rgba(0, 0, 0, 0.13)"};
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
          {!isChapterIntro && verseWords.length > 0 && (
            <InterlinearText
              id={`exegesis-${activeChapter}-${activeVerse}`}
              arabicFont={fontArabic}
              words={verseWords}
              shownTranslations={userSettings.wbwTranslations}
              showMeaning
              compact
              smaller
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
          {hasExegesis ? (
            <ExegesisScrollArea>
              {activeIds.map((exegesisId) => (
                <ExegesisEntry
                  key={exegesisId}
                  exegesisId={exegesisId}
                  chapterId={activeChapter}
                  verseNumber={activeVerse}
                  isChapterIntro={isChapterIntro}
                  theme={theme}
                  onNavigate={setNavTarget}
                />
              ))}
            </ExegesisScrollArea>
          ) : (
            <Empty $theme={theme}>
              No exegesis selected — enable one in Settings.
            </Empty>
          )}
        </SplitPane.Cell>
      </SplitPane>
      <TraversalColumn>
        {navTarget && (
          <CircleButton onClick={() => setNavTarget(null)}>
            <RiArrowGoBackLine size={18} />
          </CircleButton>
        )}
        <CircleButton
          data-testid="prev-verse-btn"
          disabled={activeVerse <= 0}
          onClick={prevVerse}
        >
          <RiArrowDropLeftFill />
        </CircleButton>
        <VerseIndicator $theme={theme} data-testid="verse-indicator">
          {isChapterIntro ? "Intro" : activeVerse}
        </VerseIndicator>
        <CircleButton
          data-testid="next-verse-btn"
          disabled={activeVerse >= maxVerse}
          onClick={nextVerse}
        >
          <RiArrowDropRightFill />
        </CircleButton>
      </TraversalColumn>
    </Outer>
  )
}

function ExegesisEntry({
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
    <Entry $theme={theme} onClick={handleClick}>
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
      ) : (
        <TranslationText $theme={theme}>
          <TranslationTextContent
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
        </TranslationText>
      )}
      {content?.exegesis && (
        <VerseText
          $theme={theme}
          $loaded
          dangerouslySetInnerHTML={{
            __html: String(
              marked(parseInlineMarkers(content.exegesis), {
                breaks: true,
              }),
            ),
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

  ul,
  ol {
    padding-left: 2em;
    margin-bottom: 0.9em;
  }
  ol {
    list-style: number;
  }

  h1 {
    font-size: 2.4em;
  }
  h2 {
    font-size: 2.1em;
  }
  h3 {
    font-size: 1.9em;
  }
  h4 {
    font-size: 1.6em;
  }
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

const TranslationText = styled.div<{ $theme: string }>`
  position: relative;
  overflow: hidden;
  padding: 24px 18px 14px 36px;
  border-radius: 8px;
  border-left: 3px solid
    ${({ $theme }) =>
      $theme === "dark" ? "rgba(200, 169, 110, 0.35)" : "rgba(138, 96, 48, 0.3)"};
  background: ${({ $theme }) =>
    $theme === "dark" ? "rgba(200, 169, 110, 0.05)" : "rgba(138, 96, 48, 0.05)"};

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

const Empty = styled.p<{ $theme: string }>`
  flex: 1;
  padding: 24px;
  font-size: 0.95em;
  text-align: center;
  color: ${({ $theme }) => ($theme === "dark" ? "#666" : "#999")};
`
