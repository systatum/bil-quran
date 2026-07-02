import { ChapterRecord } from "@constants/records/ChapterRecord"
import { useJuzProgress } from "@hooks/tools/useJuzProgress"
import usePaginationState from "@hooks/states/PaginationState"
import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import AppNavbar from "./fragments/AppNavbar"
import QuranPaper from "./fragments/QuranPaper"
import useUserSettingsState from "./hooks/states/UserSettingsState"

export default function UIIndex() {
  const [chapter, setChapter] = useState<ChapterRecord | null>(null)
  const [currentVerse, setCurrentVerse] = useState<number | null>(null)
  const {
    userSettings: { theme, locale },
  } = useUserSettingsState()

  const { loadPagination } = usePaginationState()
  useEffect(() => {
    loadPagination()
  }, [])

  const juzProgress = useJuzProgress(chapter, currentVerse)

  const navbarTitle = useMemo(() => {
    if (chapter == null) return "bil-Qur'an"

    const chapterNo = chapter.id
    const chapterName = chapter.transliterations[locale]
    const chapterMeaningInDefaultLocale = chapter.meanings[locale]
    const chapterMeaningInCurrentLocale = chapter.meanings[locale]
    const chapterMeaning =
      chapterMeaningInCurrentLocale ?? chapterMeaningInDefaultLocale

    if (locale === "ar-IQ") {
      return `${chapterNo}. ${chapterName} (${chapter.transliterations["en-US"]})`
    } else {
      return `${chapterNo}. ${chapterName} (${chapterMeaning})`
    }
  }, [chapter, locale])

  // read params
  const params = useParams({ strict: false })
  const chapterId = params.chapter ? parseInt(params.chapter) : null
  const verseNumber = params.verse ? parseInt(params.verse) : null

  console.debug(
    "Received params of chapter ID to scroll:",
    chapterId,
    verseNumber,
  )

  return (
    <>
      <AppNavbar theme={theme} title={navbarTitle} juzProgress={juzProgress} />
      <QuranPaper
        theme={theme}
        onScroll={(verseRow) => {
          setChapter(verseRow.chapter)
          setCurrentVerse(verseRow.number)
        }}
        chapterId={chapterId}
        verseNumber={verseNumber}
      />
    </>
  )
}
