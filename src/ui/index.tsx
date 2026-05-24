import { DEFAULT_LOCALE } from "@constants/locales"
import { ChapterRecord } from "@constants/records/ChapterRecord"
import { ThemeMode } from "@constants/theme"
import { useParams } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import AppNavbar from "./fragments/AppNavbar"
import QuranPaper from "./fragments/QuranPaper"
import useUserSettingsState from "./hooks/states/UserSettingsState"

export default function UIIndex() {
  const [chapter, setChapter] = useState<ChapterRecord | null>(null)
  const { userSettings } = useUserSettingsState()
  const theme: ThemeMode = userSettings.theme

  const navbarTitle = useMemo(() => {
    if (chapter == null) return "bil-Qur'an"

    const chapterNo = chapter.id
    const chapterName = chapter.transliterations[DEFAULT_LOCALE]
    const chapterMeaningInDefaultLocale = chapter.meanings[DEFAULT_LOCALE]
    const chapterMeaningInCurrentLocale = chapter.meanings[DEFAULT_LOCALE]
    const chapterMeaning =
      chapterMeaningInCurrentLocale ?? chapterMeaningInDefaultLocale

    return `${chapterNo}. ${chapterName} (${chapterMeaning})`
  }, [chapter])

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
      <AppNavbar theme={theme} title={navbarTitle} />
      <QuranPaper
        theme={theme}
        onScroll={(verseRow) => setChapter(verseRow.chapter)}
        chapterId={chapterId}
        verseNumber={verseNumber}
      />
    </>
  )
}
