import useUserSettingsState from "@hooks/states/UserSettingsState"
import LOGGER from "@services/Logger"
import { Combobox, ComboboxOption } from "@systatum/coneto/combobox"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import useChaptersState from "../../hooks/states/ChaptersState"
import { FlexContainer } from "./Container"

export default function VerseLookup() {
  const navigate = useNavigate()
  const [selectedChapterId, setSelectedChapterId] = useState<string>("1")
  const [verseNumber, setVerseNumber] = useState<string>("1")
  const {
    userSettings: { locale },
  } = useUserSettingsState()

  // make sure Quranic chapters are loaded
  const {
    chapters,
    getChapterMeaning,
    getChapterArabicName,
    getChapterTransliteratedName,
  } = useChaptersState()

  function goToVerse() {
    if (!selectedChapterId) return
    if (Number.isNaN(parseInt(verseNumber))) return
    if (Number.isNaN(parseInt(selectedChapterId))) return

    navigate({
      to: "/c/$chapter/$verse",
      params: {
        chapter: String(selectedChapterId),
        verse: String(verseNumber),
      },
    })
  }

  useEffect(() => {
    goToVerse()
  }, [verseNumber, selectedChapterId])

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

    return Object.values(chapters).map((chapter) => {
      const meaning = getChapterMeaning(chapter.id)
      const latinName = getChapterTransliteratedName(chapter.id)
      const arabicName = getChapterArabicName(chapter.id)
      const text = `${chapter.id}. ${latinName} (${arabicName}) - ${meaning}`
      const [firstVerseNumber, lastVerseNumber] = chaptersVerseRange[chapter.id]

      if (lastVerseNumber <= VERSE_GROUP_SIZE) {
        return {
          value: chapter.id,
          text: text,
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
          groupOptions: groupedOptions,
        } satisfies ComboboxOption
      }
    })
  }, [chapters, locale])

  return (
    <FlexContainer direction="column">
      <Combobox
        clearable
        mobile={{ drawerHeight: "60dvh" }}
        onChange={(selectionOption) => {
          const value = selectionOption as string
          const [chapterId, verseId] = value.split("-")
          setSelectedChapterId(chapterId)
          setVerseNumber(verseId)
        }}
        options={chaptersList}
      />
    </FlexContainer>
  )
}
