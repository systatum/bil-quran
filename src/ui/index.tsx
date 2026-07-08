import { ChapterRecord } from "@constants/records/ChapterRecord"
import usePaginationState from "@hooks/states/PaginationState"
import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import AppNavbar from "./fragments/AppNavbar"
import QuranPaper from "./fragments/QuranPaper"
import usePaperDialogState from "./hooks/states/PaperDialogState"
import useUserSettingsState from "./hooks/states/UserSettingsState"

interface UIIndexProps {
  /** When true, opens the exegesis paper dialog for the routed verse on mount. */
  openExegesisOnMount?: boolean
}

export default function UIIndex({ openExegesisOnMount }: UIIndexProps = {}) {
  const [chapter, setChapter] = useState<ChapterRecord | null>(null)
  const [currentVerse, setCurrentVerse] = useState<number | null>(null)
  const {
    userSettings: { theme, locale },
  } = useUserSettingsState()

  const { loadPagination } = usePaginationState()
  useEffect(() => {
    loadPagination()
  }, [])

  // read params
  const params = useParams({ strict: false })
  const chapterId = params.chapter ? parseInt(params.chapter) : null
  const verseNumber = params.verse ? parseInt(params.verse) : null

  const { openExegesis } = usePaperDialogState()
  const hasOpenedExegesisRef = useRef(false)
  useEffect(() => {
    if (!openExegesisOnMount) return
    if (hasOpenedExegesisRef.current) return
    if (chapterId == null || verseNumber == null) return

    hasOpenedExegesisRef.current = true
    openExegesis(chapterId, verseNumber)
  }, [openExegesisOnMount, chapterId, verseNumber, openExegesis])

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

  console.debug(
    "Received params of chapter ID to scroll:",
    chapterId,
    verseNumber,
  )

  return (
    <>
      <AppNavbar theme={theme} title={navbarTitle} />
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
