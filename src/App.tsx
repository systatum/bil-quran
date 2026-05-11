import { applyMigrations } from "@db/migrations"
import { seedData } from "@db/seeders"
import { useEffect, useRef, useState } from "react"
import "./App.css"
import logo from "./logo.svg"


function App() {
  const boostrappedRef = useRef(false)
  const [isReady, setIsReady] = useState<boolean>(false)
  const [isError, setIsError] = useState<boolean>(false)

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
        setIsReady(true)
      } catch (e) {
        console.error("Error preparing application", e)
        setIsError(true)
      }
    }

    bootstrap().catch((e) => {
      console.error("Unhandled bootstrap failure", e)
      setIsError(true)
    })
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  )
}

export default App
