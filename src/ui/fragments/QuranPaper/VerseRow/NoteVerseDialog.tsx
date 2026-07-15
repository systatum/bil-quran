import { ModalDialogConfig } from "@constants/modalDialog"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import useToast from "@hooks/tools/useToast"
import { messages } from "@i18n/message"
import { Textarea } from "@systatum/coneto/textarea"
import { useMemo, useState } from "react"
import { useIntl } from "react-intl"
import { css } from "styled-components"

export function useNoteVerseDialog(verseKey: string): ModalDialogConfig {
  const { formatMessage } = useIntl()
  const { userSettings, bookmarkVerse } = useUserSettingsState()
  const { errorToast } = useToast()
  const [note, setNote] = useState(userSettings.bookmarks.list[verseKey]?.note)

  // memoized to avoid an infinite loop in ModalDialog's report-up effect
  return useMemo<ModalDialogConfig>(
    () => ({
      title: formatMessage({ id: messages.dialog.noteVerse.title }),
      actions: [
        { id: "cancel", caption: formatMessage({ id: messages.cancel }) },
        {
          id: "add",
          caption: formatMessage({ id: messages.add }),
          variant: "primary",
        },
      ],
      body: (
        <Textarea
          rows={4}
          width="100%"
          value={note}
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
      ),
      onAction(buttonId) {
        if (buttonId !== "add") return
        if (!bookmarkVerse({ verseKey, note }))
          errorToast(
            formatMessage({ id: messages.errors.bookmarkCreationFailed }),
            formatMessage({ id: messages.bookmark }),
          )
      },
    }),
    [formatMessage, note, setNote, verseKey, bookmarkVerse],
  )
}
