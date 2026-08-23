import { ReadingStyle } from "@constants/settings"
import { ThemeMode } from "@constants/theme"
import useAppState from "@hooks/states/AppState"
import usePaginationState from "@hooks/states/PaginationState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import useToast from "@hooks/tools/useToast"
import { messages } from "@i18n/message"
import { RiArrowLeftLine, RiArrowRightLine, RiMenuLine } from "@remixicon/react"
import { ScreenTransition } from "@systatum/coneto/screen-transition"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Screen, SCREENS } from "@ui/index"
import { useDrag } from "@use-gesture/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useIntl } from "react-intl"
import styled, { css } from "styled-components"
import MushafFrame from "../MushafFrame"
import Navigator from "./Navigator"
import PageText from "./PageText"

// how far (px) the drag must travel before it commits to a page turn,
// so an ordinary tap/scroll gesture on the page doesn't trigger one
const TURN_THRESHOLD = 80

// dragging right-to-left this much further than a normal page turn opens
// Settings instead - a deliberate "keep pulling" gesture, not a mis-swipe
const SETTINGS_REVEAL_THRESHOLD = TURN_THRESHOLD + 180

// how far (px) a vertical drag must travel to reveal/hide the Navigator -
// much smaller than TURN_THRESHOLD since it's meant to feel immediate
const REVEAL_THRESHOLD = 10

// "bigger than an iPad" - below this, dual-stitched decays to mono-stitched
const DUAL_STITCH_BREAKPOINT = 1024

type TurnDirection = "next" | "prev"
type DragFeedback =
  | { kind: "turn"; direction: TurnDirection; targetPage: number }
  | { kind: "settings" }
  | null

export default function Mushaf() {
  const { mushaf, page } = useParams({ strict: false })
  const pageNumber = page ? parseInt(page) : null
  const navigate = useNavigate()
  const {
    userSettings: { theme, readingStyle },
  } = useUserSettingsState()
  const { juzPages, loadPagination } = usePaginationState()
  const { activeScreens, setActiveScreens } = useAppState()
  const { warningToast } = useToast()
  const { formatMessage } = useIntl()

  useEffect(() => {
    loadPagination()
  }, [])

  const allPages = useMemo(() => juzPages.flat(), [juzPages])
  const totalPages = allPages.length
  const rightPageChapterId =
    pageNumber != null
      ? (allPages[pageNumber - 1]?.chapterIds[0] ?? null)
      : null

  // checked live, re-evaluates dual-stitched capability
  const [isWideEnoughForDual, setIsWideEnoughForDual] = useState(
    () =>
      window.matchMedia(`(min-width: ${DUAL_STITCH_BREAKPOINT + 1}px)`).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DUAL_STITCH_BREAKPOINT + 1}px)`)
    const handler = (e: MediaQueryListEvent) =>
      setIsWideEnoughForDual(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const wantsDualStitched = readingStyle === ReadingStyle.DualStitched
  const isDualActive = wantsDualStitched && isWideEnoughForDual
  const pageStep = isDualActive ? 2 : 1

  useEffect(() => {
    if (wantsDualStitched && !isWideEnoughForDual) {
      warningToast(
        formatMessage({ id: messages.readingStyle.dualUnavailableMessage }),
        formatMessage({ id: messages.readingStyle.dualUnavailableTitle }),
      )
    }
  }, [wantsDualStitched, isWideEnoughForDual])

  const [dragFeedback, setDragFeedback] = useState<DragFeedback>(null)
  const [navigatorVisible, setNavigatorVisible] = useState(false)
  // which half of the page the drag started on, persisted across the whole
  // gesture (state callbacks below run many times per drag)
  const startedOnLeftHalf = useRef(false)

  const bind = useDrag(
    ({ movement: [mx, my], initial: [ix], first, last, currentTarget }) => {
      if (pageNumber == null) return

      if (first) {
        const rect = (currentTarget as HTMLElement).getBoundingClientRect()
        startedOnLeftHalf.current = ix < rect.left + rect.width / 2
      }

      // whichever axis moved further decides what this gesture means -
      // horizontal turns the page, vertical reveals/hides the Navigator
      if (Math.abs(mx) < Math.abs(my)) {
        if (my <= -REVEAL_THRESHOLD) setNavigatorVisible(true)
        else if (my >= REVEAL_THRESHOLD) setNavigatorVisible(false)
        if (last) setDragFeedback(null)
        return
      }

      const direction: TurnDirection | null = startedOnLeftHalf.current
        ? mx > 0
          ? "next"
          : null
        : mx < 0
          ? "prev"
          : null

      // dragging right-to-left far past a normal page turn reveals Settings
      // instead of going back a page
      const isSettingsReveal =
        direction === "prev" && Math.abs(mx) >= SETTINGS_REVEAL_THRESHOLD

      const targetPage =
        direction === "next" ? pageNumber + pageStep : pageNumber - pageStep
      const isValidTurn =
        direction != null &&
        !isSettingsReveal &&
        Math.abs(mx) >= TURN_THRESHOLD &&
        targetPage >= 1 &&
        targetPage <= totalPages

      if (last) {
        if (isSettingsReveal) {
          setActiveScreens([Screen.Sidebar])
        } else if (isValidTurn) {
          navigate({
            to: "/m/$mushaf/$page",
            params: { mushaf: mushaf!, page: String(targetPage) },
          })
        }
        setDragFeedback(null)
        return
      }

      if (isSettingsReveal) setDragFeedback({ kind: "settings" })
      else
        setDragFeedback(
          isValidTurn ? { kind: "turn", direction, targetPage } : null,
        )
    },
    { filterTaps: true },
  )

  return (
    <Wrapper $theme={theme}>
      <PageBox
        {...bind()}
        style={{ touchAction: "pan-y" }}
        data-mushaf={mushaf}
        data-page={pageNumber ?? undefined}
        data-dual-stitched={isDualActive || undefined}
      >
        {isDualActive && pageNumber != null ? (
          <DualFrameBox $blurred={dragFeedback != null}>
            <HalfFrame className="mushaf-half-frame">
              <MushafFrame>
                <PageText pageNumber={pageNumber} forceTabletScale />
              </MushafFrame>
            </HalfFrame>
            <HalfFrame className="mushaf-half-frame">
              <MushafFrame>
                {pageNumber + 1 <= totalPages && (
                  <PageText pageNumber={pageNumber + 1} forceTabletScale />
                )}
              </MushafFrame>
            </HalfFrame>
          </DualFrameBox>
        ) : (
          <FrameBox $blurred={dragFeedback != null}>
            <MushafFrame>
              {pageNumber != null && <PageText pageNumber={pageNumber} />}
            </MushafFrame>
          </FrameBox>
        )}

        {mushaf != null && pageNumber != null && (
          <Navigator
            mushaf={mushaf}
            currentPage={pageNumber}
            totalPages={totalPages}
            chapterId={rightPageChapterId}
            visible={navigatorVisible}
            pageStep={pageStep}
          />
        )}

        {dragFeedback?.kind === "turn" && (
          <TurnOverlay>
            {dragFeedback.direction === "next" ? (
              <RiArrowLeftLine size={48} />
            ) : (
              <RiArrowRightLine size={48} />
            )}
            <TurnPageNumber>{dragFeedback.targetPage}</TurnPageNumber>
          </TurnOverlay>
        )}

        {dragFeedback?.kind === "settings" && (
          <TurnOverlay className="settings-reveal-overlay">
            <RiMenuLine size={48} />
          </TurnOverlay>
        )}
      </PageBox>

      {/* for the settings, to have parity with QuranPaper rendering */}
      <ScreenTransition
        screens={SCREENS}
        activeScreens={activeScreens}
        onScreenChange={(screens) => setActiveScreens(screens as Screen[])}
        styles={{
          indicatorStyle: css`
            height: 40px;
          `,
          containerStyle: css`
            border: none;
            min-width: 400px;
            max-width: 400px;

            @media (max-width: 430px) {
              min-width: 90vw;
              max-width: 90vw;
            }
          `,
          contentStyle: css`
            background-color: ${theme === "dark" ? "#202b24" : "#e1dfda"};
            padding: 0px;
          `,
        }}
      />
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

/** rtl open-book style, page n lands on the right and n+1 on the left */
const DualFrameBox = styled.div<{ $blurred: boolean }>`
  width: 100%;
  height: 100%;
  display: flex;
  direction: rtl;
  gap: 8px;
  filter: ${({ $blurred }) => ($blurred ? "blur(4px)" : "none")};
  transition: filter 0.15s ease-out;
`

const HalfFrame = styled.div`
  flex: 1;
  min-width: 0;
  height: 100%;
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
