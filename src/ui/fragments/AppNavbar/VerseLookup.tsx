import { Combobox, ComboboxOption } from "@systatum/coneto/combobox"
import { useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import styled from "styled-components"
import useChaptersState from "../../hooks/states/ChaptersState"
import { Combobox as RawCombobox } from "./Combobox"
import { FlexContainer } from "./Container"

export default function VerseLookup() {
  const navigate = useNavigate()
  const [selectedChapterId, setSelectedChapterId] = useState<number>(1)
  const [verseNumber, setVerseNumber] = useState<string>("1")

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

    navigate({
      to: "/c/$chapter/$verse",
      params: {
        chapter: String(selectedChapterId),
        verse: String(verseNumber),
      },
    })
  }

  const chaptersList: ComboboxOption[] = useMemo(() => {
    return Object.values(chapters).map((chapter) => {
      const meaning = getChapterMeaning(chapter.id)
      const latinName = getChapterTransliteratedName(chapter.id)
      const arabicName = getChapterArabicName(chapter.id)
      const text = `${chapter.id}. ${latinName} (${arabicName}) - ${meaning}`
      return {
        id: chapter.id,
        value: chapter.id,
        text: text,
      }
    })
  }, [chapters])

  /**
   * Range of verses of the currently selected chapter
   */
  const verseRange: number[] = useMemo(() => {
    if (chapters == null) return [1]
    const chapter = chapters[selectedChapterId]
    if (!chapter) return [1]

    let verses: number[] = []
    const firstVerse = chapter.partitioning[0].start
    const endVerse = chapter.partitioning[chapter.partitioning.length - 1].end
    for (let i = firstVerse; i <= endVerse; i++) verses.push(i)

    return verses
  }, [selectedChapterId])

  return (
    <FlexContainer direction="column">
      <form>
        <Combobox
          mobile
          clearable
          selectedOptions={selectedChapterId}
          onChange={(e) => setSelectedChapterId(parseInt(String(e)))}
          options={chaptersList}
        />

        <FlexContainer direction="row">
          <RawCombobox
            value={verseNumber}
            onChange={(e) => setVerseNumber(e.target.value.toString())}
          >
            {verseRange.map((v) => (
              <option key={v} value={v.toString()}>
                {v}
              </option>
            ))}
          </RawCombobox>

          <GoButton
            onClick={(e) => {
              e.preventDefault()
              goToVerse()
            }}
          >
            Go
          </GoButton>
        </FlexContainer>
      </form>
    </FlexContainer>
  )
}

const VerseInput = styled.input`
  width: 65%;
  height: 42px;
  border-radius: 3px;
  border: 1px solid #d8d8d8;
  padding: 0 12px;
  font-size: 14px;
`

const GoButton = styled.button`
  width: 35%;
  height: 42px;
  padding: 0 18px;
  border: none;
  border-radius: 3px;
  background: #2f3b26;
  color: white;
  cursor: pointer;
  font-size: 14px;
`
