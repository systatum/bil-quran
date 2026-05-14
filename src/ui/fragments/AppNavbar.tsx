import { RiCloseLine, RiMenuLine } from "@remixicon/react"
import { useState } from "react"
import styled from "styled-components"

interface AppNavbarProps {
  title: string
}

export default function AppNavbar({ title }: AppNavbarProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <>
      <NavbarContainer>
        <NavbarLeft>
          <ChapterLabel>{title}</ChapterLabel>
        </NavbarLeft>

        <NavbarRight>
          <BurgerButton onClick={() => setIsSidebarOpen((x) => !x)}>
            {isSidebarOpen ? (
              <RiCloseLine size={24} />
            ) : (
              <RiMenuLine size={24} />
            )}
          </BurgerButton>
        </NavbarRight>
      </NavbarContainer>

      <SidebarOverlay
        $visible={isSidebarOpen}
        onClick={() => setIsSidebarOpen(false)}
      />

      <SidebarContainer $visible={isSidebarOpen}>
        <SidebarContent>
          <SidebarItem>Settings</SidebarItem>
        </SidebarContent>
      </SidebarContainer>
    </>
  )
}

const NavbarContainer = styled.header`
  position: sticky;
  top: 0;
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

const NavbarLeft = styled.div`
  display: flex;
  align-items: center;
`

const NavbarRight = styled.div`
  display: flex;
  align-items: center;
`

const ChapterLabel = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #222;
`

const BurgerButton = styled.button`
  width: 42px;
  height: 42px;
  border: none;
  background: transparent;
  display: flex;
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
  position: fixed;
  top: 0;
  right: 0;
  width: 300px;
  max-width: 85vw;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
  transform: translateX(${(p) => (p.$visible ? "0%" : "100%")});
  transition: transform 0.22s ease;
  z-index: 1200;
`

const SidebarContent = styled.div`
  padding: 24px;
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
