import { ModalDialogConfig } from "@constants/modalDialog"
import useModalDialogState, {
  ModalDialogContent,
} from "@hooks/states/ModalDialogState"
import { Dialog } from "@systatum/coneto/dialog"
import { useEffect, useState } from "react"
import styled from "styled-components"
import { useHighlightVerseDialog } from "./VerseRow/HighlightVerseDialog"
import { useNoteVerseDialog } from "./VerseRow/NoteVerseDialog"

// type → the hook that builds that dialog's config; add an entry per new type
const DIALOG_HOOKS: Record<
  ModalDialogContent["type"],
  (verseKey: string) => ModalDialogConfig
> = {
  note: useNoteVerseDialog,
  highlight: useHighlightVerseDialog,
}

// Calls only the active type's hook (remounts via `key` on type change,
// since switching which hook a component calls mid-lifetime breaks rules
// of hooks) and reports the config up, so inactive types never run.
function ActiveDialogConfig({
  content,
  onConfig,
}: {
  content: ModalDialogContent
  onConfig: (config: ModalDialogConfig) => void
}) {
  const useDialog = DIALOG_HOOKS[content.type]
  const config = useDialog(content.verseKey)

  useEffect(() => {
    onConfig(config)
  }, [config, onConfig])

  return null
}

/** Single dialog mounted once at the root; content/config comes from `ActiveDialogConfig`. */
export default function ModalDialog() {
  const { content, close } = useModalDialogState()

  // survives `content` going null so the Dialog has something to render
  // while its own close animation plays out
  const [active, setActive] = useState<ModalDialogConfig | null>(null)

  return (
    <>
      {content && (
        <ActiveDialogConfig
          key={content.type}
          content={content}
          onConfig={setActive}
        />
      )}

      <Dialog
        mobile
        closable={false}
        isOpen={content != null}
        title={active?.title ?? ""}
        onClick={({ buttonId, closeDialog }) => {
          active?.onAction(buttonId)
          closeDialog()
        }}
        onVisibilityChange={(isOpen) => {
          if (!isOpen) close()
        }}
        actions={active?.actions ?? []}
      >
        <Content>{active?.body}</Content>
      </Dialog>
    </>
  )
}

const Content = styled.div`
  padding: 10px 15px;
`
