import useAppState from "@hooks/states/AppState"
import useExegesisState from "@hooks/states/ExegesisState"
import usePaginationState from "@hooks/states/PaginationState"
import useExegesisOptions from "@hooks/tools/useExegesisOptions"
import useFirstVisibleVerse from "@hooks/tools/useFirstVisibleVerse"
import { resolveLocale } from "@i18n"
import { resolveExegesisSelection } from "@services/Converter"
import {
  ScreenEntry,
  ScreenTransition,
  ScreenTransitionRef,
} from "@systatum/coneto/screen-transition"
import { useMatchRoute, useParams, useSearch } from "@tanstack/react-router"
import { useEffect, useMemo, useRef } from "react"
import { css } from "styled-components"
import About from "./fragments/About"
import Contributors from "./fragments/About/Contributors"
import ExegesisDetail from "./fragments/About/ExegesisDetail"
import PrivacyPolicy from "./fragments/About/PrivacyPolicy"
import ProstrationVersesDetail from "./fragments/About/ProstrationVersesDetail"
import AppNavbar from "./fragments/AppNavbar"
import Sidebar from "./fragments/AppNavbar/Sidebar"
import { Export } from "./fragments/AppNavbar/Sidebar/Export"
import { Import } from "./fragments/AppNavbar/Sidebar/Import"
import QuranPaper from "./fragments/QuranPaper"
import ExegesisPaperDialogContent from "./fragments/QuranPaper/VerseRow/ExegesisPaperDialogContent"
import { LexemeDetailPaperDialog } from "./fragments/QuranPaper/VerseRow/LexemeDetailPaperDialog"
import usePaperDialogState, {
  registerScreenReopenNotifier,
} from "./hooks/states/PaperDialogState"
import useUserSettingsState from "./hooks/states/UserSettingsState"

interface UIIndexProps {
  /** When true, opens the exegesis paper dialog for the routed verse on mount. */
  openExegesisOnMount?: boolean
  /** When true, opens about mount. */
  openAboutOnMount?: boolean
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
  PrivacyPolicy: "privacy-policy",
  Contributors: "contributors",
} as const

export type Screen = (typeof Screen)[keyof typeof Screen]

export const SCREENS: Record<Screen, ScreenEntry> = {
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
  [Screen.PrivacyPolicy]: {
    component: PrivacyPolicy,
    closable: true,
  },
  [Screen.Contributors]: {
    component: Contributors,
    closable: true,
  },
}

export default function UIIndex({
  openExegesisOnMount,
  openAboutOnMount,
}: UIIndexProps = {}) {
  const matchRoute = useMatchRoute()
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

  const screenTransitionRef = useRef<ScreenTransitionRef>(null)
  useEffect(() => {
    registerScreenReopenNotifier((key) =>
      screenTransitionRef.current?.reopen(key),
    )
    return () => registerScreenReopenNotifier(null)
  }, [])

  // read params
  const params = useParams({ strict: false })
  const chapterId = params.chapter ? parseInt(params.chapter) : null
  const verseNumber = params.verse ? parseInt(params.verse) : null
  const search = useSearch({ strict: false })

  // ?locale= overrides which locale the exegesis/transliteration resolve
  // against for this deep link only, same as ?tafsir=/?transliteration=; it
  // never touches the user's persisted locale setting.
  const localeOverride =
    search.locale != null ? resolveLocale(String(search.locale)) : locale

  const openExegesis = usePaperDialogState((s) => s.openExegesis)
  const openedExegesisForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!openExegesisOnMount) return
    if (chapterId == null || verseNumber == null) return

    const target = `${chapterId}:${verseNumber}:${search.tafsir}:${search.transliteration}:${localeOverride}`
    if (openedExegesisForRef.current === target) return

    openedExegesisForRef.current = target

    openExegesis(
      chapterId,
      verseNumber,
      resolveExegesisSelection(
        search.tafsir,
        search.transliteration,
        localeOverride,
      ),
    )
  }, [
    openExegesisOnMount,
    chapterId,
    verseNumber,
    search.tafsir,
    search.transliteration,
    localeOverride,
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
    Screen.PrivacyPolicy,
    Screen.Contributors,
  ]

  const shouldUseFullLayout =
    currentScreen !== undefined && fullLayoutScreens.includes(currentScreen)

  // about configuration
  const exegesisOptions = useExegesisOptions()
  const { getExegesisDetail } = useExegesisState()

  const screenContent = params?.screen
  const isAboutRoute = matchRoute({
    to: "/about",
    fuzzy: true,
  })

  useEffect(() => {
    if (!isAboutRoute || !openAboutOnMount) return

    if (!screenContent) {
      setActiveScreens([Screen.About])
      return
    }

    if (screenContent === "privacy-policy") {
      setActiveScreens([Screen.About, Screen.PrivacyPolicy])
      return
    }

    if (screenContent === "prostration-verse") {
      setActiveScreens([Screen.About, Screen.ProstrationVersesDetail])
      return
    }

    if (screenContent === "contributors") {
      setActiveScreens([Screen.About, Screen.Contributors])
      return
    }

    const exegesisOption = exegesisOptions
      .flatMap((exegesisOption) => exegesisOption.groupOptions ?? [])
      .find((option) => String(option.value).split("/")[0] === screenContent)

    if (exegesisOption) {
      getExegesisDetail(String(exegesisOption.value), locale)
      setActiveScreens([Screen.About, Screen.ExegesisDetail])
      return
    }

    setActiveScreens([Screen.About])
  }, [screenContent, exegesisOptions, setActiveScreens, openAboutOnMount])

  return (
    <>
      <AppNavbar theme={theme} title={navbarTitle} />
      <QuranPaper
        theme={theme}
        chapterId={chapterId}
        verseNumber={verseNumber}
      />

      <ScreenTransition
        ref={screenTransitionRef}
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
