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

const DARK_TEXT_COLOR = "#354526"
const LIGHT_TEXT_COLOR = "rgb(89, 77, 67)"
const DARK_BG_COLOR = "#8cba98"
const LIGHT_BG_COLOR = "rgb(173, 156, 141)"

interface TitleProps {
  onClosingSidebarRequested: () => void
  onActionClicked: (action: ContentType) => void
  contentType?: ContentType
}

export default function Title({
  onClosingSidebarRequested,
  onActionClicked,
  contentType,
}: TitleProps) {
  const { formatMessage } = useIntl()
  const {
    userSettings: { theme },
  } = useUserSettingsState()

  const TEXT_COLOR = theme === "dark" ? DARK_TEXT_COLOR : LIGHT_TEXT_COLOR

  let title = ""
  switch (contentType) {
    case ContentType.Bookmarks:
      title = formatMessage({ id: messages.bookmarks_and_notes })
      break
    case ContentType.Settings:
      title = formatMessage({ id: messages.settings })
      break
  }

  return (
    <Coneto.Title
      size="lg"
      text={title}
      pretitle="Bil-Quran"
      styles={{
        containerStyle: css`
          background: ${theme === "dark" ? DARK_BG_COLOR : LIGHT_BG_COLOR};
          padding: 10px;
        `,
        titleStyle: css`
          color: ${TEXT_COLOR};
        `,
        pretitleStyle: css`
          color: ${TEXT_COLOR};
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
                onActionClicked(ContentType.Settings)
              },
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
                onActionClicked(ContentType.Bookmarks)
              },
            },
          ],
        },
      ]}
    />
  )
}
