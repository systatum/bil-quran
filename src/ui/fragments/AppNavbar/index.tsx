import { ThemeMode } from "@constants/theme"
import { RiCloseLine, RiMenuLine } from "@remixicon/react"
import { useCallback, useState } from "react"
import styled from "styled-components"
import useUserSettingsState from "../../hooks/states/UserSettingsState"
import { Combobox } from "./Combobox"
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const BurgerIcon = isSidebarOpen ? RiCloseLine : RiMenuLine
  const { setTheme, userSettings } = useUserSettingsState()

  const changeTheme = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault()
    const value = e.target.value
    setTheme(value as ThemeMode)
  }, [])

  return (
    <>
      <NavbarContainer theme={theme}>
        <ChapterLabel theme={theme}>{title}</ChapterLabel>
        <BurgerButton theme={theme} onClick={() => setIsSidebarOpen((x) => !x)}>
          <BurgerIcon size={24} />
        </BurgerButton>
      </NavbarContainer>

      <SidebarOverlay
        $visible={isSidebarOpen}
        onClick={() => setIsSidebarOpen(false)}
      />

      <SidebarContainer theme={theme} $visible={isSidebarOpen}>
        <SidebarItem>Verse lookup</SidebarItem>
        <VerseLookup />

        <SidebarItem>Theme</SidebarItem>
        <Combobox onChange={changeTheme} value={userSettings.theme}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </Combobox>
      </SidebarContainer>
    </>
  )
}

const NavbarContainer = styled.header<{ theme: ThemeMode }>`
  top: 0;
  position: sticky;
  z-index: 1000;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: ${({ theme }) =>
    theme === "dark" ? "#22271b" : "rgb(117 95 77)"};
  border-bottom: 1px solid
    ${({ theme }) => (theme === "dark" ? "#455230" : "#ececec")};
  backdrop-filter: blur(12px);
`

const ChapterLabel = styled.div<{ theme: ThemeMode }>`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => (theme === "dark" ? "#6e9370" : "#fff0d3")};
`

const BurgerButton = styled.button<{ theme: ThemeMode }>`
  color: ${({ theme }) => (theme === "dark" ? "#475848" : "#fff0d3")};
  width: 42px;
  height: 42px;
  border: none;
  background: transparent;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.08);
  }
`

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
  border-bottom: 1px solid #f0f0f0;
  transition: color 0.15s ease;

  &:hover {
    color: #000;
  }
`
