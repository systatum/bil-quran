import * as Coneto from "@systatum/coneto/separator"
import { useThemeMode } from "@systatum/coneto/theme"
import { css } from "styled-components"

interface SeparatorProps {
  title: string
}

export function Separator({ title }: SeparatorProps) {
  const { mode: theme } = useThemeMode()
  return (
    <Coneto.Separator
      title={title}
      styles={{
        titleStyle: css`
          background: ${theme === "dark" ? "#22271b" : "#f6f1e7"};
        `,
        containerStyle: css`
          margin-bottom: 10px;
        `,
      }}
    />
  )
}
