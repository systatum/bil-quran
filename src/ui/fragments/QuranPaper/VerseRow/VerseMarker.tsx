import { RefObject } from "react"
import styled, { css } from "styled-components"
import VerseBookmarker from "../VerseBookmarker"
import { Verse } from "."

interface VerseMarkerProps {
  ref: RefObject<HTMLDivElement | null>
  verse: Verse
}

export function VerseMarker({ ref, verse }: VerseMarkerProps) {
  return (
    <VerseMarkerColumn data-vmark ref={ref}>
      <VerseBookmarker
        chapterId={verse.chapter.id}
        verseNumber={verse.number}
        containerStyle={css`
          margin-top: 12px;
        `}
      >
        {verse.number}
      </VerseBookmarker>
    </VerseMarkerColumn>
  )
}

const VerseMarkerColumn = styled.div`
  align-self: start;
  z-index: 1;
`
