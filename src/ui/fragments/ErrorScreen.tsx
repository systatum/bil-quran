import { useState } from "react"
import styled from "styled-components"

import useAppState from "@hooks/states/AppState"

async function clearIndexedDb() {
  if (!("indexedDB" in window)) return

  // modern browsers
  if ("databases" in indexedDB) {
    const databases = await indexedDB.databases()

    await Promise.all(
      databases.map(
        (db) =>
          db.name &&
          new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(db.name!)

            request.onsuccess = () => resolve()
            request.onerror = () => resolve()
            request.onblocked = () => resolve()
          }),
      ),
    )
  }
}

async function factoryReset(clearLocalStorage: boolean) {
  if (clearLocalStorage) localStorage.clear()
  sessionStorage.clear()
  await clearIndexedDb()
}

export default function ErrorScreen() {
  const { errors } = useAppState()
  const [isResetting, setIsResetting] = useState(false)
  const [resetLocalStorage, setResetLocalStorage] = useState(true)

  async function resetFactorySettings() {
    try {
      setIsResetting(true)
      await factoryReset(resetLocalStorage)
      window.location.reload()
    } catch (e) {
      console.error("Failed resetting application", e)
      setIsResetting(false)
    }
  }

  return (
    <Container>
      <Card>
        <Logo src="/logo_full.png" alt="logo" />

        <Title>Something went wrong</Title>

        <Description>
          The application encountered an unexpected error while loading.
        </Description>

        <ErrorList>
          {Array(new Set(errors)).map((error, index) => (
            <ErrorItem key={index}>{error}</ErrorItem>
          ))}
        </ErrorList>

        <CheckboxRow>
          <input
            id="reset-ls"
            type="checkbox"
            checked={resetLocalStorage}
            onChange={(e) => setResetLocalStorage(e.target.checked)}
          />
          <label htmlFor="reset-ls">Reset local storage</label>
        </CheckboxRow>

        <ResetButton
          disabled={isResetting}
          onClick={() => {
            resetFactorySettings().catch(console.error)
          }}
        >
          {isResetting
            ? "Resetting..."
            : "Reset App & Restore Factory Settings"}
        </ResetButton>
      </Card>
    </Container>
  )
}

const Container = styled.div`
  min-height: 100dvh;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 24px;

  background: #181818;
`

const Card = styled.div`
  width: 100%;
  max-width: 520px;

  display: flex;
  flex-direction: column;
  align-items: center;

  padding: 28px 22px;

  border-radius: 20px;

  background: #222;
  border: 1px solid #333;
`

const Logo = styled.img`
  width: 84px;
  height: auto;
`

const Title = styled.h1`
  margin: 20px 0 8px;

  color: white;
  font-size: 24px;
  text-align: center;
`

const Description = styled.p`
  margin: 0;

  color: #b8b8b8;
  text-align: center;
  line-height: 1.5;
`

const ErrorList = styled.ul`
  width: 100%;

  margin: 24px 0;
  padding: 0;

  list-style: none;

  display: flex;
  flex-direction: column;
  gap: 8px;

  max-height: 240px;
  overflow-y: auto;
`

const ErrorItem = styled.li`
  padding: 10px 12px;

  border-radius: 10px;

  background: #2c2c2c;
  color: #d9d9d9;

  font-size: 13px;
  line-height: 1.4;

  overflow-wrap: anywhere;
`

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 12px;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #c44;
  }

  label {
    color: #b8b8b8;
    font-size: 14px;
    cursor: pointer;
    user-select: none;
  }
`

const ResetButton = styled.button`
  width: 100%;

  border: 0;
  border-radius: 12px;

  padding: 14px 16px;

  background: #c44;
  color: white;

  font-size: 15px;
  font-weight: 600;

  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`
