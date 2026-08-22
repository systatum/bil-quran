import { CSSProp } from "styled-components"
import VerseBookmarker from "../QuranPaper/VerseBookmarker"

interface VerseMarkerProps {
  chapterId: number
  verseNumber: number
  /** Extra CSS applied to the marker's container (e.g. positioning). */
  containerStyle?: CSSProp
}

/** Ornamental ayah-end marker; opens the same bookmark/note/highlight/exegesis menu as the reading view. */
export default function VerseMarker({
  chapterId,
  verseNumber,
  containerStyle,
}: VerseMarkerProps) {
  return (
    <VerseBookmarker
      chapterId={chapterId}
      verseNumber={verseNumber}
      containerStyle={containerStyle}
    >
      {verseNumber}
    </VerseBookmarker>
  )
}
