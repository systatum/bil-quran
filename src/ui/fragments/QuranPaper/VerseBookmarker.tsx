import useModalDialogState from "@hooks/states/ModalDialogState"
import usePaperDialogState from "@hooks/states/PaperDialogState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import useToast from "@hooks/tools/useToast"
import { messages } from "@i18n/message"
import {
  RiBookOpenLine,
  RiBookmarkLine,
  RiFileMarkedLine,
  RiMarkPenLine,
  RiPencilAi2Line,
} from "@remixicon/react"
import LOGGER from "@services/Logger"
import { ReactNode } from "react"
import { useIntl } from "react-intl"
import { CSSProp } from "styled-components"
import CircleButton from "./CircleButton"

interface VerseBookmarkerProps {
  chapterId: number
  verseNumber: number
  /** Rendered inside the trigger button; defaults to a plain bookmark icon. */
  children?: ReactNode
  /** Extra CSS applied to the CircleButton container (e.g. baseline alignment). */
  containerStyle?: CSSProp
  /** Whether to offer "Exegesis"; the exegesis dialog itself passes false. */
  showExegesisOption?: boolean
}

/**
 * Trigger + tip menu for the four verse-level actions (Bookmark / Note /
 * Highlight / Exegesis). Shared between `VerseMarker` (the reading view's
 * verse-number marker) and anywhere else a verse's bookmark controls need to
 * be surfaced, e.g. the exegesis dialog.
 */
export default function VerseBookmarker({
  chapterId,
  verseNumber,
  children,
  containerStyle,
  showExegesisOption = true,
}: VerseBookmarkerProps) {
  const { formatMessage } = useIntl()
  const { bookmarkVerse } = useUserSettingsState()
  const { showNoteVerseDialog, showHighlightVerseDialog } =
    useModalDialogState()
  const { openExegesis } = usePaperDialogState()
  const { errorToast } = useToast()

  const verseKey = `${chapterId}:${verseNumber}`

  return (
    <CircleButton
      subMenu={({ list }) =>
        list?.([
          {
            caption: formatMessage({ id: messages.bookmark }),
            icon: { image: RiFileMarkedLine },
            onClick: () => {
              if (!bookmarkVerse({ verseKey }))
                errorToast(
                  formatMessage({
                    id: messages.errors.bookmarkCreationFailed,
                  }),
                  formatMessage({ id: messages.bookmark }),
                )
            },
          },
          {
            caption: formatMessage({ id: messages.note }),
            icon: { image: RiPencilAi2Line },
            onClick: () => {
              LOGGER.debug("Showing note verse dialog for", verseKey)
              showNoteVerseDialog(verseKey)
            },
          },
          {
            caption: formatMessage({ id: messages.highlight }),
            icon: { image: RiMarkPenLine },
            onClick: () => {
              LOGGER.debug("Showing highlight verse dialog for", verseKey)
              showHighlightVerseDialog(verseKey)
            },
          },
          {
            caption: formatMessage({ id: messages.exegesis }),
            icon: { image: RiBookOpenLine },
            hidden: !showExegesisOption,
            onClick: () => {
              LOGGER.debug("Showing exegesis dialog for", verseKey)
              openExegesis(chapterId, verseNumber)
            },
          },
        ])
      }
      showSubMenuOn="self"
      containerStyle={containerStyle}
      aria-label="verse-bookmarker-btn"
    >
      {children ?? <RiBookmarkLine size={18} />}
    </CircleButton>
  )
}
