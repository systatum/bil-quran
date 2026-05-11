import { Asset } from "@constants/assets"
import { ChapterRecord } from "@constants/records/chapters"
import { applyMigrations } from "@db/migrations"
import { repo } from "@db/repo/index"
import { useEffect, useRef, useState } from "react"
import "./App.css"
import logo from "./logo.svg"
import { unpackIPC } from "./services/Converter"

async function seedChapters() {
  const numberOfRecords = unpackIPC( await repo.chapters.count())
  console.debug("Number of registered chapters:", numberOfRecords)
  if (numberOfRecords > 0) return

  const chaptersMetadata: ChapterRecord[] = await (await fetch(Asset.chaptersMetadata)).json()
  for (const chapter of Object.entries(chaptersMetadata)) {
    const [number, detail] = chapter
    const createdChapter = await repo.chapters.create({ ...detail, id: parseInt(number) })
  }
}

// seed the app with minimal data so that it can work
async function seedData() {
  await seedChapters()
}

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
