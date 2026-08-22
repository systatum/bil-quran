import { ThemeMode } from "@constants/theme"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { useParams } from "@tanstack/react-router"
import styled from "styled-components"
import MushafFrame from "../MushafFrame"
import PageText from "./PageText"

export default function Mushaf() {
  const { mushaf, page } = useParams({ strict: false })
  const pageNumber = page ? parseInt(page) : null
  const {
    userSettings: { theme },
  } = useUserSettingsState()

  return (
    <Wrapper $theme={theme}>
      <PageBox data-mushaf={mushaf} data-page={pageNumber ?? undefined}>
        <MushafFrame>
          {pageNumber != null && <PageText pageNumber={pageNumber} />}
        </MushafFrame>
      </PageBox>
    </Wrapper>
  )
}

const Wrapper = styled.div<{ $theme: ThemeMode }>`
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background: ${({ $theme }) =>
    $theme === "dark" ? "rgb(31, 31, 31)" : "white"};
`

// source frame image's width/height, in px
const PAGE_RATIO = 1128 / 1530
const MAX_WIDTH = "790px"

const PageBox = styled.div`
  /* prevent corner border clipping at narrow width: both axes derived together,
     so PAGE_RATIO holds exactly on any viewport; each min() also bounds by the viewport's
     other axis (100dvw / 100dvh), not just the 790px cap, otherwise a narrow-but-tall
     viewport computes a width wider than the screen itself and gets clipped */
  width: min(${MAX_WIDTH}, 100dvw, 100dvh * ${PAGE_RATIO});
  height: min(100dvh, 100dvw / ${PAGE_RATIO}, ${MAX_WIDTH} / ${PAGE_RATIO});
`
