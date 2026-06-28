import { PaginationStyle, QuranPage } from "@constants/records/Pagination"
import { repo } from "@db/repo"
import { unpackIPC } from "@services/Converter"
import { Combobox, ComboboxOption } from "@systatum/coneto/combobox"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import styled from "styled-components"
import useChaptersState from "../../../hooks/states/ChaptersState"
import { FlexContainer } from "../Container"

interface JuzLookupProps {
  onChange?: () => void
}

export default function JuzLookup({ onChange }: JuzLookupProps) {
  const navigate = useNavigate()
  const { getChapterTransliteratedName } = useChaptersState()
  // juzPages[i] = ordered pages for juz i+1, derived from page-array order
  const [juzPages, setJuzPages] = useState<QuranPage[][]>([])

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
    // Track the global page number (1-based) as we walk through all juz.
    let pageNumber = 1

    return juzPages.map((pages, i) => {
      const juz = i + 1
      return {
        text: `Juz ${juz}`,
        value: `juz-${juz}`,
        groupOptions: pages.map((page) => {
          const currentPage = pageNumber++

          const labelText = page.chapterIds
            .map((id, j) => {
              const name = getChapterTransliteratedName(id) ?? String(id)
              const [start, end] = page.verseNumbers[j]
              return `${id}. ${name} (${start}-${end})`
            })
            .join(" · ")

          const firstChapter = page.chapterIds[0]
          const firstVerse = page.verseNumbers[0][0]

          return {
            text: `${labelText} p.${currentPage}`,
            render: (
              <PageOptionRow>
                <span>{labelText}</span>
                <PageNumber>{currentPage}</PageNumber>
              </PageOptionRow>
            ),
            value: `${firstChapter}-${firstVerse}`,
            groupOptions: [],
          } satisfies ComboboxOption
        }),
      } satisfies ComboboxOption
    })
  }, [juzPages, getChapterTransliteratedName])

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

const PageNumber = styled.span`
  flex-shrink: 0;
  opacity: 0.5;
  font-size: 0.85em;
`
