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

const PageBox = styled.div`
  width: 100%;
  height: 100%;
`
