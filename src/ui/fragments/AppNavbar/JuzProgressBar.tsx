import { ThemeMode } from "@constants/theme"
import { JuzProgress } from "@hooks/tools/useJuzProgress"
import styled from "styled-components"

interface Props {
  progress: JuzProgress
  theme: ThemeMode
}

export default function JuzProgressBar({ progress, theme }: Props) {
  const pct = Math.min(100, (progress.current / progress.total) * 100)
  const color = theme === "dark" ? "#77a879" : "#231c0f"
  return (
    <Track $theme={theme} data-testid="juz-progress-bar">
      <Fill $pct={pct} $color={color} />
    </Track>
  )
}

const Track = styled.div<{ $theme: ThemeMode }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 7px;
  background: ${(p) => (p.$theme === "dark" ? "#4f5f37" : "#a19083")};
`

const Fill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: ${(p) => p.$color};
  opacity: 0.7;
  transition: width 300ms ease-out;
`
