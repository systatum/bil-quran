import styled from "styled-components"

export const FlexContainer = styled.div<{ direction?: string }>`
  display: flex;
  gap: 5px;
  flex-direction: ${({ direction }) => direction ?? "row"};
`
