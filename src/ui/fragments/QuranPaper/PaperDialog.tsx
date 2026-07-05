import usePaperDialogState from "@hooks/states/PaperDialogState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import * as Coneto from "@systatum/coneto/paper-dialog"
import { useTheme } from "@systatum/coneto/theme"
import { useEffect, useRef } from "react"
import { css } from "styled-components"
import ExegesisPaperDialogContent from "./VerseRow/ExegesisPaperDialogContent"
import { LexemeDetailPaperDialog } from "./VerseRow/LexemeDetailPaperDialog"

export default function QuranPaperDialog() {
  const { mode: theme } = useTheme()
  const paperDialogRef = useRef<Coneto.PaperDialogRef>(null)
  const { content, openCount } = usePaperDialogState()
  const { userSettings } = useUserSettingsState()

  useEffect(() => {
    if (openCount > 0) paperDialogRef.current?.openDialog()
  }, [openCount])

  return (
    <Coneto.PaperDialog
      mobile
      ref={paperDialogRef}
      height="55dvh"
      controls={[]}
      closable
      resizable
      styles={{
        indicatorStyle: css`
          height: 40px;
        `,
        contentStyle: css`
          display: flex;
          min-width: auto;
          overflow-wrap: break-word;
          flex-direction: column;
          overflow-y: auto;
          gap: 0px;
          padding: 0px;
          margin-top: 0px;
        `,
      }}
    >
      {content?.type === "lexeme" && (
        <LexemeDetailPaperDialog
          occurrences={content.occurrences}
          content={content.word}
          arabicFont={userSettings.font.arabic.family}
        />
      )}
      {content?.type === "exegesis" && (
        <ExegesisPaperDialogContent
          chapterId={content.chapterId}
          verseNumber={content.verseNumber}
        />
      )}
    </Coneto.PaperDialog>
  )
}
