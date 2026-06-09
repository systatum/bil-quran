import { ThemeMode } from "@constants/theme"
import usePositioningObserver from "@hooks/tools/usePositioningObserver"
import { messages } from "@i18n/message"
import { RiMenuLine, RiSearchLine } from "@remixicon/react"
import { OverlayBlocker } from "@systatum/coneto/overlay-blocker"
import { Title, TitleSection } from "@systatum/coneto/title"
import { useMemo, useRef, useState } from "react"
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
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const fontColor = theme === "dark" ? "#6e9370" : "#fff0d3"
  const bgColor = theme === "dark" ? "#22271b" : "rgb(117 95 77)"

  const titleRef = useRef<HTMLDivElement>(null)
  const navbarPositioning = usePositioningObserver(titleRef)

  const actions: TitleSection[] = useMemo(
    () => [
      {
        type: "actions",
        actions: [
          {
            icon: { image: RiSearchLine, color: fontColor },
            onClick: () => setIsSearchOpen((x) => !x),
          },
          {
            icon: { image: RiMenuLine, color: fontColor },
            onClick: () => setIsSidebarOpen((x) => !x),
          },
        ],
      },
    ],
    [theme],
  )

  return (
    <>
      <div ref={titleRef}>
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
      </div>

      {(isSidebarOpen || isSearchOpen) && (
        <OverlayBlocker
          exemptRegions={["#combo-list"]}
          show={isSidebarOpen || isSearchOpen}
          onClick={({ close }) => {
            setIsSidebarOpen(false)
            setIsSearchOpen(false)
            close()
          }}
        />
      )}

      <SidebarContainer theme={theme} $visible={isSidebarOpen}>
        <SidebarItem>
          {intl.formatMessage({ id: messages.lookup.title })}
        </SidebarItem>

        <UserSettingsForm />
      </SidebarContainer>

      <SearchSheet
        theme={theme}
        $visible={isSearchOpen}
        $top={navbarPositioning?.height}
      >
        <VerseLookup onChange={() => setIsSearchOpen(false)} />
      </SearchSheet>
    </>
  )
}

const SearchSheet = styled.div<{
  theme: ThemeMode
  $visible: boolean
  $top: number | undefined
}>`
  position: fixed;
  top: ${({ $top }) => `${$top ?? 0}px`};
  left: 0;
  right: 0;

  background: ${({ theme }) => (theme === "dark" ? "#22271b" : "#f6f1e7")};

  padding: 16px;

  transform-origin: top center;
  transform: scaleY(${({ $visible }) => ($visible ? 1 : 0)});

  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};

  transition:
    transform 220ms ease,
    opacity 220ms ease;

  z-index: 9992999;
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
  z-index: 9992999;
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
