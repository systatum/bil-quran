import { messages } from "@i18n/message"
import { ThemeMode, useThemeMode } from "@systatum/coneto/theme"
import { Separator } from "@ui/fragments/AppNavbar/SearchSheet/Separator"
import { useIntl } from "react-intl"
import styled from "styled-components"
import JuzLookup from "./JuzLookup"
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
  const { formatMessage } = useIntl()

  return (
    <Wrapper theme={theme} $visible={isOpen} $top={navbarPositioning?.height}>
      <Separator
        title={formatMessage({ id: messages.searchSheet.byChapter })}
      />
      <VerseLookup onChange={() => onAfterSearch?.()} />
      <Separator title={formatMessage({ id: messages.searchSheet.byJuz })} />
      <JuzLookup onChange={() => onAfterSearch?.()} />
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

  background: ${({ theme }) =>
    theme === "dark" ? "rgba(34, 39, 27, 0.35)" : "rgba(246, 241, 231, 0.35)"};
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow:
    inset 0 1px 0
      ${({ theme }) =>
        theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.6)"},
    inset 0 0 0 1px
      ${({ theme }) => (theme === "dark" ? "#3b372f" : "#d8ccb7")},
    0 8px 16px -8px
      ${({ theme }) =>
        theme === "dark" ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.15)"};

  padding: 16px;
  padding-top: 0px;

  transform-origin: top center;
  transform: scaleY(${({ $visible }) => ($visible ? 1 : 0)});

  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};

  transition:
    transform 220ms ease,
    opacity 220ms ease;

  z-index: 9992999;
`
