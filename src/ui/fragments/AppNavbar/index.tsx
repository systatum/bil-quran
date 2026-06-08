import { ThemeMode } from "@constants/theme"
import { messages } from "@i18n/message"
import { RiMenuLine } from "@remixicon/react"
import { Title, TitleSection } from "@systatum/coneto/title"
import { useMemo, useState } from "react"
import { useIntl } from "react-intl"
import styled, { css } from "styled-components"
import UserSettingsForm from "./UserSettingsForm"
import VerseLookup from "./VerseLookup"

interface AppNavbarProps {
  theme: ThemeMode
  title: string
}

/**
 * Component that shows the navbar and the relevant sidebar
 * attached to it, which can be revealed by clicking the
 * burger menu on the navbar.
 */
export default function AppNavbar({ theme, title }: AppNavbarProps) {
  const intl = useIntl()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const fontColor = theme === "dark" ? "#6e9370" : "#fff0d3"
  const bgColor = theme === "dark" ? "#22271b" : "rgb(117 95 77)"

  const actions: TitleSection[] = useMemo(
    () => [
      {
        type: "actions",
        actions: [
          {
            icon: { image: RiMenuLine, color: fontColor },
            onClick: () => setIsSidebarOpen((x) => !x),
          },
        ],
      },
    ],
    [],
  )

  return (
    <>
      <Title
        size="sm"
        text={title}
        styles={{
          containerStyle: css`
            padding: 10px;
            background-color: ${bgColor};
            color: ${fontColor};
            align-items: center;
          `,
          titleStyle: css`
            color: ${fontColor};
          `,
        }}
        rightSection={actions}
      />

      <SidebarOverlay
        $visible={isSidebarOpen}
        onClick={() => setIsSidebarOpen(false)}
      />

      <SidebarContainer theme={theme} $visible={isSidebarOpen}>
        <SidebarItem>
          {intl.formatMessage({ id: messages.lookup.title })}
        </SidebarItem>
        <VerseLookup />

        <UserSettingsForm />
      </SidebarContainer>
    </>
  )
}

const SidebarOverlay = styled.div<{
  $visible: boolean
}>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  pointer-events: ${(p) => (p.$visible ? "auto" : "none")};
  transition: opacity 0.2s ease;
  z-index: 1100;
`

const SidebarContainer = styled.aside<{
  theme: ThemeMode
  $visible: boolean
}>`
  background: ${({ theme }) => (theme === "dark" ? "#9fae81" : "#e1dfda")};
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 300px;
  max-width: 300px;
  padding: 24px;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
  transform: translateX(${(p) => (p.$visible ? "0%" : "100%")});
  transition: transform 0.22s ease;
  z-index: 1200;
`

const SidebarItem = styled.button`
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  padding: 14px 0;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover {
    color: #000;
  }
`
