import { ArabicFonts } from "@constants/fonts"
import { applyMigrations } from "@db/migrations"
import { seedData, seedWordTranslations } from "@db/seeders"
import useAppState from "@hooks/states/AppState"
import { loadMessages, resolveLocale } from "@i18n"
import { I18nProvider } from "@i18n/provider"
import { RouterProvider } from "@tanstack/react-router"
import { JSX, useEffect, useRef, useState } from "react"
import "./App.css"
import ErrorRescuer from "./ErrorRescuer"
import ErrorScreen from "./ui/fragments/ErrorScreen"
import LoadingScreen from "./ui/fragments/LoadingScreen"
import useChaptersState from "./ui/hooks/states/ChaptersState"
import useUserSettingsState from "./ui/hooks/states/UserSettingsState"
import { router } from "./ui/router"

function AppRoot() {
  const { loadChapters } = useChaptersState()
  const { restoreState } = useUserSettingsState()
  const {
    setLoadingText,
    isVersesLoaded: isFullyLoaded,
    pushError,
    errors,
  } = useAppState()

  // ensure the minimum data is in the database
  const boostrappedRef = useRef(false)
  const [isBootstrapped, setIsBootstrapped] = useState<boolean>(false)

  useEffect(() => {
    // the code in this effect is very sensistive and must only be run once
    //
    // in react dev mode, under StrictMode, react renders/paints the dom twice
    // which can cause this function to run twice, which is not what we want
    // as doing so can jeopardize the database structure
    if (boostrappedRef.current) return
    boostrappedRef.current = true

    async function bootstrap() {
      try {
        registerFonts()

        setLoadingText("Setting up local storage...")
        await applyMigrations()

        setLoadingText("Seeding verses...")
        await seedData()
        setLoadingText("Loading chapters...")
        loadChapters()

        setLoadingText("Seeding translations...")
        await seedWordTranslations()

        setLoadingText("Preparing the layout...")

        restoreState()
        setIsBootstrapped(true)
      } catch (e) {
        console.error("Error preparing application", e)
        pushError(e)
      }
    }

    bootstrap()
  }, [])

  return (
    <>
      {(!isBootstrapped || !isFullyLoaded) && errors.length === 0 && (
        <LoadingScreen />
      )}
      {isBootstrapped && errors.length === 0 && (
        <RouterProvider router={router} />
      )}
      {errors.length > 0 && <ErrorScreen />}
    </>
  )
}

/**
 * Register fonts available
 */
const FONT_ASSETS_BASE_URL = "https://assets.bil-quran.com/fonts"
export function registerFonts(): void {
  const css = Object.entries(ArabicFonts)
    .map(([fontId, { relativePath }]) => {
      const url = `${FONT_ASSETS_BASE_URL}/${relativePath}`

      return `
        @font-face {
          font-family: "${fontId}";
          font-style: normal;
          font-display: swap;
          font-weight: 400;
          font-synthesis: none;
          text-rendering: optimizeLegibility;
          src:
            url("${url}.woff2") format("woff2"),
            url("${url}.woff") format("woff"),
            url("${url}.ttf") format("truetype");
        }`
    })
    .join("\n")

  const style = document.createElement("style")
  style.setAttribute("data-fonts", "generated")
  style.textContent = css

  document.head.appendChild(style)
}

function App(): JSX.Element {
  const [messages, setMessages] = useState<Record<string, string>>({})
  const { userSettings } = useUserSettingsState()
  const locale = resolveLocale(userSettings.locale)

  // load the locale
  useEffect(() => {
    loadMessages(locale)
      .then((values) => setMessages(values))
      .catch((e) => {
        throw e
      })
  }, [userSettings.locale])

  return (
    <ErrorRescuer>
      <I18nProvider locale={locale} messages={messages}>
        <AppRoot />
      </I18nProvider>
    </ErrorRescuer>
  )
}

export default App
