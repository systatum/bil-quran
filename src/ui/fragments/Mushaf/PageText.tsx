import { ThemeMode } from "@constants/theme"
import usePaginationState from "@hooks/states/PaginationState"
import useUserSettingsState, {
  FontSetting,
} from "@hooks/states/UserSettingsState"
import useWordsState from "@hooks/states/WordsState"
import { Fragment, useEffect, useMemo } from "react"
import styled, { css } from "styled-components"
import { Bismillah } from "../QuranPaper/VerseRow/Bismillah"
import VerseMarker from "../VerseMarker"

interface PageTextProps {
  pageNumber: number
}

interface PageVerse {
  chapterId: number
  verseNumber: number
  text: string
}

const LINE_HEIGHT = 2

// viewport width tiers the text and verse marker both scale down at, so a
// smaller screen fits more of the page without needing to zoom
const PHONE_BREAKPOINT = 768 // iPad mini and narrower
const TABLET_BREAKPOINT = 1024 // up to iPad Pro
const PHONE_SCALE = 0.48 // 52% reduction
const TABLET_SCALE = 0.8 // 20% reduction

export default function PageText({ pageNumber }: PageTextProps) {
  const { juzPages, loadPagination } = usePaginationState()
  const { words, loadWords } = useWordsState()
  const {
    userSettings: { font, theme },
  } = useUserSettingsState()

  useEffect(() => {
    loadPagination()
  }, [])

  const page = useMemo(
    () => juzPages.flat()[pageNumber - 1],
    [juzPages, pageNumber],
  )

  useEffect(() => {
    page?.chapterIds.forEach((chapterId) => loadWords(chapterId))
  }, [page])

  const verses: PageVerse[] = useMemo(() => {
    if (!page) return []

    return page.chapterIds.flatMap((chapterId, i) => {
      const [start, end] = page.verseNumbers[i]
      const result: PageVerse[] = []
      for (let verseNumber = start; verseNumber <= end; verseNumber++) {
        const text = words
          .filter((w) => w.chapterId === chapterId && w.verse === verseNumber)
          .sort((a, b) => a.order - b.order)
          .map((w) => w.token)
          .join(" ")
        if (text) result.push({ chapterId, verseNumber, text })
      }
      return result
    })
  }, [page, words])

  if (!page) return null

  return (
    <PageWrapper $font={font.arabic} $theme={theme}>
      {verses.map(({ chapterId, verseNumber, text }) => (
        <Fragment key={`${chapterId}:${verseNumber}`}>
          {Bismillah.isRenderableHere(verseNumber, chapterId) && <Bismillah />}
          {text}{" "}
          <VerseMarker
            chapterId={chapterId}
            verseNumber={verseNumber}
            containerStyle={css`
              display: inline-flex;
              vertical-align: middle;

              /* zoom, not transform: scale - transform only repaints
                 smaller, it doesn't shrink the marker's own layout box,
                 so it would still force the line taller than the text */
              @media (max-width: ${PHONE_BREAKPOINT}px) {
                zoom: ${PHONE_SCALE};
              }
              @media (min-width: ${PHONE_BREAKPOINT +
                1}px) and (max-width: ${TABLET_BREAKPOINT}px) {
                zoom: ${TABLET_SCALE};
              }
            `}
          />{" "}
        </Fragment>
      ))}
    </PageWrapper>
  )
}

const PageWrapper = styled.div<{ $font: FontSetting; $theme: ThemeMode }>`
  width: 100%;
  /* min-height, not height: overflowing text must still be inside this box
     so its background follows the content, instead of stopping at 100%
     and showing the wrapper behind it underneath the overflow */
  min-height: 100%;
  padding: 16px;
  box-sizing: border-box;
  direction: rtl;
  text-align: justify;
  line-height: ${LINE_HEIGHT};
  font-size: ${({ $font }) => $font.size}px;
  font-family: "${({ $font }) => $font.family}", "NotoNaskhArabic", serif;
  color: ${({ $theme }) => ($theme === "dark" ? "#d8c7a3" : "#1f1f1f")};
  background-color: ${({ $theme }) =>
    $theme === "dark" ? "#181818" : "#f6f1e7"};

  /* background-clip must also be content-box, or the pattern
     bleeds backward into the padding above and shows as a stray top line */
  background-origin: content-box;
  background-clip: content-box;
  background-image: ${({ $theme }) => {
    const lineColor =
      $theme === "dark" ? "rgba(216, 199, 163, 0.3)" : "rgba(31, 31, 31, 0.25)"
    return `repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent calc(${LINE_HEIGHT}em - 1px),
      ${lineColor} calc(${LINE_HEIGHT}em - 1px),
      ${lineColor} ${LINE_HEIGHT}em
    )`
  }};

  @media (max-width: ${PHONE_BREAKPOINT}px) {
    font-size: ${({ $font }) => $font.size * PHONE_SCALE}px;
  }
  @media (min-width: ${PHONE_BREAKPOINT +
    1}px) and (max-width: ${TABLET_BREAKPOINT}px) {
    font-size: ${({ $font }) => $font.size * TABLET_SCALE}px;
  }
`
