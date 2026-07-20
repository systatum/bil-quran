import { QuranPage } from "@constants/records/Pagination"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import usePaginationState from "@hooks/states/PaginationState"
import { messages } from "@i18n/message"
import { Combobox, ComboboxOption } from "@systatum/coneto/combobox"
import { useNavigate } from "@tanstack/react-router"
import { Fragment, useEffect, useMemo, useState } from "react"
import { useIntl } from "react-intl"
import styled from "styled-components"
import useChaptersState from "../../../hooks/states/ChaptersState"
import { FlexContainer } from "../Container"

const SMALL_SCREEN_BREAKPOINT = 430
const MAX_CHAPTERS_SMALL = 2

interface PageChunk {
  chapterIds: number[]
  verseNumbers: number[][]
  showRanges: boolean[]
}

interface JuzLookupProps {
  onChange?: () => void
}

export default function JuzLookup({ onChange }: JuzLookupProps) {
  const navigate = useNavigate()
  const {
    userSettings: { locale },
  } = useUserSettingsState()
  const { getChapterTransliteratedName } = useChaptersState()
  const { juzPages, loadPagination } = usePaginationState()
  const { formatMessage } = useIntl()
  const pgAbbrev = formatMessage({ id: messages.searchSheet.pageAbbreviation })

  const [isSmallScreen, setIsSmallScreen] = useState(
    () =>
      window.matchMedia(`(max-width: ${SMALL_SCREEN_BREAKPOINT}px)`).matches,
  )

  // use match media to determine if the screen is small, and if it is, we should
  // not show more than MAX_CHAPTERS_SMALL chapters on the same option item, for
  // readability, but span them in multiple lines. matchMedia is used instead of
  // innerWidth for efficiency reason: matchMedia fires its change event once,
  // exactly when the breakpoint crosses (e.g. from 431 → 430). A resize listener
  // with window.innerWidth fires on every pixel of resize and then we'd need to
  // compute a boolean from the number ourselves; same outcome, more overhead.
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${SMALL_SCREEN_BREAKPOINT}px)`)
    const handler = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    loadPagination()
  }, [])

  const options: ComboboxOption[] = useMemo(() => {
    let pageNumber = 1

    // A chapter shows its verse range only when the same chapter appeared on an
    // earlier page — meaning this page is a continuation, not the start.
    const seenChapters = new Set<number>()
    const showRangeMatrix = juzPages.map((pages) =>
      pages.map((page) =>
        page.chapterIds.map((id) => {
          const show = seenChapters.has(id)
          seenChapters.add(id)
          return show
        }),
      ),
    )

    return juzPages.map((pages, i) => {
      const juz = i + 1
      return {
        text: `${formatMessage({ id: messages.searchSheet.juz })} ${juz}`,
        value: `juz-${juz}`,
        groupOptions: pages.flatMap((page, pi) => {
          const currentPage = pageNumber++
          const maxChapters = isSmallScreen
            ? MAX_CHAPTERS_SMALL
            : page.chapterIds.length
          const chunks = chunkPage(page, showRangeMatrix[i][pi], maxChapters)

          return chunks.map(({ chapterIds, verseNumbers, showRanges }) => {
            // Plain text used for search filtering (always includes range)
            const searchText = chapterIds
              .map((id, j) => {
                const name = getChapterTransliteratedName(id) ?? String(id)
                const [start, end] = verseNumbers[j]
                return `${id}. ${name} ${start}-${end}`
              })
              .join(" ")

            const firstChapter = chapterIds[0]
            const firstVerse = verseNumbers[0][0]

            return {
              text: `${searchText} ${pgAbbrev} ${currentPage}`,
              render: (
                <PageOptionRow>
                  <ChaptersRow>
                    {chapterIds.map((id, j) => {
                      const name =
                        getChapterTransliteratedName(id) ?? String(id)
                      const [start, end] = verseNumbers[j]
                      const showRange = showRanges[j]
                      return (
                        <Fragment key={id}>
                          {j > 0 && <ChapterSep>·</ChapterSep>}
                          <ChapterBlock>
                            <ChapterTitle>
                              {id}. {name}
                            </ChapterTitle>
                            {showRange && (
                              <VerseRange>
                                ({start}-{end})
                              </VerseRange>
                            )}
                          </ChapterBlock>
                        </Fragment>
                      )
                    })}
                  </ChaptersRow>
                  <PageNumber>
                    {pgAbbrev} {currentPage}
                  </PageNumber>
                </PageOptionRow>
              ),
              value: `${firstChapter}-${firstVerse}`,
              groupOptions: [],
            } satisfies ComboboxOption
          })
        }),
      } satisfies ComboboxOption
    })
  }, [locale, pgAbbrev, juzPages, getChapterTransliteratedName, isSmallScreen])

  return (
    <FlexContainer $direction="column">
      <Combobox
        clearable
        mobile
        drawerHeight="60dvh"
        onChange={(selection) => {
          const value = selection as string
          const [chapter, verse] = value.split("-")
          if (!chapter || !verse || isNaN(parseInt(chapter))) return
          navigate({
            to: "/c/$chapter/$verse",
            params: { chapter, verse },
          })
          onChange?.()
        }}
        options={options}
      />
    </FlexContainer>
  )
}

/** Splits a page's chapters into chunks of maxPerChunk when the screen is small. */
function chunkPage(
  page: QuranPage,
  showRanges: boolean[],
  maxPerChunk: number,
): PageChunk[] {
  const n = page.chapterIds.length
  if (n <= maxPerChunk) {
    return [
      {
        chapterIds: page.chapterIds,
        verseNumbers: page.verseNumbers,
        showRanges,
      },
    ]
  }
  const chunks: PageChunk[] = []
  for (let i = 0; i < n; i += maxPerChunk) {
    chunks.push({
      chapterIds: page.chapterIds.slice(i, i + maxPerChunk),
      verseNumbers: page.verseNumbers.slice(i, i + maxPerChunk),
      showRanges: showRanges.slice(i, i + maxPerChunk),
    })
  }
  return chunks
}

const PageOptionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 8px;
`

const ChaptersRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
`

const ChapterSep = styled.span`
  flex-shrink: 0;
  font-size: 0.55em;
  opacity: 0.35;
`

const ChapterBlock = styled.div`
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 4px;
  min-width: 0;
`

const ChapterTitle = styled.span`
  font-size: 0.7em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const VerseRange = styled.span`
  font-size: 0.49em;
  opacity: 0.55;
`

const PageNumber = styled.span`
  flex-shrink: 0;
  opacity: 0.4;
  font-size: 0.7em;
  white-space: nowrap;
  padding-top: 1px;
`
