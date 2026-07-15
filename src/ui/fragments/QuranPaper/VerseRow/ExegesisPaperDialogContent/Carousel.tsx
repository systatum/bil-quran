import * as Coneto from "@systatum/coneto/carousel"
import { useEffect, useState } from "react"
import { css } from "styled-components"
import Entry from "./Entry"
import { NavTarget } from "./index"

/**
 * Swipeable carousel over each active exegesis source's entry, one slide
 * per source. Arrow/dot controls are intentionally omitted (no `controller`
 * prop) — navigation is via swipe/drag or arrow keys only.
 */
export default function ExegesisCarousel({
  exegesisIds,
  chapterId,
  verseNumber,
  isChapterIntro,
  theme,
  onNavigate,
}: {
  exegesisIds: string[]
  chapterId: number
  verseNumber: number
  isChapterIntro: boolean
  theme: string
  onNavigate: (target: NavTarget) => void
}) {
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage((p) => Math.min(p, exegesisIds.length - 1))
  }, [exegesisIds.length])

  return (
    <Coneto.Carousel
      currentPage={page}
      onChange={(e) => e && setPage(e.page)}
      autoHeight
      styles={{
        // The carousel's container has `overflow: hidden` (to clip
        // adjacent slides horizontally) with the browser default
        // flex-shrink: 1. Such rule results in the item's automatic
        // min-height to 0, letting content shrink to leftover space
        // instead of overflowing so that the scroll area can pick it up.
        // flex-shrink: 0 keeps it at its full natural height instead.
        containerStyle: css`
          flex-shrink: 0;
        `,
      }}
    >
      {exegesisIds.map((exegesisId) => (
        <Entry
          key={exegesisId}
          exegesisId={exegesisId}
          chapterId={chapterId}
          verseNumber={verseNumber}
          isChapterIntro={isChapterIntro}
          theme={theme}
          onNavigate={onNavigate}
        />
      ))}
    </Coneto.Carousel>
  )
}
