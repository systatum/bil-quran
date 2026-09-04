import styled, { CSSProp } from "styled-components"

interface BismillahProps {
  containerStyle?: CSSProp
}

export const Bismillah = ({ containerStyle }: BismillahProps = {}) => (
  <BismillahContainer $containerStyle={containerStyle}>A</BismillahContainer>
)
Bismillah.isRenderableHere = (verseNumber: number, chapterId: number) =>
  verseNumber === 1 && chapterId != 1 && chapterId != 9

const BismillahRow = styled.div``

const BismillahContainer = styled.span<{ $containerStyle?: CSSProp }>`
  display: inline-flex;
  font-family: "BasmalahVer01";
  direction: rtl;
  font-size: 44px;
  line-height: 1;
  margin-top: -33px;
  ${({ $containerStyle }) => $containerStyle}
`
