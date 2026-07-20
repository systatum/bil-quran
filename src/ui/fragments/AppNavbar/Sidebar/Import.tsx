import styled, { css, CSSProp } from "styled-components"
import Title from "@ui/fragments/AppNavbar/Sidebar/Title"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import { Screen } from "@ui/index"
import { Textarea } from "@systatum/coneto/textarea"
import { useIntl } from "react-intl"
import { messages } from "@i18n/message"
import { ThemeMode } from "@constants/theme"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { StatefulForm } from "@systatum/coneto/stateful-form"
import { RiUpload2Line } from "@remixicon/react"

export function Import({ goBack }: Partial<ScreenProps<Screen>>) {
  const { formatMessage } = useIntl()
  const {
    userSettings: { theme },
  } = useUserSettingsState()

  return (
    <>
      <Title
        contentType="import"
        withAction={false}
        onClosingSidebarRequested={() => {
          goBack?.()
        }}
      />

      <Wrapper $theme={theme}>
        <Textarea
          rows={6}
          width="100%"
          value={""}
          placeholder={formatMessage({
            id: messages.backup.import.description,
          })}
          styles={{
            containerStyle: css`
              height: fit-content;
            `,
            self: css`
              font-size: 0.8em;
            `,
          }}
        />
        <StatefulForm
          mobile
          styles={{
            containerStyle: css`
              margin-top: 10px;
            `,
          }}
          formValues={{}}
          fields={[
            {
              name: "text",
              title: formatMessage({ id: messages.backup.import.import }),
              type: "button",
              onClick: () => {},
              button: {
                variant: "primary",
                icon: {
                  image: RiUpload2Line,
                },
              },
            },
          ]}
        />
      </Wrapper>
    </>
  )
}

const Wrapper = styled.div<{ $style?: CSSProp; $theme?: ThemeMode }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 20px;
  background: ${({ $theme }) => ($theme === "dark" ? "#202b24" : "#e1dfda")};
  height: 100%;
`
