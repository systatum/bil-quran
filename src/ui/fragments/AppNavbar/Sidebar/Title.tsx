import useUserSettingsState from "@hooks/states/UserSettingsState"
import { RiArrowLeftLine } from "@remixicon/react"
import * as Coneto from "@systatum/coneto/title"
import { css } from "styled-components"

const DARK_TEXT_COLOR = "#354526"
const LIGHT_TEXT_COLOR = "rgb(89, 77, 67)"
const DARK_BG_COLOR = "#8cba98"
const LIGHT_BG_COLOR = "rgb(173, 156, 141)"

interface TitleProps {
  onClosingSidebarRequested: () => void
}

export default function Title({
  onClosingSidebarRequested: onBackButtonPressed,
}: TitleProps) {
  const {
    userSettings: { theme },
  } = useUserSettingsState()

  const TEXT_COLOR = theme === "dark" ? DARK_TEXT_COLOR : LIGHT_TEXT_COLOR

  return (
    <Coneto.Title
      size="lg"
      text="Bil-Qur'an"
      styles={{
        containerStyle: css`
          background: ${theme === "dark" ? DARK_BG_COLOR : LIGHT_BG_COLOR};
          padding: 10px;
        `,
        titleStyle: css`
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
                onBackButtonPressed()
              },
              caption: "Left",
            },
          ],
        },
      ]}
    />
  )
}
