import { useEffect, useRef } from "react"

import { ArabicFontFamily } from "@constants/assets"
import { ChapterRecord } from "@constants/records/ChapterRecord"
import { WordWithLexemeRecord } from "@constants/records/WordRecord"
import { DEFAULT_LOCALE } from "@constants/settings"
import { ThemeMode } from "@constants/theme"
import styled from "styled-components"
import useUserSettingsState from "../../hooks/states/UserSettingsState"
import { Bismillah } from "./Bismillah"

export type Verse = {
  id: string
  chapter: ChapterRecord
  number: number
  words: WordCell[]
}

export interface WordCell extends WordWithLexemeRecord {
  meaning: string
}

/**
 * A single virtualized verse row.
 *
 * Responsibility:
 * - render RTL verse text
 * - measure actual DOM height
 * - report height back to virtualizer
 */
export default function VerseRow({
  verse,
  index,
  style,
  sizeMap,
  virtualizer,
  showTransliteration = false,
  showMeaning = true,
  theme,
}: {
  verse: Verse
  index: number
  style: React.CSSProperties
  sizeMap: React.RefObject<Map<number, number>>
  virtualizer: any
  showTransliteration?: boolean
  showMeaning?: boolean
  theme: ThemeMode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { userSettings } = useUserSettingsState()

  useEffect(() => {
    if (!ref.current) return

    const height = ref.current.getBoundingClientRect().height

    if (sizeMap.current.get(index) !== height) {
      sizeMap.current.set(index, height)
      virtualizer.measure()
    }
  }, [index, verse.words.length])

  return (
    <VerseRowWrapper
      ref={ref}
      theme={theme}
      style={{ transform: style.transform }}
    >
      <VerseMarker theme={theme}>{verse.number}</VerseMarker>

      <VerseText fontFamily={userSettings.font.arabic.family}>
        {Bismillah.isRenderableHere(verse.number, verse.chapter.id) && (
          <Word>
            <Bismillah />

            {showTransliteration && (
              <Transliteration>Bismillah hir-Rahman nir-Rahim</Transliteration>
            )}

            {showMeaning && (
              <Meaning theme={theme} $marginTop="57px">
                In the name of Allah, the Most Gracious, the Most Merciful
              </Meaning>
            )}
          </Word>
        )}

        {verse.words.map((word, idx) => (
          <Word key={`${word.chapterId}-${word.verse}-${word.order}`}>
            <Arabic>{word.token}</Arabic>

            {showTransliteration && (
              <Transliteration>{word.readings[DEFAULT_LOCALE]}</Transliteration>
            )}

            {showMeaning && <Meaning theme={theme}>{word.meaning}</Meaning>}
          </Word>
        ))}
      </VerseText>
    </VerseRowWrapper>
  )
}

/**
 * Group words into verse
 *
 * @param chapters map of chapter metadata by their numbering
 * @param words array of words
 * @returns words grouped into verse
 */
VerseRow.groupVerse = (
  chapters: Record<number, ChapterRecord>,
  words: WordCell[],
) => {
  const grouped: Record<string, Verse> = {}

  for (const word of words) {
    const key = `${word.chapterId}:${word.verse}`
    let verse = grouped[key]

    if (!verse) {
      verse = {
        id: key,
        chapter: chapters[word.chapterId],
        number: word.verse,
        words: [],
      }

      grouped[key] = verse
    }

    verse.words.push(word)
  }

  return Array.from(Object.values(grouped))
}

const VerseRowWrapper = styled.div<{ theme: ThemeMode }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 24px 32px;
  display: grid;
  grid-template-columns: 72px 1fr;
  direction: rtl;
  align-items: start;

  color: ${({ theme }) => (theme === "dark" ? "#d8c7a3" : "#1f1f1f")};
  background: ${({ theme }) => (theme === "dark" ? "#181818" : "#f6f1e7")};
  border-bottom: 1px solid
    ${({ theme }) => (theme === "dark" ? "#303030" : "#bfbfbf")};
`
const VerseMarker = styled.div<{ theme: ThemeMode }>`
  width: 42px;
  height: 42px;
  margin-top: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  border-radius: 50%;
  font-size: 18px;

  color: ${({ theme }) => (theme === "dark" ? "#e5dcc3" : "#755f4d")};

  border: 1.5px solid
    ${({ theme }) => (theme === "dark" ? "#5f5644" : "#cbb9a1")};

  background: ${({ theme }) =>
    theme === "dark"
      ? `
          radial-gradient(
            circle,
            #2b2a26 40%,
            #1c1b18 100%
          )
        `
      : `
          radial-gradient(
            circle,
            #efe6d8 40%,
            #e2d6c3 100%
          )
        `};

  box-shadow: ${({ theme }) =>
    theme === "dark"
      ? `
          inset 0 0 0 2px #3b372f,
          0 1px 3px rgba(0,0,0,0.45)
        `
      : `
          inset 0 0 0 2px #f4ede2,
          0 1px 2px rgba(117,95,77,0.08)
        `};

  text-shadow: ${({ theme }) =>
    theme === "dark"
      ? `
          0 1px 0 rgba(0,0,0,0.35)
        `
      : `
          0 1px 0 rgba(255,255,255,0.30)
        `};

  &::after {
    content: "";
    position: absolute;
    inset: 4px;
    border-radius: 50%;

    border: 1px dashed
      ${({ theme }) => (theme === "dark" ? "#7b715b" : "rgba(117,95,77,0.26)")};

    opacity: ${({ theme }) => (theme === "dark" ? 0.4 : 0.5)};
  }
`

const VerseText = styled.div<{ fontFamily: ArabicFontFamily }>`
  text-align: right;
  font-size: 42px;
  line-height: 2.4;
  font-family:
    ${({ fontFamily }) => `"${fontFamily}"`},
    "${"NotoNaskhArabic" satisfies ArabicFontFamily}", serif;
  white-space: normal;
`

const Word = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 0 6px;
  vertical-align: top;
`

const Arabic = styled.span`
  font-size: 42px;
  line-height: 1.6;
`

const Transliteration = styled.span`
  font-size: 14px;
  color: #666;
  margin-top: 4px;
  direction: ltr;
  text-align: center;
`

const Meaning = styled.span<{ theme: ThemeMode; $marginTop?: string }>`
  font-size: 14px;
  color: ${({ theme }) => (theme === "dark" ? "#bebebe" : "#a09083")};
  font-family: "${"NotoNaskhArabic" satisfies ArabicFontFamily}", serif;
  margin-top: ${({ $marginTop }) => $marginTop ?? "2px"};
  direction: ltr;
  text-align: center;
  max-width: 120px;
  line-height: 16px;
`
