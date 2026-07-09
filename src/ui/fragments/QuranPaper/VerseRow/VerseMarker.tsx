import useModalDialogState from "@hooks/states/ModalDialogState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { messages } from "@i18n/message"
import {
  RiFileMarkedLine,
  RiMarkPenLine,
  RiPencilAi2Line,
} from "@remixicon/react"
import LOGGER from "@services/Logger"
import { RefObject } from "react"
import toast from "react-hot-toast"
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

  return (
    <VerseMarkerColumn data-vmark ref={ref}>
      <CircleButton
        subMenu={({ list }) =>
          list?.([
            {
              caption: formatMessage({
                id: messages.tipMenu.verseMarker.bookmark,
              }),
              icon: { image: RiFileMarkedLine },
              onClick: () => {
                const verseKey = `${verse.chapter.id}:${verse.number}`
                if (!bookmarkVerse({ verseKey }))
                  toast.error("Failed bookmarking")
              },
            },
            {
              caption: formatMessage({
                id: messages.tipMenu.verseMarker.note,
              }),
              icon: { image: RiPencilAi2Line },
              onClick: () => {
                const verseKey = `${verse.chapter.id}:${verse.number}`
                LOGGER.debug("Showing note verse dialog for", verseKey)
                showNoteVerseDialog(verseKey)
              },
            },
            {
              caption: formatMessage({
                id: messages.tipMenu.verseMarker.highlight,
              }),
              icon: { image: RiMarkPenLine },
              onClick: () => {
                const verseKey = `${verse.chapter.id}:${verse.number}`
                LOGGER.debug("Showing highlight verse dialog for", verseKey)
                showHighlightVerseDialog(verseKey)
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
