import { DEFAULT_LOCALE } from "@constants/locales"
import { ChapterRecord } from "@constants/records/ChapterRecord"
import { ThemeMode } from "@constants/theme"
import { useParams } from "@tanstack/react-router"
import { useState } from "react"
import AppNavbar from "./fragments/AppNavbar"
import QuranBrowser from "./QuranBrowser"

export default function UIIndex() {
  const [chapter, setChapter] = useState<ChapterRecord | null>(null)
  const navbarTitle = chapter
    ? `${chapter.transliterations[DEFAULT_LOCALE]} (${chapter.meanings[DEFAULT_LOCALE] ?? chapter.meanings[DEFAULT_LOCALE]})`
    : "bil-Qur'an"
  const theme: ThemeMode = "light"

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
      <QuranBrowser
        theme={theme}
        onScroll={(verseRow) => setChapter(verseRow.chapter)}
        chapterId={chapterId}
        verseNumber={verseNumber}
      />
    </>
  )
}
