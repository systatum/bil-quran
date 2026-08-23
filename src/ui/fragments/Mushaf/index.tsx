import { ThemeMode } from "@constants/theme"
import usePaginationState from "@hooks/states/PaginationState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { RiArrowLeftLine, RiArrowRightLine } from "@remixicon/react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useDrag } from "@use-gesture/react"
import { useEffect, useMemo, useRef, useState } from "react"
import styled from "styled-components"
import MushafFrame from "../MushafFrame"
import PageText from "./PageText"

// how far (px) the drag must travel before it commits to a page turn,
// so an ordinary tap/scroll gesture on the page doesn't trigger one
const TURN_THRESHOLD = 80

type TurnDirection = "next" | "prev"
type PageTurn = { direction: TurnDirection; targetPage: number } | null

export default function Mushaf() {
  const { mushaf, page } = useParams({ strict: false })
  const pageNumber = page ? parseInt(page) : null
  const navigate = useNavigate()
  const {
    userSettings: { theme },
  } = useUserSettingsState()
  const { juzPages, loadPagination } = usePaginationState()

  useEffect(() => {
    loadPagination()
  }, [])

  const totalPages = useMemo(() => juzPages.flat().length, [juzPages])

  const [turn, setTurn] = useState<PageTurn>(null)
  // which half of the page the drag started on, persisted across the whole
  // gesture (state callbacks below run many times per drag)
  const startedOnLeftHalf = useRef(false)

  const bind = useDrag(
    ({ movement: [mx], initial: [ix], first, last, currentTarget }) => {
      if (pageNumber == null) return

      if (first) {
        const rect = (currentTarget as HTMLElement).getBoundingClientRect()
        startedOnLeftHalf.current = ix < rect.left + rect.width / 2
      }

      const direction: TurnDirection | null = startedOnLeftHalf.current
        ? mx > 0
          ? "next"
          : null
        : mx < 0
          ? "prev"
          : null

      const targetPage = direction === "next" ? pageNumber + 1 : pageNumber - 1
      const isValidTurn =
        direction != null &&
        Math.abs(mx) >= TURN_THRESHOLD &&
        targetPage >= 1 &&
        targetPage <= totalPages

      if (last) {
        if (isValidTurn) {
          navigate({
            to: "/m/$mushaf/$page",
            params: { mushaf: mushaf!, page: String(targetPage) },
          })
        }
        setTurn(null)
        return
      }

      setTurn(isValidTurn ? { direction, targetPage } : null)
    },
    { axis: "x", filterTaps: true },
  )

  return (
    <Wrapper $theme={theme}>
      <PageBox
        {...bind()}
        style={{ touchAction: "pan-y" }}
        data-mushaf={mushaf}
        data-page={pageNumber ?? undefined}
      >
        <FrameBox $blurred={turn != null}>
          <MushafFrame>
            {pageNumber != null && <PageText pageNumber={pageNumber} />}
          </MushafFrame>
        </FrameBox>

        {turn && (
          <TurnOverlay>
            {turn.direction === "next" ? (
              <RiArrowLeftLine size={48} />
            ) : (
              <RiArrowRightLine size={48} />
            )}
            <TurnPageNumber>{turn.targetPage}</TurnPageNumber>
          </TurnOverlay>
        )}
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
  position: relative;
  width: 100%;
  height: 100%;
  user-select: none;
`

const FrameBox = styled.div<{ $blurred: boolean }>`
  width: 100%;
  height: 100%;
  filter: ${({ $blurred }) => ($blurred ? "blur(4px)" : "none")};
  transition: filter 0.15s ease-out;
`

const TurnOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #4a4a4a;
  pointer-events: none;
`

const TurnPageNumber = styled.div`
  font-size: 32px;
  font-weight: 600;
`
