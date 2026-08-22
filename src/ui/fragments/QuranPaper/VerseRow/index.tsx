import { HighlightColor } from "@constants/highlight"
import { ChapterRecord } from "@constants/records/ChapterRecord"
import {
  WordOccurrence,
  WordWithLexemeRecord,
} from "@constants/records/WordRecord"
import { TranslatedWord } from "@constants/records/WordTranslationRecord"
import { getSajdahRuling } from "@constants/SajdahVerse"
import { BasmalaPosition } from "@constants/settings"
import { ThemeMode } from "@constants/theme"
import { repo } from "@db/repo"
import usePaperDialogState from "@hooks/states/PaperDialogState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import useVirtualRowMeasurer from "@hooks/tools/useVirtualRowMeasurer"
import { useWordTranslations } from "@hooks/tools/useWordTranslations"
import { unpackIPC } from "@services/Converter"
import LOGGER from "@services/Logger"
import { makeSnippet } from "@services/mutator"
import { haptic } from "@utils/haptic"
import { useEffect, useMemo, useRef } from "react"
import styled, { css } from "styled-components"
import VerseMarker from "../../VerseMarker"
import { Bismillah } from "./Bismillah"
import InterlinearText from "./InterlinearText"

export type Verse = {
  id: string
  chapter: ChapterRecord
  number: number
  words: WordCell[]
}

export interface WordCell extends WordWithLexemeRecord {
  meanings: Partial<TranslatedWord>
}

/**
 * A single virtualized verse row.
 *
 * Responsibility:
 * - render RTL verse text
 * - measure actual DOM height
 * - report height back to virtualizer
 */
export default function VerseRow({
  verse,
  index,
  style,
  sizeMap,
  virtualizer,
  showTransliteration = false,
  showMeaning = true,
  theme,
}: {
  verse: Verse
  index: number
  style: React.CSSProperties
  sizeMap: React.RefObject<Map<number, number>>
  virtualizer: any
  showTransliteration?: boolean
  showMeaning?: boolean
  theme: ThemeMode
}) {
  const { openLexeme, updateLexemeOccurrences, openExegesis } =
    usePaperDialogState()

  const {
    userSettings: { wbwTranslations },
  } = useUserSettingsState()

  const corpora = useWordTranslations(wbwTranslations)

  const { userSettings, bookmarkVerse } = useUserSettingsState()
  const { basmalaPosition } = userSettings

  const wordTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const verseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const markerColumnRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollEl = virtualizer.scrollElement as HTMLElement
    if (!scrollEl) return

    const update = () => {
      const marker = markerColumnRef.current
      const wrapper = wrapperRef.current

      if (!marker || !wrapper) return

      // Skip for single-row verses — no need for the marker to follow when
      // all words fit on one horizontal line. Detect by comparing the top
      // position of each word element: wrapping means at least one differs.
      const wordEls = wrapper.querySelectorAll<HTMLElement>("[data-word-index]")
      if (wordEls.length > 0) {
        const firstTop = wordEls[0].getBoundingClientRect().top
        const isMultiRow = Array.from(wordEls).some(
          (el) => Math.abs(el.getBoundingClientRect().top - firstTop) > 1,
        )
        if (!isMultiRow) {
          marker.style.transform = ""
          return
        }
      }

      const wrapperRect = wrapper.getBoundingClientRect()
      const scrollRect = scrollEl.getBoundingClientRect()
      const isClippedAtTop = wrapperRect.top < scrollRect.top
      const isStillVisible = wrapperRect.bottom > scrollRect.top

      if (isClippedAtTop && isStillVisible) {
        // Translate by exactly overscroll so the marker top sits at the
        // scroll container's top edge. overflow:hidden on the wrapper clips
        // the marker's bottom when only a small sliver of the row is visible.
        const overscroll = scrollRect.top - wrapperRect.top
        marker.style.transform = `translateY(${overscroll}px)`
      } else {
        marker.style.transform = ""
      }
    }

    // sync to the same rAF loop as the virtualizer
    let rafId: number
    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(update)
    }

    scrollEl.addEventListener("scroll", onScroll, { passive: true })
    update()
    return () => {
      cancelAnimationFrame(rafId)
      scrollEl.removeEventListener("scroll", onScroll)
    }
  }, [virtualizer.scrollElement])

  const ref = useVirtualRowMeasurer({
    index,
    sizeMap,
    virtualizer,
  })

  const findWordsOccurrences = (word: WordCell) => {
    repo.words
      .findOccurrences(word.lexemeId)
      .then((ipcResp) => {
        const rawVerses = unpackIPC(ipcResp)
        const verses = rawVerses.map((v) => {
          const targetIndex = v.words.findIndex(
            (w) => w.order === v.targetOrder,
          )

          // use a deterministic "random" based on the verse so same
          // occurrence to always display identically instead of
          // changing on every render
          const deterministicCounter = () =>
            ((v.chapterId * 31 + v.verse * 17 + v.targetOrder) % 5) + 1

          const shownWords: WordCell[] = makeSnippet(
            v.words,
            targetIndex,
            deterministicCounter,
          ).map((word) => ({
            ...word,
            meanings: Object.fromEntries(
              wbwTranslations.map((locale) => [
                locale,
                corpora[locale]?.[word.chapterId]?.[word.verse]?.[word.order],
              ]),
            ),
          }))

          return {
            ...v,
            words: shownWords,
          }
        })
        const obj: Record<string, WordOccurrence> = {}
        verses.forEach((v) => {
          const key = `${v.chapterId}:${v.verse}`
          obj[key] = v
        })
        updateLexemeOccurrences(obj)
      })
      .catch((e) => LOGGER.error("Failed getting occurrences data", e))
  }

  const highlightColor = userSettings.highlightedVerses[verse.id]
  const highlightHex = highlightColor
    ? HighlightColor.on(theme)[highlightColor]
    : undefined

  const sajdahRuling = getSajdahRuling(
    verse.chapter.id,
    verse.number,
    userSettings.prostrationVersesSchools,
  )

  return (
    <VerseRowWrapper
      data-index={index}
      data-verse={verse.id}
      ref={(el) => {
        if (!el) return
        wrapperRef.current = el
        ref(el)
      }}
      $theme={theme}
      $highlightHex={highlightHex}
      style={{ transform: style.transform }}
      onPointerDown={() => {
        verseTimeoutRef.current = setTimeout(() => {
          haptic()
          openExegesis(verse.chapter.id, verse.number)
        }, 500)
      }}
      onPointerUp={() => clearTimeout(verseTimeoutRef.current!)}
      onPointerLeave={() => clearTimeout(verseTimeoutRef.current!)}
      onPointerCancel={() => clearTimeout(verseTimeoutRef.current!)}
    >
      <VerseMarkerColumn
        data-vmark
        ref={markerColumnRef}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <VerseMarker
          chapterId={verse.chapter.id}
          verseNumber={verse.number}
          containerStyle={css`
            margin-top: 12px;
          `}
        />
      </VerseMarkerColumn>

      <InterlinearText
        showMeaning={showMeaning}
        showTransliteration={showTransliteration}
        id={`${verse.chapter.id}-${verse.id}`}
        arabicFont={userSettings.font.arabic}
        words={verse.words}
        sajdahRuling={sajdahRuling}
        shownTranslations={wbwTranslations}
        withBasmala={
          basmalaPosition === BasmalaPosition.Embedded &&
          Bismillah.isRenderableHere(verse.number, verse.chapter.id)
        }
        onPointerDown={(word) => {
          wordTimeoutRef.current = setTimeout(() => {
            haptic()
            openLexeme(word)
            findWordsOccurrences(word)
          }, 500)
        }}
        onPointerUp={() => clearTimeout(wordTimeoutRef.current!)}
        onPointerLeave={() => clearTimeout(wordTimeoutRef.current!)}
        onPointerCancel={() => clearTimeout(wordTimeoutRef.current!)}
      />
    </VerseRowWrapper>
  )
}

/**
 * Groups words into verses.
 *
 * `words` only ever grows by appending whole chapters during background
 * seeding (never reorders or removes), so a merge keeps every previous
 * element's identity. This groups just the new tail into the same verse map
 * carried over from last time, instead of re-walking every word loaded so
 * far on every single background-seeded chapter.
 */
export function useGroupedVerses(
  chapters: Record<number, ChapterRecord>,
  words: WordCell[],
): Verse[] {
  const prevRef = useRef<{
    words: WordCell[]
    chapters: Record<number, ChapterRecord>
    verseMap: Map<string, Verse>
  } | null>(null)

  return useMemo(() => {
    const prev = prevRef.current
    const isAppend =
      prev != null &&
      prev.chapters === chapters &&
      words.length >= prev.words.length &&
      words[0] === prev.words[0]

    const verseMap = isAppend ? prev!.verseMap : new Map<string, Verse>()
    const newWords = isAppend ? words.slice(prev!.words.length) : words

    for (const word of newWords) {
      const key = `${word.chapterId}:${word.verse}`
      let verse = verseMap.get(key)

      if (!verse) {
        verse = {
          id: key,
          chapter: chapters[word.chapterId],
          number: word.verse,
          words: [],
        }

        verseMap.set(key, verse)
      }

      verse.words.push(word)
    }

    prevRef.current = { words, chapters, verseMap }
    return Array.from(verseMap.values())
  }, [chapters, words])
}

const VerseMarkerColumn = styled.div`
  align-self: start;
  z-index: 1;
`

const VerseRowWrapper = styled.div<{
  $theme: ThemeMode
  $highlightHex?: string
}>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 24px 32px;
  display: grid;
  grid-template-columns: 72px 1fr;
  direction: rtl;
  align-items: start;
  overflow: hidden;

  color: ${({ $theme }) => ($theme === "dark" ? "#d8c7a3" : "#1f1f1f")};
  background: ${({ $theme, $highlightHex }) =>
    $highlightHex ?? ($theme === "dark" ? "#181818" : "#f6f1e7")};
  border-bottom: 1px solid
    ${({ $theme }) => ($theme === "dark" ? "#303030" : "#bfbfbf")};
`

export const Transliteration = styled.span`
  font-size: 14px;
  color: #666;
  margin-top: 4px;
  direction: ltr;
  text-align: center;
`
