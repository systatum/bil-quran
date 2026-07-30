import { Asset } from "@constants/assets"
import { getSajdahRuling } from "@constants/SajdahVerse"
import useChaptersState from "@hooks/states/ChaptersState"
import useExegesisState from "@hooks/states/ExegesisState"
import usePaperDialogState, {
  assertPaperDialogContent,
} from "@hooks/states/PaperDialogState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { useTranslatedWords, useWords } from "@hooks/tools/useWordTranslations"
import { messages } from "@i18n/message"
import {
  RiArrowDropLeftFill,
  RiArrowDropRightFill,
  RiArrowGoBackLine,
  RiSkipUpLine,
} from "@remixicon/react"
import LOGGER from "@services/Logger"
import { SplitPane } from "@systatum/coneto/split-pane"
import { useTheme } from "@systatum/coneto/theme"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { useIntl } from "react-intl"
import styled, { css } from "styled-components"
import CircleButton from "../../CircleButton"
import VerseBookmarker from "../../VerseBookmarker"
import InterlinearText from "../InterlinearText"
import Carousel from "./Carousel"
import Entry from "./Entry"

export type NavTarget = { chapterId: number; verse: number }

export default function ExegesisPaperDialogContent() {
  const exegesisContent = usePaperDialogState((s) => s.content)
  assertPaperDialogContent(exegesisContent, "exegesis")
  const { chapterId, verseNumber } = exegesisContent

  const { mode: theme } = useTheme()
  const { formatMessage } = useIntl()
  const navigate = useNavigate()
  const {
    userSettings,
    setExegesis,
    setHasSeenExegesisDialog,
    setScrollPosition,
  } = useUserSettingsState()
  const { loadChapter } = useExegesisState()
  const { chapters, isValidVerse } = useChaptersState()

  useEffect(() => {
    if (userSettings.hasSeenExegesisDialog) return

    if (userSettings.exegesis.length === 0) {
      const defaultId = Asset.defaultExegesisId(userSettings.locale)
      if (defaultId) setExegesis([defaultId])
    }
    setHasSeenExegesisDialog(true)
  }, [])

  const [currentVerse, setCurrentVerse] = useState(verseNumber)
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  // Scroll position to return to after a footnote jump
  const [footnoteReturnScrollTop, setFootnoteReturnScrollTop] = useState<
    number | null
  >(null)

  useEffect(() => {
    setCurrentVerse(verseNumber)
    setNavTarget(null)
  }, [verseNumber, chapterId])

  const activeChapter = navTarget?.chapterId ?? chapterId
  const activeVerse = navTarget?.verse ?? currentVerse

  // Any verse/chapter change (prev/next or Q-marker navigation) invalidates
  // the footnote-jump memory; the content it pointed into is gone.
  useEffect(() => {
    setFootnoteReturnScrollTop(null)
  }, [activeChapter, activeVerse])

  const handleFootnoteClick = () => {
    if (footnoteReturnScrollTop != null) return
    setFootnoteReturnScrollTop(scrollAreaRef.current?.scrollTop ?? 0)
  }

  const returnFromFootnote = () => {
    scrollAreaRef.current?.scrollTo({
      top: footnoteReturnScrollTop ?? 0,
      behavior: "smooth",
    })
    setFootnoteReturnScrollTop(null)
  }

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

  const persistScrollPosition = (chapter: number, verse: number) => {
    if (verse === 0) return // the "Intro" sentinel for chapter prelude/context
    setScrollPosition(chapter, verse)
  }

  const goToVerse = (delta: number) => {
    const verse = activeVerse + delta
    if (navTarget) setNavTarget((t) => t && { ...t, verse })
    else setCurrentVerse(verse)
    persistScrollPosition(activeChapter, verse)
    navigate({
      to: "/e/$chapter/$verse",
      params: { chapter: String(activeChapter), verse: String(verse) },
      replace: true,
    })
  }
  const prevVerse = () => goToVerse(-1)
  const nextVerse = () => goToVerse(1)

  const hasExegesis = activeIds.length > 0

  const sajdahRuling = getSajdahRuling(
    activeChapter,
    activeVerse,
    userSettings.prostrationVersesSchools,
  )

  // Verse 0 is a sentinel for the chapter's introductory discussion.
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
              sajdahRuling={sajdahRuling}
              shownTranslations={userSettings.wbwTranslations}
              showMeaning
              showTransliteration={userSettings.showTransliteration}
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
            <ExegesisScrollArea $theme={theme} ref={scrollAreaRef}>
              {activeIds.length > 1 ? (
                <Carousel
                  exegesisIds={activeIds}
                  chapterId={activeChapter}
                  verseNumber={activeVerse}
                  isChapterIntro={isChapterIntro}
                  theme={theme}
                  onNavigate={setNavTarget}
                  onFootnoteClick={handleFootnoteClick}
                />
              ) : (
                <Entry
                  exegesisId={activeIds[0]}
                  chapterId={activeChapter}
                  verseNumber={activeVerse}
                  isChapterIntro={isChapterIntro}
                  theme={theme}
                  onNavigate={setNavTarget}
                  onFootnoteClick={handleFootnoteClick}
                />
              )}
            </ExegesisScrollArea>
          ) : (
            <Empty $theme={theme}>
              No exegesis selected — enable one in Settings.
            </Empty>
          )}
        </SplitPane.Cell>
      </SplitPane>
      <TraversalColumn>
        <CircleButton
          data-testid="next-verse-btn"
          aria-label="next-verse-btn"
          disabled={activeVerse >= maxVerse}
          onClick={nextVerse}
        >
          <RiArrowDropRightFill />
        </CircleButton>
        <VerseIndicator
          $theme={theme}
          data-testid="verse-indicator"
          aria-label="verse-indicator"
        >
          {isChapterIntro ? "Intro" : activeVerse}
        </VerseIndicator>
        <CircleButton
          data-testid="prev-verse-btn"
          aria-label="prev-verse-btn"
          disabled={activeVerse <= 0}
          onClick={prevVerse}
        >
          <RiArrowDropLeftFill />
        </CircleButton>
        {navTarget && (
          <CircleButton
            data-testid="nav-back-btn"
            aria-label="nav-back-btn"
            onClick={() => setNavTarget(null)}
          >
            <RiArrowGoBackLine size={18} />
          </CircleButton>
        )}
        {!isChapterIntro && (
          <VerseBookmarker
            chapterId={activeChapter}
            verseNumber={activeVerse}
            showExegesisOption={false}
          />
        )}
        {footnoteReturnScrollTop != null && (
          <CircleButton
            data-testid="footnote-return-btn"
            aria-label="footnote-return-btn"
            onClick={returnFromFootnote}
          >
            <RiSkipUpLine size={18} />
          </CircleButton>
        )}
      </TraversalColumn>
    </Outer>
  )
}

const Outer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  /* No overflow:hidden here, it would steal the sticky containing block from TraversalColumn. */
  overflow: visible;
`

const ExegesisScrollArea = styled.div<{ $theme: string }>`
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

  h1,
  h2,
  h3,
  h4 {
    color: ${({ $theme }) => ($theme === "dark" ? "#ccae6c" : "inherit")};
  }

  strong {
    font-weight: bolder;
  }

  /* allow vertical scrolling but hide scrollbar */
  overflow-y: auto;
  overflow-x: hidden;
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

const TraversalColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  flex-shrink: 0;
  /* Stays pinned to the top of whichever ancestor ends up scrolling (the
     SplitPane cells scroll internally, but very long content can still push
     the outer paper-dialog wrapper itself into scrolling) so the verse
     traversal controls never scroll out of view. */
  position: sticky;
  top: 0;
  align-self: flex-start;
`

const VerseIndicator = styled.span<{ $theme: string }>`
  font-size: 12px;
  color: ${({ $theme }) => ($theme === "dark" ? "#7a7a7a" : "#999")};
  min-width: 20px;
  text-align: center;
`

const Empty = styled.p<{ $theme: string }>`
  flex: 1;
  padding: 24px;
  font-size: 0.95em;
  text-align: center;
  color: ${({ $theme }) => ($theme === "dark" ? "#666" : "#999")};
`
