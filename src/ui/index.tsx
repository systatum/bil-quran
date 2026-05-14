import { ChapterRecord } from "@constants/records/chapters"
import { useState } from "react"
import AppNavbar from "./fragments/AppNavbar"
import QuranBrowser from "./QuranBrowser"

export default function UIIndex() {
  const [chapter, setChapter] = useState<ChapterRecord | null>(null)
  const navbarTitle = chapter?.en ?? "bil-Qur'an"

  return (
    <>
      <AppNavbar title={navbarTitle} />
      <QuranBrowser onScroll={(verseRow) => setChapter(verseRow.chapter)} />
    </>
  )
}
