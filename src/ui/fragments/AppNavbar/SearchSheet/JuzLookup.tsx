import { PaginationStyle, QuranPage } from "@constants/records/Pagination"
import { repo } from "@db/repo"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { messages } from "@i18n/message"
import { unpackIPC } from "@services/Converter"
import { Combobox, ComboboxOption } from "@systatum/coneto/combobox"
import { useNavigate } from "@tanstack/react-router"
import { Fragment, useEffect, useMemo, useState } from "react"
import { useIntl } from "react-intl"
import styled from "styled-components"
import useChaptersState from "../../../hooks/states/ChaptersState"
import { FlexContainer } from "../Container"

interface JuzLookupProps {
  onChange?: () => void
}

export default function JuzLookup({ onChange }: JuzLookupProps) {
  const navigate = useNavigate()
  const {
    userSettings: { locale },
  } = useUserSettingsState()
  const { getChapterTransliteratedName } = useChaptersState()
  const [juzPages, setJuzPages] = useState<QuranPage[][]>([])
  const { formatMessage } = useIntl()
  const pgAbbrev = formatMessage({ id: messages.searchSheet.pageAbbreviation })

  useEffect(() => {
    repo.paginations
      .findAllBy({ name: PaginationStyle.Madinah })
      .then((resp) => {
        const [pagination] = unpackIPC(resp)
        if (!pagination) return

        // Group pages by sequential juz order rather than by raw `part` value.
        // This tolerates any mislabeled part values in the seeded DB because
        // the first new `part` encountered in page order = the next juz start.
        const partToJuz = new Map<number, number>()
        const groups: QuranPage[][] = []

        for (const page of pagination.pages) {
          if (!partToJuz.has(page.part)) {
            partToJuz.set(page.part, groups.length)
            groups.push([])
          }
          groups[partToJuz.get(page.part)!].push(page)
        }

        setJuzPages(groups)
      })
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
        groupOptions: pages.map((page, pi) => {
          const currentPage = pageNumber++

          // Plain text used for search filtering (always includes range)
          const searchText = page.chapterIds
            .map((id, j) => {
              const name = getChapterTransliteratedName(id) ?? String(id)
              const [start, end] = page.verseNumbers[j]
              return `${id}. ${name} ${start}-${end}`
            })
            .join(" ")

          const firstChapter = page.chapterIds[0]
          const firstVerse = page.verseNumbers[0][0]

          return {
            text: `${searchText} ${pgAbbrev} ${currentPage}`,
            render: (
              <PageOptionRow>
                <ChaptersRow>
                  {page.chapterIds.map((id, j) => {
                    const name =
                      getChapterTransliteratedName(id) ?? String(id)
                    const [start, end] = page.verseNumbers[j]
                    const showRange = showRangeMatrix[i][pi][j]
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
        }),
      } satisfies ComboboxOption
    })
  }, [locale, pgAbbrev, juzPages, getChapterTransliteratedName])

  return (
    <FlexContainer direction="column">
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
