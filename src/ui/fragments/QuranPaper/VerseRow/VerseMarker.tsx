import useNoteVerseDialogState from "@hooks/states/NoteVerseDialogState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { messages } from "@i18n/message"
import { RiFileMarkedLine, RiPencilAi2Line } from "@remixicon/react"
import LOGGER from "@services/Logger"
import { Button } from "@systatum/coneto/button"
import { useTheme } from "@systatum/coneto/theme"
import { RefObject, useState } from "react"
import toast from "react-hot-toast"
import { useIntl } from "react-intl"
import styled, { css } from "styled-components"
import { Verse } from "."

interface VerseMarkerProps {
  ref: RefObject<HTMLDivElement | null>
  verse: Verse
}

export function VerseMarker({ ref, verse }: VerseMarkerProps) {
  const { mode: theme } = useTheme()
  const { formatMessage } = useIntl()
  const [isTipMenuOpen, setIsTipMenuOpen] = useState(false)
  const [verseKey, setVerseKey] = useState<string>("")

  const { userSettings, bookmarkVerse } = useUserSettingsState()
  const { showNoteVerseDialog } = useNoteVerseDialogState()

  return (
    <VerseMarkerColumn data-vmark ref={ref}>
      <Button
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
          ])
        }
        showSubMenuOn="self"
        onOpen={(isOpen) => setIsTipMenuOpen(isOpen)}
        open={isTipMenuOpen}
        styles={{
          containerStyle: css`
            padding: 0;
            margin-top: 12px;
          `,
          self: css`
            padding: 0;
            height: fit-content;
            width: fit-content;
            border-radius: 9999px;

            --text: ${theme === "dark" ? "#e5dcc3" : "#755f4d"};
            --border: ${theme === "dark" ? "#5f5644" : "#cbb9a1"};
            --bg-start: ${theme === "dark" ? "#2b2a26" : "#efe6d8"};
            --bg-end: ${theme === "dark" ? "#1c1b18" : "#e2d6c3"};
            --inset: ${theme === "dark" ? "#3b372f" : "#f4ede2"};
            --shadow: ${theme === "dark"
              ? "rgba(0,0,0,0.45)"
              : "rgba(117,95,77,0.08)"};
            --text-shadow: ${theme === "dark"
              ? "rgba(0,0,0,0.35)"
              : "rgba(255,255,255,0.30)"};
            --dashed: ${theme === "dark" ? "#7b715b" : "rgba(117,95,77,0.26)"};
            --dashed-opacity: ${theme === "dark" ? 0.4 : 0.5};

            &:hover {
              --shadow: none;
            }

            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            position: relative;
            border-radius: 50%;
            font-size: 18px;
            color: var(--text);
            border: 1.5px solid var(--border);

            background: radial-gradient(
              circle,
              var(--bg-start) 40%,
              var(--bg-end) 100%
            );
            box-shadow:
              inset 0 0 0 2px var(--inset),
              0 1px 3px var(--shadow);
            text-shadow: 0 1px 0 var(--text-shadow);

            &::after {
              content: "";
              position: absolute;
              inset: 4px;
              border-radius: 50%;
              border: 1px dashed var(--dashed);
              opacity: var(--dashed-opacity);
              cursor: pointer;
            }

            ${isTipMenuOpen &&
            css`
              box-shadow:
                inset 0 0 5px rgba(117, 95, 77, 0.35),
                inset 0 0 2px rgba(0, 0, 0, 0.12);
              background: radial-gradient(
                circle,
                var(--bg-start) 40%,
                var(--bg-end) 100%
              );
            `}
          `,
        }}
      >
        {verse.number}
      </Button>
    </VerseMarkerColumn>
  )
}

const VerseMarkerColumn = styled.div`
  align-self: start;
  z-index: 1;
`
