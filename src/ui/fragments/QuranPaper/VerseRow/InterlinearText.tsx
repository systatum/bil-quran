import { ArabicFontFamily, isLearningFont } from "@constants/fonts"
import { WordTranslationOption } from "@constants/records/WordTranslationRecord"
import { DEFAULT_LOCALE } from "@constants/settings"
import { ThemeMode } from "@constants/theme"
import useUserSettingsState, {
  FontSetting,
} from "@hooks/states/UserSettingsState"
import useAligner from "@hooks/tools/useAligner"
import { RefObject } from "react"
import styled from "styled-components"
import { WordCell } from "."
import { Bismillah } from "./Bismillah"

interface InterlinearTextProps {
  /**
   * Signifying the chapter and verse
   */
  id: string
  arabicFont: FontSetting
  withBasmala?: boolean
  showTransliteration?: boolean
  showMeaning?: boolean
  words: WordCell[]
  lastWordRef?: RefObject<HTMLSpanElement>
  onMouseDown?: (w: WordCell) => void
  onPointerDown?: (w: WordCell) => void
  onPointerUp?: (w: WordCell) => void
  onPointerLeave?: (w: WordCell) => void
  onPointerCancel?: (w: WordCell) => void
  shownTranslations?: WordTranslationOption[]
  highlightOn?: number[]

  /**
   * If undefined, will detect whether the showing is for learning or not
   * based on the font type. Text for learning is displayed with more
   * margins in-between of the words.
   */
  isForLearning?: boolean | undefined
}

export default function InterlinearText({
  id,
  arabicFont: font,
  withBasmala = false,
  showTransliteration,
  showMeaning,
  words,
  lastWordRef,
  shownTranslations,
  isForLearning,
  ...props
}: InterlinearTextProps) {
  const {
    userSettings: { theme },
  } = useUserSettingsState()
  const { wordRefs, wordRows, rowLayerHeights } = useAligner({
    key: id,
  })
  const isForLearningFont: boolean =
    isForLearning === undefined ? isLearningFont(font.family) : !!isForLearning

  return (
    <VerseText $font={font}>
      {withBasmala && (
        <Word>
          <Bismillah />

          {showTransliteration && (
            <Transliteration>Bismillah hir-Rahman nir-Rahim</Transliteration>
          )}

          {showMeaning && (
            <Meanings>
              <Meaning $theme={theme} $marginTop="57px">
                In the name of Allah, the Most Gracious, the Most Merciful
              </Meaning>
            </Meanings>
          )}
        </Word>
      )}

      {words.map((word, i) => (
        <Word
          key={`${word.chapterId}-${word.verse}-${word.order}`}
          data-word-index={i}
          ref={(el) => {
            if (!el) return
            wordRefs.current[i] = el
          }}
          $usingLearningFont={isForLearningFont}
        >
          <Arabic
            $highlighted={
              props.highlightOn && props.highlightOn.includes(word.order)
            }
            onMouseDown={() => props.onMouseDown?.(word)}
            onPointerDown={() => props.onPointerDown?.(word)}
            onPointerUp={() => props.onPointerUp?.(word)}
            onPointerLeave={() => props.onPointerLeave?.(word)}
            onPointerCancel={() => props.onPointerCancel?.(word)}
          >
            {word.token}
          </Arabic>

          {showTransliteration && (
            <Transliteration>{word.readings[DEFAULT_LOCALE]}</Transliteration>
          )}

          {showMeaning && (
            <Meanings>
              {shownTranslations?.map((t, layer) => (
                <Meaning
                  key={t}
                  $theme={theme}
                  data-layer={layer}
                  $minHeight={rowLayerHeights[wordRows[i]]?.[layer]}
                >
                  {word.meanings[t]}
                </Meaning>
              ))}
            </Meanings>
          )}
        </Word>
      ))}
    </VerseText>
  )
}

/**
 * Verse line. Do not introduce line height, unless you do other things.
 * Visually, each verse should be separated by a "line" (or border-bottom gap)
 * between verses; that gap will disappear if we introduce line height.
 */
const VerseText = styled.div<{ $font: FontSetting }>`
  text-align: right;
  font-size: ${({ $font }) => `${$font.size}px`};
  font-family:
    ${({ $font }) => `"${$font.family}"`},
    "${"NotoNaskhArabic" satisfies ArabicFontFamily}", serif;
  white-space: normal;
  direction: rtl;
`

const Word = styled.span<{ $usingLearningFont?: boolean }>`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: ${({ $usingLearningFont }) =>
    `10px ${$usingLearningFont ? "25" : "6"}px`};
  vertical-align: top;
  user-select: none;
`

const Arabic = styled.span<{ $highlighted?: boolean }>`
  line-height: 1.6;
  cursor: pointer;
  ${({ $highlighted }) =>
    $highlighted
      ? "border-radius: 8px; padding: 0 15px; color: #4e4e32; background: #e7e7b4;"
      : ""}
`

const Transliteration = styled.span`
  font-size: 14px;
  color: #666;
  margin-top: 4px;
  direction: ltr;
  text-align: center;
`

const Meaning = styled.div<{
  $theme: ThemeMode
  $minHeight?: number
  $marginTop?: string
}>`
  min-height: ${({ $minHeight }) => ($minHeight ? `${$minHeight}px` : "auto")};
  font-size: 14px;
  display: block;
  color: ${({ $theme }) => ($theme === "dark" ? "#bebebe" : "#a09083")};
  font-family: "${"NotoNaskhArabic" satisfies ArabicFontFamily}", serif;
  margin-top: ${({ $marginTop }) => $marginTop ?? "8px"};
  direction: ltr;
  text-align: center;
  max-width: 120px;

  /* allows breaking anywhere when necessary, including around long text */
  word-break: break-word;
  overflow-wrap: anywhere;
`

const Meanings = styled.span`
  line-height: 16px;
  margin-top: 3px;
`
