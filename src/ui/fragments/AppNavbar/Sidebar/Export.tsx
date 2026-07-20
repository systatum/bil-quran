import useToast from "@hooks/tools/useToast"
import { messages } from "@i18n/message"
import { encodeBase64Unicode } from "@services/Converter"
import { Textarea } from "@systatum/coneto/textarea"
import { useMemo } from "react"
import { useIntl } from "react-intl"
import styled, { css, CSSProp } from "styled-components"
import Title from "./Title"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import { Screen } from "./index"
import { StatefulForm } from "@systatum/coneto/stateful-form"
import {
  RiDownload2Line,
  RiFileCopy2Line,
  RiUpload2Line,
} from "@remixicon/react"

function backupFilename(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `bilQuran-${yy}${mm}${dd}-state.systatum`
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/octet-stream" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function Export({ goBack, goToScreen }: Partial<ScreenProps<Screen>>) {
  const { formatMessage } = useIntl()
  const { successToast, errorToast } = useToast()

  const encoded = useMemo(
    () => encodeBase64Unicode(localStorage.getItem("userSettings") ?? "{}"),
    [],
  )

  return (
    <>
      <Title
        contentType="export"
        withAction={false}
        rightSection={[
          {
            type: "actions",
            actions: [
              {
                caption: "Import",
                icon: {
                  image: RiUpload2Line,
                },
                onClick: () => goToScreen?.(Screen.Import),
              },
            ],
          },
        ]}
        onClosingSidebarRequested={() => {
          goBack?.()
        }}
      />

      <Wrapper>
        <Description>
          {formatMessage({ id: messages.backup.export.description })}
        </Description>
        <Textarea
          rows={6}
          width="100%"
          value={encoded}
          readOnly
          styles={{
            self: css`
              font-size: 0.8em;
            `,
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
                title: "Copy",
                type: "button",
                onClick: () => {
                  navigator.clipboard
                    .writeText(encoded)
                    .then(() =>
                      successToast(
                        formatMessage({
                          id: messages.backup.export.copySuccess,
                        }),
                        formatMessage({ id: messages.backup.title }),
                      ),
                    )
                    .catch(() =>
                      errorToast(
                        formatMessage({
                          id: messages.backup.export.copyFailed,
                        }),
                        formatMessage({ id: messages.backup.title }),
                      ),
                    )
                },
                button: {
                  icon: {
                    image: RiFileCopy2Line,
                  },
                },
              },
              {
                name: "text",
                title: "Download",
                type: "button",
                onClick: () => {
                  downloadTextFile(backupFilename(new Date()), encoded)
                },
                button: {
                  variant: "primary",
                  icon: {
                    image: RiDownload2Line,
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

const Wrapper = styled.div<{ $style?: CSSProp }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 20px;
`

const Description = styled.p`
  margin: 0 0 10px;
  font-size: 0.9em;
`
