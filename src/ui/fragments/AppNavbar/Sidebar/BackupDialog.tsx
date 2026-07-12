import { ModalDialogConfig } from "@constants/modalDialog"
import useToast from "@hooks/tools/useToast"
import { messages } from "@i18n/message"
import { encodeBase64Unicode } from "@services/Converter"
import { Textarea } from "@systatum/coneto/textarea"
import { useMemo } from "react"
import { useIntl } from "react-intl"
import styled, { css } from "styled-components"

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

export function useBackupDialog(): ModalDialogConfig {
  const { formatMessage } = useIntl()
  const { successToast, errorToast } = useToast()

  const encoded = useMemo(
    () => encodeBase64Unicode(localStorage.getItem("userSettings") ?? "{}"),
    [],
  )

  // memoized to avoid an infinite loop in ModalDialog's report-up effect
  return useMemo<ModalDialogConfig>(
    () => ({
      title: formatMessage({ id: messages.dialog.backup.title }),
      actions: [
        { id: "cancel", caption: formatMessage({ id: messages.cancel }) },
        {
          id: "copy",
          caption: formatMessage({ id: messages.dialog.backup.copy }),
        },
        {
          id: "download",
          caption: formatMessage({ id: messages.dialog.backup.download }),
          variant: "primary",
        },
      ],
      body: (
        <>
          <Description>
            {formatMessage({ id: messages.dialog.backup.description })}
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
        </>
      ),
      onAction(buttonId) {
        if (buttonId === "copy") {
          navigator.clipboard
            .writeText(encoded)
            .then(() =>
              successToast(
                formatMessage({ id: messages.dialog.backup.copySuccess }),
                formatMessage({ id: messages.backup }),
              ),
            )
            .catch(() =>
              errorToast(
                formatMessage({ id: messages.dialog.backup.copyFailed }),
                formatMessage({ id: messages.backup }),
              ),
            )
        } else if (buttonId === "download") {
          downloadTextFile(backupFilename(new Date()), encoded)
        }
      },
    }),
    // successToast/errorToast aren't memoized by useToast, so they're excluded to keep this stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formatMessage, encoded],
  )
}

const Description = styled.p`
  margin: 0 0 10px;
  font-size: 0.9em;
`
