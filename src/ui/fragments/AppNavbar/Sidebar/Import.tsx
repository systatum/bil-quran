import React from "react"
import styled, { css, CSSProp } from "styled-components"
import Title from "@ui/fragments/AppNavbar/Sidebar/Title"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import { Screen } from "@ui/fragments/AppNavbar/Sidebar"
import { Textarea } from "@systatum/coneto/textarea"
import { useIntl } from "react-intl"
import { messages } from "@i18n/message"

export function Import({ goBack }: Partial<ScreenProps<Screen>>) {
  const { formatMessage } = useIntl()

  return (
    <>
      <Title
        contentType="import"
        withAction={false}
        onClosingSidebarRequested={() => {
          goBack?.()
        }}
      />

      <Wrapper>
        <Textarea
          rows={6}
          width="100%"
          value={""}
          placeholder={formatMessage({
            id: messages.backup.import.description,
          })}
          styles={{
            self: css`
              font-size: 0.8em;
            `,
          }}
        />
      </Wrapper>
    </>
  )
}

const Wrapper = styled.div<{ $style?: CSSProp }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 20px;
`
