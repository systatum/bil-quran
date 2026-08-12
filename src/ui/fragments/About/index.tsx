import useExegesisState from "@hooks/states/ExegesisState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import useExegesisOptions from "@hooks/tools/useExegesisOptions"
import { resolveLocale } from "@i18n"
import { messages } from "@i18n/message"
import { RiArrowLeftLine, RiArrowRightSLine } from "@remixicon/react"
import { Button } from "@systatum/coneto/button"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import { FormFieldGroup, StatefulForm } from "@systatum/coneto/stateful-form"
import { Wrapper } from "@ui/fragments"
import { Screen } from "@ui/index"
import { useCallback, useRef, useState } from "react"
import { useIntl } from "react-intl"
import styled, { css } from "styled-components"
import Headings from "../Headings"

const HEADER_TRANSITION_MS = 300

export default function About({
  goBack,
  goToScreen,
}: Partial<ScreenProps<Screen>>) {
  const { formatMessage } = useIntl()
  const {
    userSettings: { theme, locale: rawLocal },
  } = useUserSettingsState()
  const exegesisOptions = useExegesisOptions()
  const { getExegesisDetail } = useExegesisState()

  const locale = resolveLocale(rawLocal)

  const [scrolled, setScrolled] = useState(false)
  const scrolledRef = useRef(false)
  const lockedRef = useRef(false)

  // Hysteresis plus a lock prevents oscilation where the header resize
  // from clamping scrollTop and re-triggering itself mid-transition.
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (lockedRef.current) return

    const top = e.currentTarget.scrollTop
    const next = scrolledRef.current ? top > 4 : top > 24
    if (next === scrolledRef.current) return

    scrolledRef.current = next
    lockedRef.current = true
    setScrolled(next)
    setTimeout(() => {
      lockedRef.current = false
    }, HEADER_TRANSITION_MS)
  }, [])

  return (
    <Wrapper
      $theme={theme}
      $style={css`
        justify-content: flex-start;
        gap: 0;
        overflow: hidden;
      `}
    >
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
            z-index: 11;
          `,
        }}
        onClick={() => {
          goBack?.()
        }}
      />

      <Header $theme={theme} $scrolled={scrolled}>
        <Logo src="/logo_full.png" alt="logo" $scrolled={scrolled} />
        <Headings.Second>bil-Qur'an</Headings.Second>
      </Header>

      <ScrollContainer onScroll={handleScroll}>
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
                          background: ${theme === "dark"
                            ? "#1a211d"
                            : "#ededed"};
                          flex-direction: row-reverse;
                          justify-content: space-between;
                        `,
                      },
                    },
                    onClick: async () => {
                      await getExegesisDetail(String(option.value), locale)
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
            {
              type: "button",
              name: "contributors",
              title: formatMessage({ id: messages.contributors.title }),
              button: {
                icon: {
                  image: RiArrowRightSLine,
                  size: 18,
                },
                "aria-label": "contributors",
                styles: {
                  self: css`
                    background: ${theme === "dark" ? "#1a211d" : "#ededed"};
                    flex-direction: row-reverse;
                    justify-content: space-between;
                  `,
                },
              },
              onClick: async () => {
                await goToScreen?.(Screen.Contributors)
              },
            } satisfies FormFieldGroup,
          ]}
        />
      </ScrollContainer>

      <Footer>
        <img src={"./systatum.png"} width={40} height={40} />
        <Headings.Second $fontFamily='"MontHeavy", sans-serif'>
          Systatum
        </Headings.Second>
      </Footer>
    </Wrapper>
  )
}

const Header = styled.div<{ $theme: string; $scrolled: boolean }>`
  position: sticky;
  top: 0;
  z-index: 10;
  width: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: ${({ $theme }) => ($theme === "dark" ? "#202b24" : "#e1dfda")};
  padding: ${({ $scrolled }) => ($scrolled ? "10px 0 6px" : "30px 0 12px")};
  transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`

const Logo = styled.img<{ $scrolled: boolean }>`
  width: ${({ $scrolled }) => ($scrolled ? "64px" : "180px")};
  height: ${({ $scrolled }) => ($scrolled ? "64px" : "180px")};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`

const ScrollContainer = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 10px 0 20px;
  overflow-y: auto;

  scrollbar-width: thin;
  scrollbar-color: rgba(150, 150, 150, 0.5) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(150, 150, 150, 0.5);
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(150, 150, 150, 0.7);
  }
`

const Footer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  gap: 10px;
  padding: 12px 0;
`
