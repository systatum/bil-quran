import { ChapterRecord } from "@constants/records/ChapterRecord"
import usePaginationState from "@hooks/states/PaginationState"
import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import AppNavbar from "./fragments/AppNavbar"
import QuranPaper from "./fragments/QuranPaper"
import usePaperDialogState from "./hooks/states/PaperDialogState"
import useUserSettingsState from "./hooks/states/UserSettingsState"
import {
  ScreenEntry,
  ScreenTransition,
} from "@systatum/coneto/screen-transition"
import { Export } from "./fragments/AppNavbar/Sidebar/Export"
import { Import } from "./fragments/AppNavbar/Sidebar/Import"
import useAppState from "@hooks/states/AppState"
import { LexemeDetailPaperDialog } from "./fragments/QuranPaper/VerseRow/LexemeDetailPaperDialog"
import { css } from "styled-components"
import ExegesisPaperDialogContent from "./fragments/QuranPaper/VerseRow/ExegesisPaperDialogContent"
import About from "./fragments/About"
import ExegesisDetail from "./fragments/About/detail"

interface UIIndexProps {
  /** When true, opens the exegesis paper dialog for the routed verse on mount. */
  openExegesisOnMount?: boolean
}

export const Screen = {
  ExegesisDetail: "exegesis-detail",
  Exegesis: "exegesis",
  Lexeme: "lexeme",
  Export: "export",
  Import: "import",
  About: "about",
} as const

export type Screen = (typeof Screen)[keyof typeof Screen]

const SCREENS: Record<Screen, ScreenEntry> = {
  [Screen.Exegesis]: {
    component: ExegesisPaperDialogContent,
    sheet: true,
    height: "55dvh",
  },
  [Screen.Lexeme]: {
    component: LexemeDetailPaperDialog,
    sheet: true,
    height: "55dvh",
  },
  [Screen.Export]: { component: Export, width: "350px", closable: true },
  [Screen.Import]: { component: Import, width: "350px", closable: true },
  [Screen.About]: About,
  [Screen.ExegesisDetail]: ExegesisDetail,
}

export default function UIIndex({ openExegesisOnMount }: UIIndexProps = {}) {
  const [chapter, setChapter] = useState<ChapterRecord | null>(null)
  const {
    userSettings: { theme, locale },
  } = useUserSettingsState()
  const { activeScreens, setActiveScreens } = useAppState()

  const { loadPagination } = usePaginationState()
  useEffect(() => {
    loadPagination()
  }, [])

  // read params
  const params = useParams({ strict: false })
  const chapterId = params.chapter ? parseInt(params.chapter) : null
  const verseNumber = params.verse ? parseInt(params.verse) : null

  const { openExegesis } = usePaperDialogState()

  useEffect(() => {
    if (!openExegesisOnMount) return
    if (chapterId == null || verseNumber == null) return

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

  const isImportOrExport =
    activeScreens.at(-1) === Screen.Export ||
    activeScreens.at(-1) === Screen.Import

  return (
    <>
      <AppNavbar theme={theme} title={navbarTitle} />
      <QuranPaper
        theme={theme}
        onScroll={(verseRow) => {
          setChapter(verseRow.chapter)
        }}
        chapterId={chapterId}
        verseNumber={verseNumber}
      />

      <ScreenTransition
        screens={SCREENS}
        activeScreens={activeScreens}
        onScreenChange={(activeScreens) => {
          setActiveScreens(activeScreens as Screen[])
        }}
        styles={{
          indicatorStyle: css`
            height: 40px;
          `,
          containerStyle: css`
            border: none;
            ${isImportOrExport &&
            css`
              max-width: 400px;

              @media (max-width: 800px) {
                max-width: 350px;
              }
            `};
          `,
          contentStyle: css`
            padding: 0px;
          `,
        }}
      />
    </>
  )
}
