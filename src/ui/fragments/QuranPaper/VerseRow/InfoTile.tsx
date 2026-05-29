import { ArabicFontFamily } from "@constants/fonts"
import { ThemeMode } from "@constants/theme"
import { Grid } from "@systatum/coneto/grid"
import styled, { css } from "styled-components"

interface InfoTileProps {
  label: string
  value: string
  theme: ThemeMode
  arabic?: boolean
  arabicFont?: string
}

export default function InfoTile({
  label,
  value,
  theme,
  arabic,
  arabicFont,
}: InfoTileProps) {
  return (
    <Grid.Card
      styles={{
        self: css`
          background: ${theme === "dark" ? "#1f1e1b" : "#ede6d9"};
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        `,
      }}
    >
      <TileLabel $theme={theme}>{label}</TileLabel>
      <TileValue $theme={theme} $arabic={arabic} $font={arabicFont}>
        {value}
      </TileValue>
    </Grid.Card>
  )
}

const TileLabel = styled.p<{ $theme: ThemeMode }>`
  font-size: 11px;
  color: ${({ $theme }) => ($theme === "dark" ? "#7b715b" : "#a09083")};
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const TileValue = styled.p<{
  $theme: ThemeMode
  $arabic?: boolean
  $font?: string
}>`
  font-size: ${({ $arabic }) => ($arabic ? "18px" : "14px")};
  color: ${({ $theme }) => ($theme === "dark" ? "#d8c7a3" : "#1f1f1f")};
  margin: 0;
  font-weight: 500;

  ${({ $arabic, $font }) =>
    $arabic &&
    css`
      font-family:
        "${$font}", "${"NotoNaskhArabic" satisfies ArabicFontFamily}", serif;
      direction: rtl;
      letter-spacing: 1px;
    `}
`
