import { ChapterRecord } from "@constants/records/ChapterRecord"
import {
  WordOccurrence,
  WordWithLexemeRecord,
} from "@constants/records/WordRecord"
import { TranslatedWord } from "@constants/records/WordTranslationRecord"
import { BasmalaPosition } from "@constants/settings"
import { ThemeMode } from "@constants/theme"
import { repo } from "@db/repo"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import useAligner from "@hooks/tools/useAligner"
import useVirtualRowMeasurer from "@hooks/tools/useVirtualRowMeasurer"
import { useWordTranslations } from "@hooks/tools/useWordTranslations"
import { messages } from "@i18n/message"
import { RiFileMarkedLine, RiPencilAi2Line } from "@remixicon/react"
import { unpackIPC } from "@services/Converter"
import LOGGER from "@services/Logger"
import { makeSnippet } from "@services/mutator"
import { Button } from "@systatum/coneto/button"
import { PaperDialog, PaperDialogRef } from "@systatum/coneto/paper-dialog"
import { haptic } from "ios-haptics"
import { useEffect, useRef, useState } from "react"
import { useIntl } from "react-intl"
import styled, { css } from "styled-components"
import { Bismillah } from "./Bismillah"
import InterlinearText from "./InterlinearText"
import { LexemeDetailPaperDialog } from "./LexemeDetailPaperDialog"
import NoteVerseDialog from "./NoteDialog"

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
  const [content, setContent] = useState<WordCell | undefined>(undefined)
  const [showNoteVerseDialog, setShowNoteVerseDialog] = useState<boolean>(false)
  const [verseKey, setVerseKey] = useState<string>("")
  const [occurrences, setOccurrences] = useState<
    Record<string, WordOccurrence>
  >({})

  const {
    userSettings: { wbwTranslations },
  } = useUserSettingsState()

  const [isTipMenuOpen, setIsTipMenuOpen] = useState(false)

  const corpora = useWordTranslations(wbwTranslations)

  const { userSettings, bookmarkVerse } = useUserSettingsState()
  const { basmalaPosition } = userSettings

  const paperDialogRef = useRef<PaperDialogRef>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const markerColumnRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const lastWordRef = useRef<HTMLSpanElement | null>(null)

  const { formatMessage } = useIntl()

  useEffect(() => {
    const scrollEl = virtualizer.scrollElement as HTMLElement
    if (!scrollEl) return

    const update = () => {
      const marker = markerColumnRef.current
      const wrapper = wrapperRef.current
      const lastWord = lastWordRef.current

      if (!marker || !wrapper) return

      const lastWordHeight =
        (lastWord?.getBoundingClientRect().height ?? 0) + 50

      if (wrapper.getBoundingClientRect().height < 170) {
        marker.style.transform = ""
        return
      }

      const wrapperRect = wrapper.getBoundingClientRect()
      const scrollRect = scrollEl.getBoundingClientRect()
      const isClippedAtTop = wrapperRect.top < scrollRect.top
      const isStillVisible = wrapperRect.bottom > scrollRect.top

      if (isClippedAtTop && isStillVisible) {
        const overscroll = scrollRect.top - wrapperRect.top
        const maxTranslate = wrapperRect.height - lastWordHeight
        const translate = Math.max(0, Math.min(overscroll, maxTranslate))
        marker.style.transform = `translateY(${translate}px)`
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

  const { wordRefs, wordRows, rowLayerHeights } = useAligner({
    key: verse.id,
  })
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
        setOccurrences(obj)
      })
      .catch((e) => LOGGER.error("Failed getting occurrences data", e))
  }

  return (
    <>
      <VerseRowWrapper
        data-index={index}
        ref={(el) => {
          if (!el) return
          wrapperRef.current = el
          ref(el)
        }}
        $theme={theme}
        style={{ transform: style.transform }}
      >
        <VerseMarkerColumn ref={markerColumnRef}>
          <Button
            subMenu={({ list }) =>
              list?.([
                {
                  caption: formatMessage({
                    id: messages.tipMenu.verseMarker.bookmark,
                  }),
                  icon: { image: RiFileMarkedLine },
                  onClick: () => {
                    const verseKey = `${verse.chapter.id}:${verse.number}`
                    setVerseKey(verseKey)
                    bookmarkVerse({ verseKey })
                  },
                },
                {
                  caption: formatMessage({
                    id: messages.tipMenu.verseMarker.note,
                  }),
                  icon: { image: RiPencilAi2Line },
                  onClick: () => {
                    setVerseKey(`${verse.chapter.id}:${verse.number}`)
                    setShowNoteVerseDialog(true)
                  },
                },
              ])
            }
            showSubMenuOn="self"
            onOpen={(isOpen) => setIsTipMenuOpen(isOpen)}
            open={isTipMenuOpen}
            styles={{
              containerStyle: css`
                padding: 0;
                margin-top: 12px;
              `,
              self: css`
                padding: 0;
                height: fit-content;
                width: fit-content;
                border-radius: 9999px;

                --text: ${theme === "dark" ? "#e5dcc3" : "#755f4d"};
                --border: ${theme === "dark" ? "#5f5644" : "#cbb9a1"};
                --bg-start: ${theme === "dark" ? "#2b2a26" : "#efe6d8"};
                --bg-end: ${theme === "dark" ? "#1c1b18" : "#e2d6c3"};
                --inset: ${theme === "dark" ? "#3b372f" : "#f4ede2"};
                --shadow: ${theme === "dark"
                  ? "rgba(0,0,0,0.45)"
                  : "rgba(117,95,77,0.08)"};
                --text-shadow: ${theme === "dark"
                  ? "rgba(0,0,0,0.35)"
                  : "rgba(255,255,255,0.30)"};
                --dashed: ${theme === "dark"
                  ? "#7b715b"
                  : "rgba(117,95,77,0.26)"};
                --dashed-opacity: ${theme === "dark" ? 0.4 : 0.5};

                &:hover {
                  --shadow: none;
                }

                width: 42px;
                height: 42px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                position: relative;
                border-radius: 50%;
                font-size: 18px;
                color: var(--text);
                border: 1.5px solid var(--border);

                background: radial-gradient(
                  circle,
                  var(--bg-start) 40%,
                  var(--bg-end) 100%
                );
                box-shadow:
                  inset 0 0 0 2px var(--inset),
                  0 1px 3px var(--shadow);
                text-shadow: 0 1px 0 var(--text-shadow);

                &::after {
                  content: "";
                  position: absolute;
                  inset: 4px;
                  border-radius: 50%;
                  border: 1px dashed var(--dashed);
                  opacity: var(--dashed-opacity);
                  cursor: pointer;
                }

                ${isTipMenuOpen &&
                css`
                  box-shadow:
                    inset 0 0 5px rgba(117, 95, 77, 0.35),
                    inset 0 0 2px rgba(0, 0, 0, 0.12);
                  background: radial-gradient(
                    circle,
                    var(--bg-start) 40%,
                    var(--bg-end) 100%
                  );
                `}
              `,
            }}
          >
            {verse.number}
          </Button>
        </VerseMarkerColumn>

        <InterlinearText
          showMeaning={showMeaning}
          id={`${verse.chapter.id}-${verse.id}`}
          arabicFont={userSettings.font.arabic}
          words={verse.words}
          shownTranslations={wbwTranslations}
          withBasmala={
            basmalaPosition === BasmalaPosition.Embedded &&
            Bismillah.isRenderableHere(verse.number, verse.chapter.id)
          }
          onPointerDown={(word) => {
            setContent(word)
            findWordsOccurrences(word)

            hoverTimeoutRef.current = setTimeout(() => {
              haptic()
              paperDialogRef.current?.openDialog()
            }, 500)
          }}
          onPointerUp={(word) => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
          }}
          onPointerLeave={(word) => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
          }}
          onPointerCancel={(word) => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
          }}
        />
      </VerseRowWrapper>

      <NoteVerseDialog
        isOpen={showNoteVerseDialog}
        verseKey={verseKey}
        onVisibilityChange={(s) => setShowNoteVerseDialog(!!s)}
      />

      <PaperDialog
        mobile
        ref={paperDialogRef}
        height="55dvh"
        controls={[]}
        closable
        resizable
        styles={{
          indicatorStyle: css`
            height: 40px;
          `,
          contentStyle: css`
            display: flex;
            min-width: auto;
            overflow-wrap: break-word;
            flex-direction: column;
            overflow-y: auto;
            gap: 0px;
            padding: 0px;
          `,
        }}
      >
        {content && (
          <LexemeDetailPaperDialog
            occurrences={occurrences}
            content={content}
            arabicFont={userSettings.font.arabic.family}
            theme={theme}
          />
        )}
      </PaperDialog>
    </>
  )
}

/**
 * Group words into verse
 *
 * @param chapters map of chapter metadata by their numbering
 * @param words array of words
 * @returns words grouped into verse
 */
VerseRow.groupVerse = (
  chapters: Record<number, ChapterRecord>,
  words: WordCell[],
) => {
  const grouped: Record<string, Verse> = {}

  for (const word of words) {
    const key = `${word.chapterId}:${word.verse}`
    let verse = grouped[key]

    if (!verse) {
      verse = {
        id: key,
        chapter: chapters[word.chapterId],
        number: word.verse,
        words: [],
      }

      grouped[key] = verse
    }

    verse.words.push(word)
  }

  return Array.from(Object.values(grouped))
}

const VerseRowWrapper = styled.div<{ $theme: ThemeMode }>`
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
  background: ${({ $theme }) => ($theme === "dark" ? "#181818" : "#f6f1e7")};
  border-bottom: 1px solid
    ${({ $theme }) => ($theme === "dark" ? "#303030" : "#bfbfbf")};
`

const VerseMarkerColumn = styled.div`
  align-self: start;
  z-index: 1;
`

export const Transliteration = styled.span`
  font-size: 14px;
  color: #666;
  margin-top: 4px;
  direction: ltr;
  text-align: center;
`
