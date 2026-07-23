import { ThemeMode } from "@constants/theme"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { RiArrowLeftLine, RiArrowRightSLine } from "@remixicon/react"
import { Figure } from "@systatum/coneto/figure"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import styled, { css, CSSProp } from "styled-components"
import { Screen } from "@ui/index"
import { Button } from "@systatum/coneto/button"
import { StatefulForm } from "@systatum/coneto/stateful-form"
import { useIntl } from "react-intl"
import { messages } from "@i18n/message"
import useExegesisOptions from "@hooks/tools/useExegesisOptions"

export default function About({
  goBack,
  goToScreen,
}: Partial<ScreenProps<Screen>>) {
  const {
    userSettings: { theme },
  } = useUserSettingsState()
  const { formatMessage } = useIntl()
  const exegesisOptions = useExegesisOptions()

  return (
    <Wrapper $theme={theme}>
      <Button
        icon={{
          image: RiArrowLeftLine,
          size: 30,
        }}
        variant="ghost"
        size="icon"
        mobile
        styles={{
          containerStyle: css`
            position: fixed;
            top: 10px;
            left: 10px;
          `,
        }}
        onClick={() => {
          goBack?.()
        }}
      />

      <Item>
        <img src="/logo_full.png" alt="logo" width={120} height={120} />

        <SubItem>
          <H2>bil-Quran</H2>
          <Text>Version 1.0.0</Text>
          <Text>Released June 19, 2026</Text>
        </SubItem>
      </Item>

      <StatefulForm
        formValues={{}}
        mobile
        styles={{
          containerStyle: css`
            width: 400px;
          `,
        }}
        fields={exegesisOptions.flatMap((exegesisOption) =>
          (exegesisOption.groupOptions ?? []).map((option) => ({
            type: "button",
            name: option.text,
            title: option.text,
            button: {
              icon: {
                image: RiArrowRightSLine,
                size: 18,
              },
              "aria-label": "exegesis",
              styles: {
                self: css`
                  background: ${theme === "dark"
                    ? "#1a211d"
                    : "#ededed"} !important;
                  flex-direction: row-reverse;
                  justify-content: space-between;
                `,
              },
            },
            onClick: async () => {
              await goToScreen?.(Screen.ExegesisDetail)
            },
          })),
        )}
      />

      <Item
        $style={css`
          display: flex;
          position: fixed;
          bottom: 30px;
          gap: 10px;
          flex-direction: row;
        `}
      >
        <H2
          $style={css`
            font-family: "MontHeavy", sans-serif;
          `}
        >
          Systatum
        </H2>
      </Item>
    </Wrapper>
  )
}

interface StyleProp {
  $style?: CSSProp
  $flexDirection?: "row" | "column"
  $theme?: ThemeMode
}

const Wrapper = styled.div<StyleProp>`
  width: 100%;
  height: 100dvh;
  display: flex;
  padding: 40px 20px 100px 20px;
  flex-direction: ${({ $flexDirection }) => $flexDirection ?? "column"};
  align-items: center;
  justify-content: center;
  gap: 40px;
  background: ${({ $theme }) => ($theme === "dark" ? "#202b24" : "#e1dfda")};

  ${({ $style }) => $style}
`

const Item = styled.div<StyleProp>`
  width: 100%;
  display: flex;
  flex-direction: ${({ $flexDirection }) => $flexDirection ?? "column"};
  justify-content: center;
  align-items: center;
  gap: 20px;

  ${({ $style }) => $style}
`

const SubItem = styled.div<StyleProp>`
  width: fit-content;
  display: flex;
  flex-direction: ${({ $flexDirection }) => $flexDirection ?? "column"};
  align-items: center;

  ${({ $style }) => $style}
`

const H2 = styled.h2<StyleProp>`
  font-size: 24px;
  font-weight: 500;

  ${({ $style }) => $style}
`

const Text = styled.span<StyleProp & { $fontSize?: number }>`
  font-size: ${({ $fontSize }) => $fontSize ?? 14}px;

  ${({ $style }) => $style}
`
