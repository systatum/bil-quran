import { messages } from "@i18n/message"
import { ThemeMode, useThemeMode } from "@systatum/coneto/theme"
import { useNavigate } from "@tanstack/react-router"
import { Separator } from "@ui/fragments/AppNavbar/SearchSheet/Separator"
import { useIntl } from "react-intl"
import styled, { css, CSSProp } from "styled-components"
import JuzLookup from "./JuzLookup"
import VerseLookup from "./VerseLookup"

interface SearchSheetProps {
  isOpen: boolean
  /** how far down the navbar sits, only when on top anchor */
  navbarPositioning?: { height?: number } | null
  onAfterSearch?: () => void
  /** which edge the sheet grows from */
  anchor?: "top" | "bottom"
  /** extra CSS applied to the sheet's own container */
  containerStyle?: CSSProp
  onPick?: (chapterId: number, verse: number) => void
}

export function SearchSheet({
  isOpen,
  navbarPositioning,
  onAfterSearch,
  anchor = "top",
  containerStyle,
  onPick,
}: SearchSheetProps) {
  const navigate = useNavigate()
  const { mode: theme } = useThemeMode()
  const { formatMessage } = useIntl()

  function goToVerse(chapterId: number, verse: number) {
    if (onPick) {
      onPick(chapterId, verse)
    } else {
      navigate({
        to: "/c/$chapter/$verse",
        params: { chapter: String(chapterId), verse: String(verse) },
      })
    }
    onAfterSearch?.()
  }

  return (
    <Wrapper
      theme={theme}
      $visible={isOpen}
      $top={navbarPositioning?.height}
      $anchor={anchor}
      $containerStyle={containerStyle}
    >
      <Separator
        title={formatMessage({ id: messages.searchSheet.byChapter })}
      />
      <VerseLookup onChange={goToVerse} />
      <Separator title={formatMessage({ id: messages.searchSheet.byJuz })} />
      <JuzLookup onChange={goToVerse} />
    </Wrapper>
  )
}

const Wrapper = styled.div<{
  theme: ThemeMode
  $visible: boolean
  $top: number | undefined
  $anchor: "top" | "bottom"
  $containerStyle?: CSSProp
}>`
  position: fixed;
  left: 0;
  right: 0;

  ${({ $anchor, $top }) =>
    $anchor === "top"
      ? css`
          top: ${$top ?? 0}px;
        `
      : css`
          bottom: 0;
          max-height: 70%;
          overflow: auto;
        `}

  background: ${({ theme }) =>
    theme === "dark" ? "rgba(34, 39, 27, 0.55)" : "rgba(246, 241, 231, 0.55)"};
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);

  ${({ theme, $anchor }) => {
    const highlight =
      theme === "dark"
        ? "rgba(255, 255, 255, 0.06)"
        : "rgba(255, 255, 255, 0.5)"
    const recess =
      theme === "dark" ? "rgba(0, 0, 0, 0.35)" : "rgba(96, 78, 51, 0.14)"
    const ring = theme === "dark" ? "#4a453a" : "#c9bc9f"
    const lift = theme === "dark" ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.2)"
    const sign = $anchor === "top" ? "" : "-"

    return css`
      box-shadow:
        /* subtle edge highlight, glass edge */
        inset 0 ${sign}1px 0 ${highlight},
        /* recessed inset — separates sheet from paper behind it */ inset 0
          ${sign}2px 6px ${recess},
        inset 0 0 0 1px ${ring},
        /* lift off the background so it doesn't blend */ 0 ${sign}10px
          20px -8px ${lift};
    `
  }}

  padding: 16px;
  ${({ $anchor }) =>
    $anchor === "top"
      ? css`
          padding-top: 0px;
        `
      : css`
          padding-bottom: 0px;
        `}

  transform-origin: ${({ $anchor }) =>
    $anchor === "top" ? "top center" : "bottom center"};
  transform: scaleY(${({ $visible }) => ($visible ? 1 : 0)});

  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};

  transition:
    transform 220ms ease,
    opacity 220ms ease;

  z-index: 9992999;

  ${({ $containerStyle }) => $containerStyle}
`
