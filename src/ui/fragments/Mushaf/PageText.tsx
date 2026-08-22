import { ThemeMode } from "@constants/theme"
import usePaginationState from "@hooks/states/PaginationState"
import useUserSettingsState, { FontSetting } from "@hooks/states/UserSettingsState"
import useWordsState from "@hooks/states/WordsState"
import { Fragment, useEffect, useMemo } from "react"
import styled, { css } from "styled-components"
import VerseMarker from "../VerseMarker"
import { Bismillah } from "../QuranPaper/VerseRow/Bismillah"

interface PageTextProps {
  pageNumber: number
}

interface PageVerse {
  chapterId: number
  verseNumber: number
  text: string
}

const LINE_HEIGHT = 2

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
              margin: 0 6px;
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
  font-family:
    "${({ $font }) => $font.family}", "NotoNaskhArabic", serif;
  color: ${({ $theme }) => ($theme === "dark" ? "#d8c7a3" : "#1f1f1f")};
  background-color: ${({ $theme }) =>
    $theme === "dark" ? "#181818" : "#f6f1e7"};

  /* one ruled line per rendered text line, independent of verse boundaries,
     via a repeating tile colored only in its last 1px. background-clip must
     also be content-box, or the pattern bleeds backward into the padding
     above and can show as a stray line above the first line of text */
  background-origin: content-box;
  background-clip: content-box;
  background-image: ${({ $font, $theme }) => {
    const lineHeight = $font.size * LINE_HEIGHT
    const lineColor =
      $theme === "dark" ? "rgba(216, 199, 163, 0.3)" : "rgba(31, 31, 31, 0.25)"
    return `repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent ${lineHeight - 1}px,
      ${lineColor} ${lineHeight - 1}px,
      ${lineColor} ${lineHeight}px
    )`
  }};
`
