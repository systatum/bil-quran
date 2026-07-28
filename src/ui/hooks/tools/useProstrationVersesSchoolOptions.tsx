import {
  SAJDAH_SCHOOLS,
  SAJDAH_VERSES,
  SajdahRuling,
} from "@constants/SajdahVerse"
import { Locale } from "@constants/settings"
import useChaptersState from "@hooks/states/ChaptersState"
import { messages } from "@i18n/message"
import { ComboboxOption } from "@systatum/coneto/combobox"
import { useMemo } from "react"
import { useIntl } from "react-intl"
import styled from "styled-components"

/** Combobox options for the sajdah-marker setting, one per juristic school. */
export default function useProstrationVersesSchoolOptions(): ComboboxOption[] {
  const { formatMessage } = useIntl()
  const { chapters } = useChaptersState()

  return useMemo(
    () =>
      SAJDAH_SCHOOLS.map((school) => {
        // wajib entries first, mustahab after — a stable sort keeps each
        // group's original verse order
        const verses = SAJDAH_VERSES.filter((v) => school in v.rulings).sort(
          (a, b) => {
            const aWajib = a.rulings[school] === SajdahRuling.Obligatory
            const bWajib = b.rulings[school] === SajdahRuling.Obligatory
            return aWajib === bWajib ? 0 : aWajib ? -1 : 1
          },
        )

        return {
          text: formatMessage({ id: messages.thoughtSchool[school] }),
          value: String(school),
          render: (
            <SchoolOptionLabel>
              {formatMessage({ id: messages.thoughtSchool[school] })}
              <VerseList>
                {verses.map((v) => {
                  const chapterName =
                    chapters[v.chapterId]?.transliterations[
                      Locale.IntEnglish
                    ] ?? v.chapterId
                  return (
                    <VerseItem
                      key={`${v.chapterId}:${v.verse}`}
                      $wajib={v.rulings[school] === SajdahRuling.Obligatory}
                    >
                      {v.chapterId}. {chapterName}: {v.verse}
                    </VerseItem>
                  )
                })}
              </VerseList>
            </SchoolOptionLabel>
          ),
        } satisfies ComboboxOption
      }),
    [chapters, formatMessage],
  )
}

const SchoolOptionLabel = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.77em;
`

const VerseList = styled.ul`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  column-gap: 28px;
  row-gap: 2px;
  margin: 0;
  padding-left: 1.1em;
  width: 100%;
  /* Beyond iPhone 13 mini's landscape width, stop growing so the two
     columns don't drift far apart. */
  max-width: 812px;

  font-size: 11px;
  opacity: 0.65;
  line-height: 1.4;
`

const VerseItem = styled.li<{ $wajib: boolean }>`
  list-style-type: ${({ $wajib }) => ($wajib ? "disc" : "none")};
`
