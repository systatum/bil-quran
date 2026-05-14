import { ChapterRecord } from "@constants/records/chapters"
import { ThemeMode } from "@constants/theme"
import { useState } from "react"
import AppNavbar from "./fragments/AppNavbar"
import QuranBrowser from "./QuranBrowser"

export default function UIIndex() {
  const [chapter, setChapter] = useState<ChapterRecord | null>(null)
  const navbarTitle = chapter?.en ?? "bil-Qur'an"
  const theme: ThemeMode = "dark"

  return (
    <>
      <AppNavbar theme={theme} title={navbarTitle} />
      <QuranBrowser
        theme={theme}
        onScroll={(verseRow) => setChapter(verseRow.chapter)}
      />
    </>
  )
}
