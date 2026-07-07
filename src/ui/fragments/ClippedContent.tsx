import { ThemeMode } from "@constants/theme"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { ReactNode } from "react"
import styled, { CSSProp } from "styled-components"

interface AnotatedVerseProps {
  label: string
  children: ReactNode
  style?: CSSProp
}

export default function ClippedContent({
  label,
  children,
  style,
}: AnotatedVerseProps) {
  const {
    userSettings: { theme },
  } = useUserSettingsState()
  return (
    <VerseWrapper $theme={theme} $additionalStyle={style}>
      <VerseLabel $theme={theme}>{label}</VerseLabel>
      {children}
    </VerseWrapper>
  )
}

const VerseWrapper = styled.div<{
  $theme: ThemeMode
  $additionalStyle?: CSSProp
}>`
  position: relative;
  padding: 28px 15px 12px 15px; /* reserve space for badge */
  background: ${({ $theme }) => ($theme === "dark" ? "#263832" : "#e2d6c3")};
  border-radius: 8px;
  ${({ $additionalStyle }) => $additionalStyle}
`

const VerseLabel = styled.div<{ $theme: ThemeMode }>`
  position: absolute;
  top: 1px;
  left: 0px;

  padding: 4px 10px;
  font-size: 12px;
  line-height: 1;

  background: ${({ $theme }) => ($theme === "dark" ? "#445445" : "#e7e7e7")};
  color: ${({ $theme }) => ($theme === "dark" ? "#bababa" : "#5d3c2c")};

  border-right: 1px solid;
  border-bottom: 1px solid;
  border-color: ${({ $theme }) => ($theme === "dark" ? "#40573b" : "#e3e3e3")};

  border-top-right-radius: 0;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 10px;

  /* prevents visual jitter at corner join */
  transform: translateY(-1px);

  font-size: 0.8em;
`
