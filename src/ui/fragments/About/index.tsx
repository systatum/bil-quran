import { ThemeMode } from "@constants/theme"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { RiArrowLeftLine, RiArrowRightSLine } from "@remixicon/react"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import { css } from "styled-components"
import { Screen } from "@ui/index"
import { Button } from "@systatum/coneto/button"
import { StatefulForm } from "@systatum/coneto/stateful-form"
import useExegesisOptions from "@hooks/tools/useExegesisOptions"
import useExegesisState from "@hooks/states/ExegesisState"
import { resolveLocale } from "@i18n"
import { H2, Item, SubItem, Text, Wrapper } from "@ui/fragments"

export default function About({
  goBack,
  goToScreen,
}: Partial<ScreenProps<Screen>>) {
  const {
    userSettings: { theme },
  } = useUserSettingsState()
  const exegesisOptions = useExegesisOptions()
  const { getExegesisDetail } = useExegesisState()

  const { userSettings } = useUserSettingsState()
  const locale = resolveLocale(userSettings.locale)

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
        <img src="/logo_full.png" alt="logo" width={180} height={180} />

        <SubItem
          $style={css`
            align-items: center;
          `}
        >
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
              await getExegesisDetail(String(option.value), locale)
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
        <img src={"./systatum.png"} width={40} height={40} />
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
