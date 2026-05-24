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

export default App
