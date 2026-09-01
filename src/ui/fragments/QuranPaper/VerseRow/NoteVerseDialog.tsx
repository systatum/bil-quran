import { ModalDialogConfig } from "@constants/modalDialog"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import useToast from "@hooks/tools/useToast"
import { messages } from "@i18n/message"
import Tracker from "@services/Tracker"
import { Textarea } from "@systatum/coneto/textarea"
import { useEffect, useMemo, useState } from "react"
import { useIntl } from "react-intl"
import { css } from "styled-components"

export function useNoteVerseDialog(verseKey: string): ModalDialogConfig {
  const { formatMessage } = useIntl()
  const { userSettings, bookmarkVerse } = useUserSettingsState()
  const { errorToast } = useToast()
  const [note, setNote] = useState("")

  // this hook stays mounted, so reset on verse change or it'd leak the note
  useEffect(() => {
    setNote(userSettings.bookmarks.list[verseKey]?.note ?? "")
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
          key={verseKey /* reset per verse */}
          rows={4}
          width="100%"
          defaultValue={note /* avoid caret-reset */}
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
        if (!bookmarkVerse({ verseKey, note })) {
          errorToast(
            formatMessage({ id: messages.errors.bookmarkCreationFailed }),
            formatMessage({ id: messages.bookmark }),
          )
          return
        }
        Tracker.track(Tracker.Event.VerseNoteSaved)
      },
    }),
    [formatMessage, note, setNote, verseKey, bookmarkVerse],
  )
}
