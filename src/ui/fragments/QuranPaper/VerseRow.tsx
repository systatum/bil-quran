import { ArabicFontFamily } from "@constants/fonts"
import { ChapterRecord } from "@constants/records/ChapterRecord"
import { WordWithLexemeRecord } from "@constants/records/WordRecord"
import { BasmalaPosition, DEFAULT_LOCALE } from "@constants/settings"
import { ThemeMode } from "@constants/theme"
import useVirtualRowMeasurer from "@hooks/tools/useVirtualRowMeasurer"
import styled, { css } from "styled-components"
import useUserSettingsState, {
  FontSetting,
} from "../../hooks/states/UserSettingsState"
import { Bismillah } from "./Bismillah"
import { useRef, useState, useCallback, useEffect } from "react"
import { PaperDialog, PaperDialogRef } from "@systatum/coneto/paper-dialog"
import { Grid } from "@systatum/coneto/grid"

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
  const [content, setContent] = useState<WordCell | undefined>(undefined)
  const [scrolled, setScrolled] = useState(false)

  const { userSettings } = useUserSettingsState()
  const { basmalaPosition } = userSettings

  const paperDialogRef = useRef<PaperDialogRef>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const ref = useVirtualRowMeasurer({
    index,
    sizeMap,
    virtualizer,
    deps: [
      basmalaPosition,
      showMeaning,
      showTransliteration,
      userSettings.font.arabic,
    ],
  })

  return (
    <>
      <VerseRowWrapper
        ref={ref}
        theme={theme}
        style={{ transform: style.transform }}
      >
        <VerseMarker theme={theme}>{verse.number}</VerseMarker>
        <VerseText font={userSettings.font.arabic}>
          {basmalaPosition === BasmalaPosition.Embedded &&
            Bismillah.isRenderableHere(verse.number, verse.chapter.id) && (
              <Word>
                <Bismillah />

                {showTransliteration && (
                  <Transliteration>
                    Bismillah hir-Rahman nir-Rahim
                  </Transliteration>
                )}

                {showMeaning && (
                  <Meaning theme={theme} $marginTop="57px">
                    In the name of Allah, the Most Gracious, the Most Merciful
                  </Meaning>
                )}
              </Word>
            )}

          {verse.words.map((word) => (
            <Word key={`${word.chapterId}-${word.verse}-${word.order}`}>
              <Arabic
                onMouseDown={() => {
                  setContent(word)
                }}
                onPointerDown={() => {
                  hoverTimeoutRef.current = setTimeout(() => {
                    setScrolled(false)
                    paperDialogRef.current?.openDialog()
                  }, 500)
                }}
                onPointerUp={() => {
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current)
                  }
                }}
                onPointerLeave={() => {
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current)
                  }
                }}
                onPointerCancel={() => {
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current)
                  }
                }}
              >
                {word.token}
              </Arabic>

              {showTransliteration && (
                <Transliteration>
                  {word.readings[DEFAULT_LOCALE]}
                </Transliteration>
              )}

              {showMeaning && <Meaning theme={theme}>{word.meaning}</Meaning>}
            </Word>
          ))}
        </VerseText>
      </VerseRowWrapper>

      <PaperDialog
        mobile
        ref={paperDialogRef}
        height="55dvh"
        controls={[]}
        closable
        styles={{
          indicatorStyle: css`
            height: 40px;
          `,
          contentStyle: css`
            display: flex;
            min-width: auto;
            overflow-wrap: break-word;
            flex-direction: column;
            overflow-y: auto;
            gap: 0px;
            padding: 0px;
          `,
        }}
      >
        {content && (
          <WordDialogContent
            content={content}
            arabicFont={userSettings.font.arabic.family}
            theme={theme}
          />
        )}
      </PaperDialog>
    </>
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
  --text: ${({ theme }) => (theme === "dark" ? "#e5dcc3" : "#755f4d")};
  --border: ${({ theme }) => (theme === "dark" ? "#5f5644" : "#cbb9a1")};
  --bg-start: ${({ theme }) => (theme === "dark" ? "#2b2a26" : "#efe6d8")};
  --bg-end: ${({ theme }) => (theme === "dark" ? "#1c1b18" : "#e2d6c3")};
  --inset: ${({ theme }) => (theme === "dark" ? "#3b372f" : "#f4ede2")};
  --shadow: ${({ theme }) =>
    theme === "dark" ? "rgba(0,0,0,0.45)" : "rgba(117,95,77,0.08)"};
  --text-shadow: ${({ theme }) =>
    theme === "dark" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.30)"};
  --dashed: ${({ theme }) =>
    theme === "dark" ? "#7b715b" : "rgba(117,95,77,0.26)"};
  --dashed-opacity: ${({ theme }) => (theme === "dark" ? 0.4 : 0.5)};

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
  color: var(--text);
  border: 1.5px solid var(--border);

  background: radial-gradient(circle, var(--bg-start) 40%, var(--bg-end) 100%);
  box-shadow:
    inset 0 0 0 2px var(--inset),
    0 1px 3px var(--shadow);
  text-shadow: 0 1px 0 var(--text-shadow);

  &::after {
    content: "";
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    border: 1px dashed var(--dashed);
    opacity: var(--dashed-opacity);
  }
`

const VerseText = styled.div<{ font: FontSetting }>`
  text-align: right;
  font-size: ${({ font }) => `${font.size}px`};
  line-height: 2.4;
  font-family:
    ${({ font }) => `"${font.family}"`},
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
  line-height: 1.6;
  cursor: pointer;
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

// word detail verse content
interface WordDialogContentProps {
  content: WordCell
  arabicFont: string
  theme: ThemeMode
}

export function WordDialogContent({
  content,
  arabicFont,
  theme,
}: WordDialogContentProps) {
  const rootLetters = content.root.root ?? "—"
  const transliteration = content.readings[DEFAULT_LOCALE]

  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrolled(e.currentTarget.scrollTop > 10)
  }, [])

  return (
    <>
      <TokenSection $theme={theme} $scrolled={scrolled}>
        <ArabicToken $font={arabicFont} $theme={theme} $scrolled={scrolled}>
          {content.token}
        </ArabicToken>
        {transliteration && (
          <TransliterationCollapsible $scrolled={scrolled}>
            <Transliteration>{transliteration}</Transliteration>
          </TransliterationCollapsible>
        )}
      </TokenSection>

      <ScrollContainer ref={scrollRef} onScroll={handleScroll}>
        <Grid preset="2-col">
          <InfoTile theme={theme} label="Meaning" value={content.meaning} />
          <InfoTile
            theme={theme}
            label="Root"
            value={rootLetters}
            arabic
            arabicFont={arabicFont}
          />
          <InfoTile
            theme={theme}
            label="Position"
            value={`${content.chapterId}:${content.verse} · Word ${content.order}`}
          />
          <InfoTile
            theme={theme}
            label="Chapter"
            value={String(content.chapterId)}
          />
        </Grid>
        {Array.from({ length: 25 }).map((_, key) => (
          <span key={key}>asdkaksdmkasdkas dsakdmkasmdkamskdmasd</span>
        ))}
      </ScrollContainer>
    </>
  )
}

const ScrollContainer = styled.div`
  overflow-y: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;

  scrollbar-width: thin;
  scrollbar-color: rgba(150, 150, 150, 0.5) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(150, 150, 150, 0.5);
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(150, 150, 150, 0.7);
  }
`

interface InfoTileProps {
  label: string
  value: string
  theme: ThemeMode
  arabic?: boolean
  arabicFont?: string
}

function InfoTile({ label, value, theme, arabic, arabicFont }: InfoTileProps) {
  return (
    <Grid.Card
      styles={{
        self: css`
          background: ${theme === "dark" ? "#1f1e1b" : "#ede6d9"};
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        `,
      }}
    >
      <TileLabel $theme={theme}>{label}</TileLabel>
      <TileValue $theme={theme} $arabic={arabic} $font={arabicFont}>
        {value}
      </TileValue>
    </Grid.Card>
  )
}

const TokenSection = styled.div<{ $theme: ThemeMode; $scrolled: boolean }>`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid
    ${({ $theme }) => ($theme === "dark" ? "#303030" : "#e2d6c3")};
  background-color: inherit;
  z-index: 99929999;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: ${({ $scrolled }) => ($scrolled ? "4px 24px" : "24px 24px 20px")};
`

const ArabicToken = styled.span<{
  $font: string
  $theme: ThemeMode
  $scrolled: boolean
}>`
  font-family:
    ${({ $font }) => `"${$font}"`},
    "${"NotoNaskhArabic" satisfies ArabicFontFamily}", serif;
  direction: rtl;
  letter-spacing: 2px;
  color: ${({ $theme }) => ($theme === "dark" ? "#d8c7a3" : "#1f1f1f")};
  transition:
    font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    line-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: ${({ $scrolled }) => ($scrolled ? "32px" : "52px")};
  line-height: ${({ $scrolled }) => ($scrolled ? "1.2" : "1.4")};
`

const TransliterationCollapsible = styled.div<{ $scrolled: boolean }>`
  overflow: hidden;
  transition:
    max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.25s ease;
  max-height: ${({ $scrolled }) => ($scrolled ? "0px" : "32px")};
  opacity: ${({ $scrolled }) => ($scrolled ? 0 : 1)};
`

const TileLabel = styled.p<{ $theme: ThemeMode }>`
  font-size: 11px;
  color: ${({ $theme }) => ($theme === "dark" ? "#7b715b" : "#a09083")};
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const TileValue = styled.p<{
  $theme: ThemeMode
  $arabic?: boolean
  $font?: string
}>`
  font-size: ${({ $arabic }) => ($arabic ? "18px" : "14px")};
  color: ${({ $theme }) => ($theme === "dark" ? "#d8c7a3" : "#1f1f1f")};
  margin: 0;
  font-weight: 500;

  ${({ $arabic, $font }) =>
    $arabic &&
    css`
      font-family:
        "${$font}", "${"NotoNaskhArabic" satisfies ArabicFontFamily}", serif;
      direction: rtl;
      letter-spacing: 1px;
    `}
`
