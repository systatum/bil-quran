import {
  Asset,
  DEFAULT_FEED_EXEGESIS_WORK,
  ExegesisWork,
} from "@constants/assets"
import useAppState from "@hooks/states/AppState"
import usePaginationState from "@hooks/states/PaginationState"
import useFirstVisibleVerse from "@hooks/tools/useFirstVisibleVerse"
import {
  ScreenEntry,
  ScreenTransition,
} from "@systatum/coneto/screen-transition"
import { useParams, useSearch } from "@tanstack/react-router"
import { useEffect, useMemo, useRef } from "react"
import { css } from "styled-components"
import About from "./fragments/About"
import ExegesisDetail from "./fragments/About/ExegesisDetail"
import ProstrationVersesDetail from "./fragments/About/ProstrationVersesDetail"
import AppNavbar from "./fragments/AppNavbar"
import Sidebar from "./fragments/AppNavbar/Sidebar"
import { Export } from "./fragments/AppNavbar/Sidebar/Export"
import { Import } from "./fragments/AppNavbar/Sidebar/Import"
import QuranPaper from "./fragments/QuranPaper"
import ExegesisPaperDialogContent from "./fragments/QuranPaper/VerseRow/ExegesisPaperDialogContent"
import { LexemeDetailPaperDialog } from "./fragments/QuranPaper/VerseRow/LexemeDetailPaperDialog"
import usePaperDialogState from "./hooks/states/PaperDialogState"
import useUserSettingsState from "./hooks/states/UserSettingsState"

interface UIIndexProps {
  /** When true, opens the exegesis paper dialog for the routed verse on mount. */
  openExegesisOnMount?: boolean
}

export const Screen = {
  ExegesisDetail: "exegesis-detail",
  ProstrationVersesDetail: "prostverses-detail",
  Exegesis: "exegesis",
  Lexeme: "lexeme",
  Export: "export",
  Import: "import",
  About: "about",
  Sidebar: "sidebar",
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
  [Screen.Sidebar]: { component: Sidebar, closable: true },
  [Screen.Export]: { component: Export, closable: true },
  [Screen.Import]: { component: Import, closable: true },
  [Screen.About]: { component: About, closable: true },
  [Screen.ExegesisDetail]: {
    component: ExegesisDetail,
    closable: true,
  },
  [Screen.ProstrationVersesDetail]: {
    component: ProstrationVersesDetail,
    closable: true,
  },
}

export default function UIIndex({ openExegesisOnMount }: UIIndexProps = {}) {
  const { chapter } = useFirstVisibleVerse()
  // Selectors instead of destructuring the whole store, so this component
  // only re-renders when theme/locale actually change, not on every
  // unrelated settings update (e.g. lastScroll on every exegesis dialog click).
  const theme = useUserSettingsState((s) => s.userSettings.theme)
  const locale = useUserSettingsState((s) => s.userSettings.locale)
  const { activeScreens, setActiveScreens } = useAppState()

  const { loadPagination } = usePaginationState()
  useEffect(() => {
    loadPagination()
  }, [])

  // read params
  const params = useParams({ strict: false })
  const chapterId = params.chapter ? parseInt(params.chapter) : null
  const verseNumber = params.verse ? parseInt(params.verse) : null
  const search = useSearch({ strict: false })

  const openExegesis = usePaperDialogState((s) => s.openExegesis)
  const openedExegesisForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!openExegesisOnMount) return
    if (chapterId == null || verseNumber == null) return

    const target = `${chapterId}:${verseNumber}:${search.tafsir}:${search.transliteration}`
    if (openedExegesisForRef.current === target) return

    openedExegesisForRef.current = target

    const exegesisId = search.tafsir
      ? Asset.resolveExegesisId(
          ExegesisWork.isValid(search.tafsir)
            ? search.tafsir
            : DEFAULT_FEED_EXEGESIS_WORK,
          locale,
        )
      : undefined
    const showTransliteration =
      search.transliteration === "1" ? true : undefined

    openExegesis(chapterId, verseNumber, {
      exegesisId: exegesisId ?? undefined,
      showTransliteration,
    })
  }, [
    openExegesisOnMount,
    chapterId,
    verseNumber,
    search.tafsir,
    search.transliteration,
    locale,
    openExegesis,
  ])

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

  const currentScreen = activeScreens.at(-1)

  const fullLayoutScreens: Screen[] = [
    Screen.Export,
    Screen.Import,
    Screen.About,
    Screen.ExegesisDetail,
    Screen.ProstrationVersesDetail,
    Screen.Sidebar,
  ]

  const shouldUseFullLayout =
    currentScreen !== undefined && fullLayoutScreens.includes(currentScreen)

  return (
    <>
      <AppNavbar theme={theme} title={navbarTitle} />
      <QuranPaper
        theme={theme}
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
            ${shouldUseFullLayout &&
            css`
              min-width: 400px;
              max-width: 400px;

              /* Phone-class widths (iPhone 13 mini through the largest Pro
                 Max, ~375-430px): scale with the viewport so the panel never
                 overflows it. Above that, it's a static 400px regardless of
                 how much wider the screen gets. */
              @media (max-width: 430px) {
                min-width: 90vw;
                max-width: 90vw;
              }
            `};
          `,
          contentStyle: css`
            ${shouldUseFullLayout &&
            css`
              background-color: ${theme === "dark" ? "#202b24" : "#e1dfda"};
            `}
            padding: 0px;
          `,
        }}
      />
    </>
  )
}
