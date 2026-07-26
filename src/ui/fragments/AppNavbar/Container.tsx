import styled, { CSSProp } from "styled-components"

export const FlexContainer = styled.div<{
  $direction?: string
  $style?: CSSProp
}>`
  display: flex;
  gap: 5px;
  flex-direction: ${({ $direction }) => $direction ?? "row"};
  ${({ $style }) => $style};
`
