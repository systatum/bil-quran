import styled, { css, CSSProp } from "styled-components"
import Title from "@ui/fragments/AppNavbar/Sidebar/Title"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import { Screen } from "@ui/index"
import { Textarea } from "@systatum/coneto/textarea"
import { useIntl } from "react-intl"
import { messages } from "@i18n/message"
import { ThemeMode } from "@constants/theme"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { StatefulForm } from "@systatum/coneto/stateful-form"
import { RiFileDownloadLine, RiFolderOpenLine } from "@remixicon/react"
import { useRef, useState } from "react"
import { decodeBase64Unicode } from "@services/Converter"
import { isPlainObject } from "@services/checker"
import useToast from "@hooks/tools/useToast"
import Tracker from "@services/Tracker"

export function Import({ goBack }: Partial<ScreenProps<Screen>>) {
  const { formatMessage } = useIntl()
  const { errorToast } = useToast()
  const {
    userSettings: { theme },
  } = useUserSettingsState()

  const [encoded, setEncoded] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  function importEncoded() {
    let decoded: string
    try {
      decoded = decodeBase64Unicode(encoded.trim())
      if (!isPlainObject(JSON.parse(decoded))) throw new Error()
    } catch {
      errorToast(
        formatMessage({ id: messages.backup.import.invalid }),
        formatMessage({ id: messages.backup.title }),
      )
      return
    }

    localStorage.setItem("userSettings", decoded)
    Tracker.track(Tracker.Event.BackupExportRestored)
    window.location.reload()
  }

  return (
    <>
      <Title
        contentType="import"
        withAction={false}
        onClosingSidebarRequested={() => {
          goBack?.()
        }}
      />

      <Wrapper $theme={theme}>
        <Textarea
          id="import-textarea"
          rows={6}
          width="100%"
          value={encoded}
          onChange={(e) => setEncoded(e.target.value)}
          placeholder={formatMessage({
            id: messages.backup.import.description,
          })}
          styles={{
            containerStyle: css`
              height: fit-content;
            `,
            self: css`
              font-size: 0.8em;
            `,
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".systatum,.txt,text/plain,application/octet-stream"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (!file) return

            file.text().then(setEncoded)
          }}
        />
        <StatefulForm
          mobile
          styles={{
            containerStyle: css`
              margin-top: 10px;
            `,
          }}
          formValues={{}}
          fields={[
            [
              {
                name: "text",
                title: formatMessage({ id: messages.backup.import.selectFile }),
                type: "button",
                onClick: () => fileInputRef.current?.click(),
                button: {
                  icon: {
                    image: RiFolderOpenLine,
                  },
                },
              },
              {
                name: "text",
                title: formatMessage({ id: messages.backup.import.import }),
                type: "button",
                disabled: !encoded.trim(),
                onClick: importEncoded,
                button: {
                  variant: "primary",
                  icon: {
                    image: RiFileDownloadLine,
                  },
                },
              },
            ],
          ]}
        />
      </Wrapper>
    </>
  )
}

const Wrapper = styled.div<{ $style?: CSSProp; $theme?: ThemeMode }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 20px;
  background: ${({ $theme }) => ($theme === "dark" ? "#202b24" : "#e1dfda")};
  height: 100%;
`
