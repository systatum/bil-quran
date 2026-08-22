import { useParams } from "@tanstack/react-router"
import styled from "styled-components"
import MushafFrame from "../MushafFrame"

export default function Mushaf() {
  const { mushaf, page } = useParams({ strict: false })
  const pageNumber = page ? parseInt(page) : null

  return (
    <Wrapper>
      <PageBox data-mushaf={mushaf} data-page={pageNumber ?? undefined}>
        <MushafFrame />
      </PageBox>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  width: 100%;
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #1c1c1c;
`

// source frame image's width/height, in px
const PAGE_RATIO = 1128 / 1530

const PageBox = styled.div`
  /* both axes derived together, so PAGE_RATIO holds exactly on any viewport */
  width: min(90dvw, 90dvh * ${PAGE_RATIO});
  height: min(90dvh, 90dvw / ${PAGE_RATIO});
`
