import React, { useEffect, useState } from "react"
import logo from "./logo.svg"
import "./App.css"
import { applyMigrations } from "@db/migrations"

function App() {
  const [isReady, setIsReady] = useState<boolean>(false)
  const [isError, setIsError] = useState<boolean>(false)

  useEffect(() => {
    async function bootstrap() {
      try {
        await applyMigrations()
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
