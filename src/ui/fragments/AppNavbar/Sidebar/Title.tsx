import useUserSettingsState from "@hooks/states/UserSettingsState"
import { messages } from "@i18n/message"
import {
  RiArrowLeftLine,
  RiFileMarkedFill,
  RiFileMarkedLine,
  RiSettings5Fill,
  RiSettings5Line,
} from "@remixicon/react"
import * as Coneto from "@systatum/coneto/title"
import { useIntl } from "react-intl"
import { css } from "styled-components"
import { ContentType } from "."
import useExegesisState from "@hooks/states/ExegesisState"

const DARK_TEXT_COLOR = "#354526"
const LIGHT_TEXT_COLOR = "rgb(89, 77, 67)"
const DARK_BG_COLOR = "#8cba98"
const LIGHT_BG_COLOR = "rgb(173, 156, 141)"

interface TitleProps {
  onClosingSidebarRequested: () => void
  onActionClicked?: (action: ContentType) => void
  contentType?: ContentType
  rightSection?: Coneto.TitleSection[] | null
  withAction?: boolean
  styles?: Coneto.TitleStyles
}

export default function Title({
  onClosingSidebarRequested,
  onActionClicked,
  contentType,
  withAction = true,
  rightSection,
  styles,
}: TitleProps) {
  const { formatMessage } = useIntl()
  const {
    userSettings: { theme },
  } = useUserSettingsState()
  const { exegesisDetail, selectedExegesisId } = useExegesisState()

  const detail = selectedExegesisId ? exegesisDetail[selectedExegesisId] : null
  const authorName = detail?.authors.map((a) => a.name).join(", ")

  const TEXT_COLOR = theme === "dark" ? DARK_TEXT_COLOR : LIGHT_TEXT_COLOR

  let title = ""
  switch (contentType) {
    case ContentType.Bookmarks:
      title = formatMessage({ id: messages.bookmarks_and_notes })
      break
    case ContentType.Settings:
      title = formatMessage({ id: messages.settings })
      break
    case ContentType.Export:
      title = formatMessage({ id: messages.backup.export.title })
      break
    case ContentType.Import:
      title = formatMessage({ id: messages.backup.import.title })
      break
    case ContentType.ExegesisDetail:
      title = String(authorName)
      break
  }

  return (
    <Coneto.Title
      size="lg"
      text={title}
      pretitle="Bil-Quran"
      styles={{
        ...styles,
        containerStyle: css`
          background: ${theme === "dark" ? DARK_BG_COLOR : LIGHT_BG_COLOR};
          padding: 10px;
          ${styles?.containerStyle}
        `,
        titleStyle: css`
          color: ${TEXT_COLOR};
          ${styles?.titleStyle}
        `,
        pretitleStyle: css`
          color: ${TEXT_COLOR};
          ${styles?.pretitleStyle}
        `,
      }}
      leftSection={[
        {
          type: "actions",
          actions: [
            {
              icon: {
                image: RiArrowLeftLine,
                color: TEXT_COLOR,
              },
              onClick: () => {
                onClosingSidebarRequested()
              },
              caption: "Left",
            },
          ],
        },
      ]}
      rightSection={[
        {
          type: "actions",
          actions: [
            {
              id: "user-settings-button",
              icon: {
                image:
                  contentType === ContentType.Settings
                    ? RiSettings5Fill
                    : RiSettings5Line,
                color: TEXT_COLOR,
              },
              onClick: () => {
                onActionClicked?.(ContentType.Settings)
              },
              hidden: !withAction,
            },
            {
              id: "bookmarks-button",
              className: "bookmarks-button",
              icon: {
                image:
                  contentType === ContentType.Bookmarks
                    ? RiFileMarkedFill
                    : RiFileMarkedLine,
                color: TEXT_COLOR,
              },
              onClick: () => {
                onActionClicked?.(ContentType.Bookmarks)
              },
              hidden: !withAction,
            },
          ],
        },
        ...(rightSection ?? []),
      ]}
    />
  )
}
