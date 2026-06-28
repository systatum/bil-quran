import { ThemeMode, useThemeMode } from "@systatum/coneto/theme"
import styled from "styled-components"
import VerseLookup from "./VerseLookup"

interface SearchSheetProps {
  isOpen: boolean
  navbarPositioning: { height?: number } | null
  onAfterSearch?: () => void
}

export function SearchSheet({
  isOpen,
  navbarPositioning,
  onAfterSearch,
}: SearchSheetProps) {
  const { mode: theme } = useThemeMode()

  return (
    <Wrapper theme={theme} $visible={isOpen} $top={navbarPositioning?.height}>
      <VerseLookup onChange={() => onAfterSearch?.()} />
    </Wrapper>
  )
}

const Wrapper = styled.div<{
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
