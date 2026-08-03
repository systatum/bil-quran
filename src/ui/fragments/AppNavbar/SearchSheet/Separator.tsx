import * as Coneto from "@systatum/coneto/separator"
import { css } from "styled-components"

interface SeparatorProps {
  title: string
}

export function Separator({ title }: SeparatorProps) {
  return (
    <Coneto.Separator
      title={title}
      styles={{
        containerStyle: css`
          margin-top: 10px;
          margin-bottom: 10px;
        `,
      }}
    />
  )
}
