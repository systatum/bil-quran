import useUserSettingsState from "@hooks/states/UserSettingsState"
import LOGGER from "@services/Logger"
import Tracker from "@services/Tracker"
import { chapterNameSortKey } from "@services/chapters"
import { Combobox, ComboboxOption } from "@systatum/coneto/combobox"
import { useMemo } from "react"
import styled from "styled-components"
import useChaptersState from "../../../hooks/states/ChaptersState"
import { FlexContainer } from "../Container"

interface VerseLookupProps {
  /** Called with the picked chapter/verse; the caller decides where that leads. */
  onChange?: (chapterId: number, verse: number) => void
}

export default function VerseLookup({ onChange }: VerseLookupProps) {
  const {
    userSettings: { locale, alphabeticalChaptersSorting },
  } = useUserSettingsState()

  // make sure Quranic chapters are loaded
  const {
    chapters,
    getChapterMeaning,
    getChapterArabicName,
    getChapterTransliteratedName,
  } = useChaptersState()

  /**
   * Range of verses of all the chapters
   */
  const chaptersVerseRange: Record<number, [number, number]> = useMemo(() => {
    LOGGER.debug("Calculating verses range of each every chapter")
    if (chapters == null) return {}

    return Object.values(chapters).reduce<Record<number, [number, number]>>(
      (acc, chapter) => ({
        ...acc,
        [chapter.id]: [
          chapter.partitioning[0].start,
          chapter.partitioning[chapter.partitioning.length - 1].end,
        ],
      }),
      {},
    )
  }, [chapters])

  const chaptersList: ComboboxOption[] = useMemo(() => {
    const VERSE_GROUP_SIZE = 30

    const createVerseOption = (
      chapterName: string,
      chapterId: number,
      verse: number,
    ): ComboboxOption =>
      ({
        text: `${chapterName} - ${verse}`,
        render: String(verse),
        value: `${chapterId}-${verse}`,
        groupOptions: [],
      }) satisfies ComboboxOption

    const orderedChapters = alphabeticalChaptersSorting
      ? [...Object.values(chapters)].sort((a, b) =>
          chapterNameSortKey(
            getChapterTransliteratedName(a.id) ?? "",
          ).localeCompare(
            chapterNameSortKey(getChapterTransliteratedName(b.id) ?? ""),
          ),
        )
      : Object.values(chapters)

    return orderedChapters.map((chapter) => {
      const meaning = getChapterMeaning(chapter.id)
      const latinName = getChapterTransliteratedName(chapter.id)
      const arabicName = getChapterArabicName(chapter.id)
      const chapterLabel = `${latinName} (${arabicName}) - ${meaning}`
      const text = `${chapter.id}. ${chapterLabel}`
      const render = alphabeticalChaptersSorting ? (
        <ChapterOptionRow>
          <span>{chapterLabel}</span>
          <ChapterNumber>{chapter.id}</ChapterNumber>
        </ChapterOptionRow>
      ) : undefined
      const [firstVerseNumber, lastVerseNumber] = chaptersVerseRange[chapter.id]

      if (lastVerseNumber <= VERSE_GROUP_SIZE) {
        return {
          value: chapter.id,
          text,
          render,
          groupOptions: Array.from(
            { length: lastVerseNumber - firstVerseNumber + 1 },
            (_, i) => firstVerseNumber + i,
          ).map((v) => createVerseOption(latinName!, chapter.id, v)),
        } satisfies ComboboxOption
      } else {
        const groupedOptions: ComboboxOption[] = []

        for (
          let start = firstVerseNumber;
          start <= lastVerseNumber;
          start += VERSE_GROUP_SIZE
        ) {
          const end = Math.min(start + VERSE_GROUP_SIZE - 1, lastVerseNumber)

          groupedOptions.push({
            text: `${start}-${end}`,
            value: `${chapter.id}-${start}-${end}`,
            groupOptions: Array.from(
              { length: end - start + 1 },
              (_, i) => start + i,
            ).map((v) => createVerseOption(latinName!, chapter.id, v)),
          })
        }

        return {
          value: chapter.id,
          text,
          render,
          groupOptions: groupedOptions,
        } satisfies ComboboxOption
      }
    })
  }, [chapters, locale, alphabeticalChaptersSorting])

  return (
    <FlexContainer $direction="column">
      <Combobox
        clearable
        mobile
        drawerHeight="60dvh"
        onChange={(selectionOption) => {
          const value = selectionOption as string
          const [chapterId, verseId] = value.split("-")
          if (
            Number.isNaN(parseInt(chapterId)) ||
            Number.isNaN(parseInt(verseId))
          )
            return

          Tracker.track(Tracker.Event.SearchVerseSelected, {
            chapter: Number(chapterId),
            verse: Number(verseId),
          })
          onChange?.(Number(chapterId), Number(verseId))
        }}
        options={chaptersList}
      />
    </FlexContainer>
  )
}

// Alphabetical order groups chapters by name, so the chapter number no
// longer lines up sequentially. Let's push it to the right instead of leading
// with it, to avoid it reading like a jumbled sequence.
const ChapterOptionRow = styled.span`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  width: 100%;
`

const ChapterNumber = styled.span`
  opacity: 0.6;
  font-size: 0.85em;
  flex-shrink: 0;
`
