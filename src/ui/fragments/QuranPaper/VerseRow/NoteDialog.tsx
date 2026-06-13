import useUserSettingsState from "@hooks/states/UserSettingsState"
import { messages } from "@i18n/message"
import { Dialog } from "@systatum/coneto/dialog"
import { Textarea } from "@systatum/coneto/textarea"
import { useState } from "react"
import { useIntl } from "react-intl"
import styled, { css } from "styled-components"

interface NoteVerseDialog {
  isOpen: boolean
  verseKey: string
  onVisibilityChange: (state: boolean | undefined) => void
}

export default function NoteVerseDialog({
  verseKey: key,
  isOpen,
  onVisibilityChange,
}: NoteVerseDialog) {
  const { formatMessage } = useIntl()
  const [note, setNote] = useState<string>("")
  const { bookmarkVerse } = useUserSettingsState()

  return (
    <>
      <Dialog
        mobile
        closable={false}
        isOpen={isOpen}
        title={formatMessage({ id: messages.dialog.noteVerse.title })}
        onClick={({ closeDialog }) => {
          bookmarkVerse({ verseKey: key, note })
          closeDialog()
        }}
        onVisibilityChange={onVisibilityChange}
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
