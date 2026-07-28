import styled, { type CSSProp } from "styled-components"

interface StyleProp {
  $style?: CSSProp
  $fontFamily?: string
  $fontWeight?: string
}

const H2 = styled.h2<StyleProp>`
  font-size: 24px;
  font-weight: 500;

  ${({ $style }) => $style}
  ${({ $fontFamily }) => ($fontFamily ? `font-family: ${$fontFamily};` : "")}
  ${({ $fontWeight }) => ($fontWeight ? `font-weight: ${$fontWeight};` : "")}
`

const H3 = styled.h3<StyleProp>`
  font-size: 16px;

  ${({ $style }) => $style}
  ${({ $fontFamily }) => ($fontFamily ? `font-family: ${$fontFamily};` : "")}
  ${({ $fontWeight }) => ($fontWeight ? `font-weight: ${$fontWeight};` : "")}
`

const Headings = {
  Second: H2,
  Third: H3,
}

export default Headings
