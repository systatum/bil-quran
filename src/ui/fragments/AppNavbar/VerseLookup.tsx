import { useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import styled from "styled-components"
import useChaptersState from "../../hooks/states/ChaptersState"
import useUserSettingsState from "../../hooks/states/UserSettingsState"

export default function VerseLookup() {
  const navigate = useNavigate()
  const [selectedChapterId, setSelectedChapterId] = useState<number>(1)
  const [verseNumber, setVerseNumber] = useState<string>("1")

  // make sure Quranic chapters are loaded
  const {
    chapters,
    loadChapters,
    getChapterMeaning,
    getChapterArabicName,
    getChapterTransliteratedName,
  } = useChaptersState()

  // load the user locale
  const { locale: userLocale } = useUserSettingsState()

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

  const chaptersList = useMemo(() => {
    return Object.values(chapters).map((chapter) => {
      const meaning = getChapterMeaning(chapter.id)
      const latinName = getChapterTransliteratedName(chapter.id)
      const arabicName = getChapterArabicName(chapter.id)
      const text = `${chapter.id}. ${latinName} (${arabicName}) - ${meaning}`
      return { id: chapter.id, text: text }
    })
  }, [chapters])

  return (
    <FlexContainer direction="column">
      <form>
        <ChapterSelect
          title="Chapter"
          name="chapterId"
          value={selectedChapterId}
          onChange={(e) => setSelectedChapterId(parseInt(e.target.value))}
        >
          {chaptersList.map((chapter) => {
            return (
              <option key={chapter.id} value={chapter.id}>
                {chapter.text}
              </option>
            )
          })}
        </ChapterSelect>

        <FlexContainer direction="row">
          <VerseInput
            name="verseNumber"
            min="1"
            value={verseNumber}
            onChange={(e) => setVerseNumber(e.target.value)}
          />

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

const FlexContainer = styled.div<{ direction: string }>`
  display: flex;
  gap: 5px;
  flex-direction: ${({ direction }) => direction};
`

const ChapterSelect = styled.select`
  width: 100%;
  height: 42px;
  border-radius: 3px;
  border: 1px solid #d8d8d8;
  padding: 0 12px;
  font-size: 14px;
`

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
