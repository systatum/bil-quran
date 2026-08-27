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
import ModalDialog from "../QuranPaper/ModalDialog"
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

// iOS Safari/Chrome (WebKit) can leave 100dvh/100svh taller than what's
// actually visible when the toolbar collapses/expands, and doesn't support
// overscroll-behavior on older versions to contain the bounce - reading the
// real visible height from visualViewport (updated live) sidesteps both
function useViewportHeight() {
  const [height, setHeight] = useState(
    () => window.visualViewport?.height ?? window.innerHeight,
  )
  useEffect(() => {
    const update = () =>
      setHeight(window.visualViewport?.height ?? window.innerHeight)
    update()
    window.visualViewport?.addEventListener("resize", update)
    window.addEventListener("resize", update)
    window.addEventListener("orientationchange", update)
    return () => {
      window.visualViewport?.removeEventListener("resize", update)
      window.removeEventListener("resize", update)
      window.removeEventListener("orientationchange", update)
    }
  }, [])
  return height
}

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

  const currentScreen = activeScreens.at(-1)
  const fullLayoutScreens: Screen[] = [
    Screen.Export,
    Screen.Import,
    Screen.About,
    Screen.ExegesisDetail,
    Screen.ProstrationVersesDetail,
    Screen.Sidebar,
    Screen.PrivacyPolicy,
    Screen.Contributors,
  ]
  const shouldUseFullLayout =
    currentScreen !== undefined && fullLayoutScreens.includes(currentScreen)

  useEffect(() => {
    loadPagination()
  }, [])

  const viewportHeight = useViewportHeight()

  // iOS WebKit still lets the document itself bounce/scroll on this route
  // even when nothing overflows it - pinning html/body while mounted here
  // is the standard cross-version fix, reverted on unmount for other routes
  useEffect(() => {
    const { body, documentElement: html } = document
    const prevBody = body.style.cssText
    const prevHtml = html.style.cssText
    body.style.position = "fixed"
    body.style.overflow = "hidden"
    body.style.width = "100%"
    body.style.height = "100%"
    html.style.overflow = "hidden"
    html.style.height = "100%"
    return () => {
      body.style.cssText = prevBody
      html.style.cssText = prevHtml
    }
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
    <Wrapper $theme={theme} style={{ height: `${viewportHeight}px` }}>
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
            <Badge className="drag-feedback-badge">
              {dragFeedback.direction === "next" ? (
                <RiArrowLeftLine size={28} />
              ) : (
                <RiArrowRightLine size={28} />
              )}
              <TurnPageNumber>
                {isDualActive && dragFeedback.targetPage + 1 <= totalPages
                  ? `${dragFeedback.targetPage}-${dragFeedback.targetPage + 1}`
                  : dragFeedback.targetPage}
              </TurnPageNumber>
            </Badge>
          </TurnOverlay>
        )}

        {dragFeedback?.kind === "settings" && (
          <TurnOverlay className="settings-reveal-overlay">
            <Badge className="drag-feedback-badge">
              <RiMenuLine size={28} />
            </Badge>
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
            ${shouldUseFullLayout &&
            css`
              min-width: 400px;
              max-width: 400px;

              @media (max-width: 430px) {
                min-width: 90vw;
                max-width: 90vw;
              }
            `}
          `,
          contentStyle: css`
            ${shouldUseFullLayout &&
            css`
              background-color: ${theme === "dark" ? "#202b24" : "#e1dfda"};
            `}
            padding: 0px;
          `,
        }}
      />
      <ModalDialog />
    </Wrapper>
  )
}

const Wrapper = styled.div<{ $theme: ThemeMode }>`
  width: 100%;
  height: 100svh;
  overflow: hidden;
  overscroll-behavior-y: none;
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
  align-items: center;
  justify-content: center;
  pointer-events: none;
`

// solid-but-translucent so the icon/number stay legible over any page
// content behind them, regardless of theme
const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 22px;
  border-radius: 999px;
  background: rgba(20, 20, 20, 0.7);
  color: #fff;
`

const TurnPageNumber = styled.div`
  font-size: 28px;
  font-weight: 600;
`
