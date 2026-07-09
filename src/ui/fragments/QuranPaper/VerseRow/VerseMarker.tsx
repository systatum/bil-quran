import useModalDialogState from "@hooks/states/ModalDialogState"
import usePaperDialogState from "@hooks/states/PaperDialogState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import useToast from "@hooks/tools/useToast"
import { messages } from "@i18n/message"
import {
  RiBookOpenLine,
  RiFileMarkedLine,
  RiMarkPenLine,
  RiPencilAi2Line,
} from "@remixicon/react"
import LOGGER from "@services/Logger"
import { RefObject } from "react"
import { useIntl } from "react-intl"
import styled, { css } from "styled-components"
import { Verse } from "."
import CircleButton from "../CircleButton"

interface VerseMarkerProps {
  ref: RefObject<HTMLDivElement | null>
  verse: Verse
}

export function VerseMarker({ ref, verse }: VerseMarkerProps) {
  const { formatMessage } = useIntl()
  const { bookmarkVerse } = useUserSettingsState()
  const { showNoteVerseDialog, showHighlightVerseDialog } =
    useModalDialogState()
  const { openExegesis } = usePaperDialogState()
  const { errorToast } = useToast()

  return (
    <VerseMarkerColumn data-vmark ref={ref}>
      <CircleButton
        subMenu={({ list }) =>
          list?.([
            {
              caption: formatMessage({ id: messages.bookmark }),
              icon: { image: RiFileMarkedLine },
              onClick: () => {
                const verseKey = `${verse.chapter.id}:${verse.number}`
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
                const verseKey = `${verse.chapter.id}:${verse.number}`
                LOGGER.debug("Showing note verse dialog for", verseKey)
                showNoteVerseDialog(verseKey)
              },
            },
            {
              caption: formatMessage({ id: messages.highlight }),
              icon: { image: RiMarkPenLine },
              onClick: () => {
                const verseKey = `${verse.chapter.id}:${verse.number}`
                LOGGER.debug("Showing highlight verse dialog for", verseKey)
                showHighlightVerseDialog(verseKey)
              },
            },
            {
              caption: formatMessage({ id: messages.exegesis }),
              icon: { image: RiBookOpenLine },
              onClick: () => {
                LOGGER.debug(
                  "Showing exegesis dialog for",
                  `${verse.chapter.id}:${verse.number}`,
                )
                openExegesis(verse.chapter.id, verse.number)
              },
            },
          ])
        }
        showSubMenuOn="self"
        containerStyle={css`
          margin-top: 12px;
        `}
      >
        {verse.number}
      </CircleButton>
    </VerseMarkerColumn>
  )
}

const VerseMarkerColumn = styled.div`
  align-self: start;
  z-index: 1;
`
