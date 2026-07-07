import useNoteVerseDialogState from "@hooks/states/NoteVerseDialogState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { messages } from "@i18n/message"
import LOGGER from "@services/Logger"
import { Dialog } from "@systatum/coneto/dialog"
import { Textarea } from "@systatum/coneto/textarea"
import { useState } from "react"
import toast from "react-hot-toast"
import { useIntl } from "react-intl"
import styled, { css } from "styled-components"

export default function NoteVerseDialog() {
  const { formatMessage } = useIntl()
  const [note, setNote] = useState<string>("")
  const { bookmarkVerse } = useUserSettingsState()
  const { isOpen, verseKey, setIsOpen } = useNoteVerseDialogState()

  return (
    <>
      <Dialog
        mobile
        closable={false}
        isOpen={isOpen}
        title={formatMessage({ id: messages.dialog.noteVerse.title })}
        onClick={({ buttonId, closeDialog }) => {
          switch (buttonId) {
            case "cancel":
              break

            case "add": {
              if (verseKey == null)
                return toast.error("Cannot bookmark unknown verse")
              LOGGER.debug(`Bookmarking ${verseKey} with note: ${note}`)
              bookmarkVerse({ verseKey: verseKey, note })
            }
          }

          closeDialog()
        }}
        onVisibilityChange={(isOpen) => setIsOpen(!!isOpen)}
        actions={[
          {
            id: "cancel",
            caption: formatMessage({ id: messages.cancel }),
          },
          {
            id: "add",
            caption: formatMessage({ id: messages.add }),
            variant: "primary",
          },
        ]}
      >
        <Content>
          <Textarea
            rows={4}
            width="100%"
            onChange={(e) => setNote(e.target.value)}
            placeholder={formatMessage({
              id: messages.dialog.noteVerse.input.placeholder,
            })}
            styles={{
              self: css`
                font-size: 1.5em;
              `,
            }}
          />
        </Content>
      </Dialog>
    </>
  )
}

const Content = styled.div`
  padding: 10px 15px;
`
