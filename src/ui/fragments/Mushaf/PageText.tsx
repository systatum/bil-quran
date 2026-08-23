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
const MARKER_SIZE = 42 // native width/height of the CircleButton, in px

// viewport width tiers the text and verse marker both scale down at, so a
// smaller screen fits more of the page without needing to zoom
const PHONE_BREAKPOINT = 768 // iPad mini and narrower
const TABLET_BREAKPOINT = 1024 // up to iPad Pro
const PHONE_SCALE = 0.48 // 52% reduction
const TABLET_SCALE = 0.8 // 20% reduction

// the Bismillah glyph is fixed-size and doesn't inherit PageWrapper's own
// font-size, so it needs its own (steeper) reduction at every tier to avoid
// dwarfing the shrunk-down verse text around it
const BISMILLAH_SIZE = 44 // BismillahContainer's native font-size, in px
const BISMILLAH_MARGIN_TOP = -33 // BismillahContainer's native margin-top, in px
const BISMILLAH_SCALE = 0.8 // 20% smaller
const BISMILLAH_TABLET_SCALE = 0.65 // 35% smaller
const BISMILLAH_PHONE_SCALE = 0.4 // 60% smaller

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
    <PageWrapper className="mushaf-page-text" $font={font.arabic} $theme={theme}>
      {verses.map(({ chapterId, verseNumber, text }) => (
        <Fragment key={`${chapterId}:${verseNumber}`}>
          {Bismillah.isRenderableHere(verseNumber, chapterId) && (
            <Bismillah
              containerStyle={css`
                font-size: ${BISMILLAH_SIZE * BISMILLAH_SCALE}px;
                margin-top: ${BISMILLAH_MARGIN_TOP * BISMILLAH_SCALE}px;

                @media (max-width: ${PHONE_BREAKPOINT}px) {
                  font-size: ${BISMILLAH_SIZE * BISMILLAH_PHONE_SCALE}px;
                  margin-top: ${BISMILLAH_MARGIN_TOP *
                  BISMILLAH_PHONE_SCALE}px;
                }
                @media (min-width: ${PHONE_BREAKPOINT +
                  1}px) and (max-width: ${TABLET_BREAKPOINT}px) {
                  font-size: ${BISMILLAH_SIZE * BISMILLAH_TABLET_SCALE}px;
                  margin-top: ${BISMILLAH_MARGIN_TOP *
                  BISMILLAH_TABLET_SCALE}px;
                }
              `}
            />
          )}
          {text}{" "}
          <VerseMarker
            chapterId={chapterId}
            verseNumber={verseNumber}
            containerStyle={css`
              display: inline-flex;
              /* stops PageWrapper's line-height: 2 from inheriting into
                 the marker's number and pushing the glyph off-center */
              line-height: normal;
              /* the marker's own number is Latin digits, not Arabic - the
                 Quranic font's Latin glyphs sit at a different baseline
                 than a normal UI font, which reads as "pushed up" */
              font-family:
                -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
                sans-serif;

              /* vertical-align: middle aligns to the surrounding text's
                 x-height, not the true center of an 85px line - that gap
                 grows with line-height and is font-metric dependent, so
                 "top" (a fixed reference) plus a computed margin centers
                 it exactly instead, regardless of the font in use */
              vertical-align: top;
              margin-top: calc((${LINE_HEIGHT}em - ${MARKER_SIZE}px) / 2);

              /* zoom, not transform: scale - transform only repaints
                 smaller, it doesn't shrink the marker's own layout box,
                 so it would still force the line taller than the text.
                 zoom also rescales margin-top itself though, so the
                 formula divides by scale again to cancel that out */
              @media (max-width: ${PHONE_BREAKPOINT}px) {
                zoom: ${PHONE_SCALE};
                margin-top: calc(
                  ${LINE_HEIGHT}em / (2 * ${PHONE_SCALE}) - ${MARKER_SIZE /
                    2}px
                );
              }
              @media (min-width: ${PHONE_BREAKPOINT +
                1}px) and (max-width: ${TABLET_BREAKPOINT}px) {
                zoom: ${TABLET_SCALE};
                margin-top: calc(
                  ${LINE_HEIGHT}em / (2 * ${TABLET_SCALE}) - ${MARKER_SIZE /
                    2}px
                );
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
