import { HighlightColor } from "@constants/highlight"
import { ThemeMode } from "@constants/theme"
import usePaginationState from "@hooks/states/PaginationState"
import usePaperDialogState from "@hooks/states/PaperDialogState"
import useUserSettingsState, {
  FontSetting,
} from "@hooks/states/UserSettingsState"
import useWordsState from "@hooks/states/WordsState"
import useWordOccurrencesFinder from "@hooks/tools/useWordOccurrencesFinder"
import { useTranslatedWords } from "@hooks/tools/useWordTranslations"
import { haptic } from "@utils/haptic"
import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import styled, { css } from "styled-components"
import { WordCell } from "../QuranPaper/VerseRow"
import { Bismillah } from "../QuranPaper/VerseRow/Bismillah"
import VerseMarker from "../VerseMarker"

interface PageTextProps {
  pageNumber: number
  /** if true, will use tablet-sized text/glyphs instead of wide-screen sizing on wide-screen devices */
  forceTabletScale?: boolean
}

interface PageVerse {
  chapterId: number
  verseNumber: number
  words: WordCell[]
}

const LINE_HEIGHT = 2
const MARKER_SIZE = 42 // native width/height of the CircleButton, in px

// viewport width tiers the text and verse marker both scale down at, so a
// smaller screen fits more of the page without needing to zoom
const PHONE_BREAKPOINT = 568
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

export default function PageText({
  pageNumber,
  forceTabletScale = false,
}: PageTextProps) {
  const { juzPages, loadPagination } = usePaginationState()
  const { words, loadWords } = useWordsState()
  const {
    userSettings: { font, theme, wbwTranslations, highlightedVerses, forceFit },
  } = useUserSettingsState()
  const { openLexeme } = usePaperDialogState()
  const findWordsOccurrences = useWordOccurrencesFinder()
  const translatedWords = useTranslatedWords(words, wbwTranslations)

  // to clear each press on a word for lexeme root detail
  const wordTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // where the press started, so a page-turn drag starting on a word cancels
  // the lexeme dialog instead of opening it
  const wordStartPosRef = useRef<{ x: number; y: number } | null>(null)

  const wrapperRef = useRef<HTMLDivElement>(null)

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
        const verseWords = translatedWords
          .filter((w) => w.chapterId === chapterId && w.verse === verseNumber)
          .sort((a, b) => a.order - b.order)
        if (verseWords.length > 0)
          result.push({ chapterId, verseNumber, words: verseWords })
      }
      return result
    })
  }, [page, translatedWords])

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    const container = wrapper?.parentElement
    if (!wrapper || !container) return

    // Set font-size and marker line-pitch safety together as plain DOM
    // mutations, not React state; a marker resized only on next render
    // would still be at its old size during this measurement.
    const applyFontSize = (size: number | "") => {
      wrapper.style.fontSize = size === "" ? "" : `${size}px`
      const fontPx = parseFloat(getComputedStyle(wrapper).fontSize)
      const safety = Math.min(1, (LINE_HEIGHT * fontPx) / MARKER_SIZE)
      wrapper.style.setProperty("--marker-safety", String(safety))
    }

    // Start from a clean slate before measuring; a leftover size from a
    // previous page or wider viewport would corrupt it.
    const recalculate = () => {
      applyFontSize("")

      if (!forceFit) return

      // min-height: 100% hides whether content barely overflows; neutralizing it reveals true content height.
      wrapper.style.minHeight = "0"

      // Hold the container's scrollbar hidden during the search so width stays constant;
      // or a tentative scrollbar shaves pixels and inflates line counts for larger candidates.
      const previousOverflow = container.style.overflowY
      container.style.overflowY = "hidden"

      // round to whole pixels, and a verse marker tip onto its own trailing line; a generous
      // margin keeps "fits" decisions clear of both rounding & marker overflow.
      const fits = () =>
        wrapper.scrollHeight <= container.clientHeight - FIT_SAFETY_MARGIN

      // the existing (breakpoint-aware) CSS default already fits - no
      // need to override it with a forced size
      if (fits()) {
        wrapper.style.minHeight = ""
        container.style.overflowY = previousOverflow
        return
      }

      const fitsAt = (size: number) => {
        applyFontSize(size)
        return fits()
      }

      // Binary search for the largest size that fits; a percentage step would overshoot,
      // leaving empty lines whenever a small size change drops a whole line of text.
      let lo = MIN_FIT_FONT_SIZE
      let hi = font.arabic.size
      if (fitsAt(lo)) {
        for (let i = 0; i < FIT_SEARCH_ITERATIONS; i++) {
          const mid = (lo + hi) / 2
          if (fitsAt(mid)) lo = mid
          else hi = mid
        }
        fitsAt(lo)
      } // else doesn't fit even at the floor - best effort, leave it there

      wrapper.style.minHeight = ""
      container.style.overflowY = previousOverflow
    }

    recalculate()

    // Re-check after the Arabic webfont loads; first measurements against fallback
    // font metrics can misestimate fit.
    let cancelled = false
    document.fonts?.ready?.then(() => {
      if (!cancelled) recalculate()
    })

    const observer = new ResizeObserver(recalculate)
    observer.observe(forceFit ? container : wrapper)

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [forceFit, font.arabic.size, font.arabic.family, verses, forceTabletScale])

  if (!page) return null

  // Combines zoom tier scale with --marker-safety into one zoom;
  // margin-top re-derived so the marker stays centered.
  const markerZoomStyle = (tierScale: number) => css`
    zoom: calc(var(--marker-safety, 1) * ${tierScale});
    margin-top: calc(
      ${LINE_HEIGHT}em / (2 * var(--marker-safety, 1) * ${tierScale}) -
        ${MARKER_SIZE / 2}px
    );
  `

  return (
    <PageWrapper
      ref={wrapperRef}
      className="mushaf-page-text"
      $font={font.arabic}
      $theme={theme}
      $forceTabletScale={forceTabletScale}
    >
      {verses.map(({ chapterId, verseNumber, words: verseWords }) => {
        const highlightColor = highlightedVerses[`${chapterId}:${verseNumber}`]
        const highlightHex = highlightColor
          ? HighlightColor.on(theme)[highlightColor]
          : undefined

        return (
          <HighlightSpan
            key={`${chapterId}:${verseNumber}`}
            $color={highlightHex}
          >
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

                  ${forceTabletScale &&
                  css`
                    font-size: ${BISMILLAH_SIZE * BISMILLAH_TABLET_SCALE}px;
                    margin-top: ${BISMILLAH_MARGIN_TOP *
                    BISMILLAH_TABLET_SCALE}px;
                  `}
                `}
              />
            )}
            {verseWords.map((word, index) => (
              <WordSpan
                key={`${word.chapterId}-${word.verse}-${word.order}`}
                // no stopPropagation here to support drag gesture for page turn, etc
                onPointerDown={(e) => {
                  wordStartPosRef.current = { x: e.clientX, y: e.clientY }
                  wordTimeoutRef.current = setTimeout(() => {
                    haptic()
                    openLexeme(word)
                    findWordsOccurrences(word)
                  }, 500)
                }}
                onPointerMove={(e) => {
                  const start = wordStartPosRef.current
                  if (!start) return
                  const moved = Math.hypot(
                    e.clientX - start.x,
                    e.clientY - start.y,
                  )
                  // finger is dragging (eg. to turn the page), not holding
                  // still - don't also open the lexeme dialog
                  if (moved > MOVE_CANCEL_THRESHOLD)
                    clearTimeout(wordTimeoutRef.current!)
                }}
                onPointerUp={() => clearTimeout(wordTimeoutRef.current!)}
                onPointerLeave={() => clearTimeout(wordTimeoutRef.current!)}
                onPointerCancel={() => clearTimeout(wordTimeoutRef.current!)}
              >
                {/* a non-breaking space before the marker glues it to the
                    last word, so it can't strand alone on its own line */}
                {word.token}
                {index === verseWords.length - 1 ? " " : " "}
              </WordSpan>
            ))}
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
                ${markerZoomStyle(1)}

                /* zoom, not transform: scale - transform only repaints
                 smaller, it doesn't shrink the marker's own layout box,
                 so it would still force the line taller than the text.
                 zoom also rescales margin-top itself though, so the
                 formula divides by scale again to cancel that out */
              @media (max-width: ${PHONE_BREAKPOINT}px) {
                  ${markerZoomStyle(PHONE_SCALE)}
                }
                @media (min-width: ${PHONE_BREAKPOINT +
                  1}px) and (max-width: ${TABLET_BREAKPOINT}px) {
                  ${markerZoomStyle(TABLET_SCALE)}
                }

                ${forceTabletScale && markerZoomStyle(TABLET_SCALE)}
              `}
            />{" "}
          </HighlightSpan>
        )
      })}
    </PageWrapper>
  )
}

const WordSpan = styled.span.attrs({ className: "mushaf-word" })`
  cursor: pointer;
  user-select: none;
`

// how far (px) the finger must move during a word's long-press for it to be
// treated as a page-turn drag instead, cancelling the lexeme dialog
const MOVE_CANCEL_THRESHOLD = 10

const HighlightSpan = styled.span<{ $color?: string }>`
  background-color: ${({ $color }) => $color ?? "transparent"};
`

// force fit binary-searches within this range for the largest font size
// that fits the page's content with no scrollbar
const MIN_FIT_FONT_SIZE = 6
const FIT_SEARCH_ITERATIONS = 12 // ~0.01px precision over a 40px range
// scrollHeight/clientHeight round to whole pixels, and a verse marker
// tipping onto its own trailing line adds more height than a sub-pixel
// fraction would - this margin keeps every fit comfortably clear of both
const FIT_SAFETY_MARGIN = 8

const PageWrapper = styled.div<{
  $font: FontSetting
  $theme: ThemeMode
  $forceTabletScale: boolean
}>`
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

  ${({ $forceTabletScale, $font }) =>
    $forceTabletScale &&
    css`
      font-size: ${$font.size * TABLET_SCALE}px;
    `}
`
