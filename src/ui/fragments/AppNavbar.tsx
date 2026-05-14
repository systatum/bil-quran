import { RiCloseLine, RiMenuLine } from "@remixicon/react"
import { useState } from "react"
import styled from "styled-components"

interface AppNavbarProps {
  title: string
}

export default function AppNavbar({ title }: AppNavbarProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const BurgerIcon = isSidebarOpen ? RiCloseLine : RiMenuLine

  return (
    <>
      <NavbarContainer>
        <NavbarItem>
          <ChapterLabel>{title}</ChapterLabel>
        </NavbarItem>

        <NavbarItem>
          <BurgerButton onClick={() => setIsSidebarOpen((x) => !x)}>
            <BurgerIcon size={24} />
          </BurgerButton>
        </NavbarItem>
      </NavbarContainer>

      <SidebarOverlay
        $visible={isSidebarOpen}
        onClick={() => setIsSidebarOpen(false)}
      />

      <SidebarContainer $visible={isSidebarOpen}>
        <SidebarItem>Settings</SidebarItem>
      </SidebarContainer>
    </>
  )
}

const NavbarContainer = styled.header`
  top: 0;
  position: sticky;
  z-index: 1000;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #ececec;
`

const NavbarItem = styled.div`
  display: flex;
  align-items: center;
`

const ChapterLabel = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #222;
`

const BurgerButton = styled.button`
  display: flex;
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
    background: rgba(0, 0, 0, 0.05);
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
  $visible: boolean
}>`
  background: white;
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
