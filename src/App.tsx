import { ArabicFonts } from "@constants/fonts"
import { initDbDriver } from "@db/driver"
import { applyMigrations } from "@db/migrations"
import { repo } from "@db/repo"
import { seedData } from "@db/seeders"
import useAppState from "@hooks/states/AppState"
import { loadMessages, resolveLocale } from "@i18n"
import { I18nProvider } from "@i18n/provider"
import { Theme } from "@systatum/coneto/theme"
import { RouterProvider } from "@tanstack/react-router"
import { JSX, useEffect, useRef, useState } from "react"
import "./App.css"
import ErrorRescuer from "./ErrorRescuer"
import ErrorScreen from "./ui/fragments/ErrorScreen"
import LoadingScreen from "./ui/fragments/LoadingScreen"
import useChaptersState from "./ui/hooks/states/ChaptersState"
import useUserSettingsState from "./ui/hooks/states/UserSettingsState"
import "./posthog"
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
  const {
    userSettings: { theme },
  } = useUserSettingsState()

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
        setLoadingText("Registering fonts...")
        registerFonts()

        setLoadingText("Init database connection...")
        await initDbDriver()

        setLoadingText("Setting up local storage...")
        await applyMigrations()

        await seedData((progress) => {
          if (progress === "verses") setLoadingText("Seeding verses...")
          else if (progress === "paginations")
            setLoadingText("Seeding paginations...")
        })

        setLoadingText("Loading chapters...")
        loadChapters()

        setLoadingText("Preparing the layout...")

        // this is done only for testing/development, so we can debug/test by looking at the db
        if (process.env.NODE_ENV !== "production") {
          ;(window as any).__repo = repo
        }

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
    <Theme mode={theme}>
      {(!isBootstrapped || !isFullyLoaded) && errors.length === 0 && (
        <LoadingScreen />
      )}
      {isBootstrapped && errors.length === 0 && (
        <RouterProvider router={router} />
      )}
      {errors.length > 0 && <ErrorScreen />}
    </Theme>
  )
}

/**
 * Register fonts available
 */
const FONT_ASSETS_BASE_URL = "/fonts"
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
