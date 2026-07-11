import {
  Button,
  ButtonShowSubMenuPosition,
  ButtonSubMenu,
} from "@systatum/coneto/button"
import { useTheme } from "@systatum/coneto/theme"
import { ReactNode, useState } from "react"
import { css, CSSProp } from "styled-components"

interface CircleButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  /** Pass a subMenu render fn to enable long-press submenu (e.g. VerseMarker). */
  subMenu?: (props: ButtonSubMenu) => ReactNode
  showSubMenuOn?: ButtonShowSubMenuPosition
  /** Extra CSS applied to the Button container (e.g. margin-top). */
  containerStyle?: CSSProp
  /** Forwarded verbatim to the underlying Button (e.g. data-testid). */
  [key: `data-${string}`]: string | undefined
}

export default function CircleButton({
  children,
  onClick,
  disabled,
  subMenu,
  showSubMenuOn,
  containerStyle,
  ...rest
}: CircleButtonProps) {
  const { mode: theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Button
      {...rest}
      subMenu={subMenu}
      showSubMenuOn={showSubMenuOn}
      open={isOpen}
      onOpen={setIsOpen}
      onClick={onClick}
      disabled={disabled}
      styles={{
        containerStyle: css`
          padding: 0;
          ${containerStyle}
        `,
        self: circleButtonStyle(theme, isOpen),
      }}
    >
      {children}
    </Button>
  )
}

/**
 * CSS block for the circle button appearance, matching the VerseMarker style.
 * Includes CSS custom properties, circle shape, gradient, and dashed inner ring.
 */
function circleButtonStyle(theme: string, isActive = false) {
  return css`
    padding: 0;
    --text: ${theme === "dark" ? "#e5dcc3" : "#755f4d"};
    --border: ${theme === "dark" ? "#5f5644" : "#cbb9a1"};
    --bg-start: ${theme === "dark" ? "#2b2a26" : "#efe6d8"};
    --bg-end: ${theme === "dark" ? "#1c1b18" : "#e2d6c3"};
    --inset: ${theme === "dark" ? "#3b372f" : "#f4ede2"};
    --shadow: ${theme === "dark" ? "rgba(0,0,0,0.45)" : "rgba(117,95,77,0.08)"};
    --text-shadow: ${theme === "dark"
      ? "rgba(0,0,0,0.35)"
      : "rgba(255,255,255,0.30)"};
    --dashed: ${theme === "dark" ? "#7b715b" : "rgba(117,95,77,0.26)"};
    --dashed-opacity: ${theme === "dark" ? 0.4 : 0.5};

    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    border-radius: 50%;
    font-size: 18px;
    color: var(--text);
    border: 1.5px solid var(--border);
    background: radial-gradient(
      circle,
      var(--bg-start) 40%,
      var(--bg-end) 100%
    );
    box-shadow:
      inset 0 0 0 2px var(--inset),
      0 1px 3px var(--shadow);
    text-shadow: 0 1px 0 var(--text-shadow);

    &:hover {
      --shadow: none;
    }

    &::after {
      content: "";
      position: absolute;
      inset: 4px;
      border-radius: 50%;
      border: 1px dashed var(--dashed);
      opacity: var(--dashed-opacity);
      cursor: pointer;
    }

    ${isActive &&
    css`
      box-shadow:
        inset 0 0 5px rgba(117, 95, 77, 0.35),
        inset 0 0 2px rgba(0, 0, 0, 0.12);
      background: radial-gradient(
        circle,
        var(--bg-start) 40%,
        var(--bg-end) 100%
      );
    `}
  `
}
