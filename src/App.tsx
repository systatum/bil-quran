import { ArabicFonts } from "@constants/fonts"
import { applyMigrations } from "@db/migrations"
import { seedData } from "@db/seeders"
import { RouterProvider } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import "./App.css"
import logo from "./logo.svg"
import useChaptersState from "./ui/hooks/states/ChaptersState"
import useUserSettingsState from "./ui/hooks/states/UserSettingsState"
import { router } from "./ui/router"

function App() {
  const boostrappedRef = useRef(false)
  const [isReady, setIsReady] = useState<boolean>(false)
  const [isError, setIsError] = useState<boolean>(false)
  const { loadChapters } = useChaptersState()
  const { restoreState } = useUserSettingsState()

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
        await applyMigrations()
        await seedData()
        await loadChapters()
        restoreState()

        setIsReady(true)
      } catch (e) {
        console.error("Error preparing application", e)
        throw e
      }
    }

    bootstrap().catch((e) => {
      console.log("CATCHING", e)
      throw e
    })
  }, [])

  if (isReady) {
    return <RouterProvider router={router} />
  } else {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>Loading...</p>
        </header>
      </div>
    )
  }
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

export default App
