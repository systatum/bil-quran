import styled from "styled-components"

export const Bismillah = () => <BismillahContainer>A</BismillahContainer>
Bismillah.isRenderableHere = (verseNumber: number, chapterId: number) =>
  verseNumber === 1 && chapterId != 1 && chapterId != 9

const BismillahRow = styled.div``

const BismillahContainer = styled.span`
  display: inline-flex;
  font-family: "BasmalahVer01";
  direction: rtl;
  font-size: 44px;
  line-height: 1;
  margin-top: -33px;
`

// const BismillahContainer = styled.span`
//   display: inline-block;
//   font-family: "BasmalahVer01";
//   font-size: 72px;
//   line-height: 1;
// `
