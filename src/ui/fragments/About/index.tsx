import { ENV } from "@constants/env"
import useExegesisState from "@hooks/states/ExegesisState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import useExegesisOptions from "@hooks/tools/useExegesisOptions"
import { resolveLocale } from "@i18n"
import { messages } from "@i18n/message"
import { RiArrowLeftLine, RiArrowRightSLine } from "@remixicon/react"
import { Button } from "@systatum/coneto/button"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import { FormFieldGroup, StatefulForm } from "@systatum/coneto/stateful-form"
import { Item, SubItem, Text, Wrapper } from "@ui/fragments"
import { Screen } from "@ui/index"
import { useIntl } from "react-intl"
import { css } from "styled-components"
import Headings from "../Headings"
import { useNavigate } from "@tanstack/react-router"

export default function About({
  goBack,
  goToScreen,
}: Partial<ScreenProps<Screen>>) {
  const navigate = useNavigate()
  const { formatMessage } = useIntl()
  const {
    userSettings: { theme, locale: rawLocal },
  } = useUserSettingsState()
  const exegesisOptions = useExegesisOptions()
  const { getExegesisDetail } = useExegesisState()

  const locale = resolveLocale(rawLocal)

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
            position: absolute;
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
          <Headings.Second>bil-Qur'an</Headings.Second>
          <Text>
            {formatMessage({ id: messages.about.version })} {ENV.version}
          </Text>
          <Text>
            {formatMessage({ id: messages.about.released })} {ENV.releasedDate}
          </Text>
        </SubItem>
      </Item>

      <StatefulForm
        formValues={{}}
        mobile
        styles={{
          containerStyle: css`
            min-width: 300px;
            max-width: 350px;

            @media (max-width: 370px) {
              width: 80vw;
              min-width: 300px;
            }

            @media (min-width: 370px) and (max-width: 700px) {
              width: 60vw;
              max-width: 300px;
            }
            gap: 4px;
          `,
        }}
        fields={[
          ...exegesisOptions.flatMap((exegesisOption) =>
            (exegesisOption.groupOptions ?? []).map(
              (option) =>
                ({
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
                        background: ${theme === "dark" ? "#1a211d" : "#ededed"};
                        flex-direction: row-reverse;
                        justify-content: space-between;
                      `,
                    },
                  },
                  onClick: async () => {
                    await getExegesisDetail(String(option.value), locale)
                    await navigate({
                      to: "/about/$screen",
                      params: {
                        screen: String(option.value).split("/")[0],
                      },
                    })

                    await goToScreen?.(Screen.ExegesisDetail)
                  },
                }) satisfies FormFieldGroup,
            ),
          ),
          {
            type: "button",
            name: "sajdah",
            title: formatMessage({ id: messages.sajdah.about.entryTitle }),
            button: {
              icon: {
                image: RiArrowRightSLine,
                size: 18,
              },
              "aria-label": "sajdah-detail",
              styles: {
                self: css`
                  background: ${theme === "dark" ? "#1a211d" : "#ededed"};
                  flex-direction: row-reverse;
                  justify-content: space-between;
                `,
              },
            },
            onClick: async () => {
              await goToScreen?.(Screen.ProstrationVersesDetail)
            },
          } satisfies FormFieldGroup,
          {
            type: "button",
            name: "privacyPolicy",
            title: formatMessage({ id: messages.privacyPolicy.title }),
            button: {
              icon: {
                image: RiArrowRightSLine,
                size: 18,
              },
              "aria-label": "privacy-policy",
              styles: {
                self: css`
                  background: ${theme === "dark" ? "#1a211d" : "#ededed"};
                  flex-direction: row-reverse;
                  justify-content: space-between;
                `,
              },
            },
            onClick: async () => {
              await goToScreen?.(Screen.PrivacyPolicy)
            },
          } satisfies FormFieldGroup,
        ]}
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
        <Headings.Second $fontFamily='"MontHeavy", sans-serif'>
          Systatum
        </Headings.Second>
      </Item>
    </Wrapper>
  )
}
