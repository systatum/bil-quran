import { ModalDialogConfig } from "@constants/modalDialog"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { messages } from "@i18n/message"
import { Textarea } from "@systatum/coneto/textarea"
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { useIntl } from "react-intl"
import { css } from "styled-components"

/**
 * Config for the "Note this verse" dialog. `verseKey` is only passed in
 * while this is the active dialog — see `ModalDialog`.
 */
export function useNoteVerseDialog(
  verseKey: string | undefined,
): ModalDialogConfig {
  const { formatMessage } = useIntl()
  const { bookmarkVerse } = useUserSettingsState()
  const [note, setNote] = useState("")

  // this hook stays mounted, so reset on verse change or it'd leak text
  useEffect(() => {
    setNote("")
  }, [verseKey])

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
        if (buttonId !== "add" || verseKey == null) return
        if (!bookmarkVerse({ verseKey, note }))
          toast.error("Failed bookmarking")
      },
    }),
    [formatMessage, note, verseKey, bookmarkVerse],
  )
}
