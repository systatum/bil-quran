import {
  ArabicFontFamily,
  ArabicFontId,
  isLearningFont,
} from "@constants/fonts"
import { WordOccurrence } from "@constants/records/WordRecord"
import { WordTranslationOption } from "@constants/records/WordTranslationRecord"
import { ThemeMode } from "@constants/theme"
import useChaptersState from "@hooks/states/ChaptersState"
import useUserSettingsState, {
  FontSetting,
} from "@hooks/states/UserSettingsState"
import { Grid } from "@systatum/coneto/grid"
import { useCallback, useRef, useState } from "react"
import styled from "styled-components"
import { Transliteration, WordCell } from "."
import ClippedContent from "../../ClippedContent"
import InfoTile from "./InfoTile"
import InterlinearText from "./InterlinearText"

interface LexemeDetailPaperDialogProps {
  content: WordCell
  arabicFont: string
  theme: ThemeMode
  occurrences: Record<string, WordOccurrence>
}

export function LexemeDetailPaperDialog({
  content,
  arabicFont,
  theme,
  occurrences,
}: LexemeDetailPaperDialogProps) {
  const {
    userSettings: { locale, wbwTranslations, font },
  } = useUserSettingsState()
  const { getChapterTransliteratedName, getChapterMeaning } = useChaptersState()

  const isTranslated =
    Array.isArray(wbwTranslations) && wbwTranslations.length > 0
  const rootLetters = content.root.root ?? "—"
  const localeBasedTransliteration = content.readings[locale]
  const wbwBasedTransliteration = isTranslated
    ? wbwTranslations.map((x) => content.readings[x]).find((x) => x != null)
    : undefined
  const transliteration = localeBasedTransliteration || wbwBasedTransliteration

  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrolled(e.currentTarget.scrollTop > 10)
  }, [])

  const localeBasedMeaning =
    content.meanings[WordTranslationOption.fromLocale(locale)]
  const wbwBasedMeaning = isTranslated
    ? wbwTranslations.map((l) => content.meanings[l]).join("; ")
    : undefined
  const anyMeaning = Object.values(content.meanings)[0]
  const meaning = wbwBasedMeaning ?? localeBasedMeaning ?? anyMeaning

  const fontArabic: FontSetting = { ...font.arabic, size: 30 }

  return (
    <>
      <Lexeme
        font={arabicFont}
        theme={theme}
        scrolled={scrolled}
        token={content.token}
        transliteration={transliteration}
      />

      <ScrollContainer ref={scrollRef} onScroll={handleScroll}>
        <Grid preset="2-col">
          <InfoTile theme={theme} label="Meaning" value={meaning ?? "?"} />
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

        {Object.values(occurrences)
          .slice(0, 20)
          .map((o, i) => (
            <ClippedContent
              key={i}
              label={`${o.chapterId} (${getChapterTransliteratedName(o.chapterId)} / ${getChapterMeaning(o.chapterId)}) : ${o.verse}`}
            >
              <InterlinearText
                showMeaning
                key={`${o.chapterId}:${o.verse}`}
                id={`${o.chapterId}:${o.verse}`}
                arabicFont={fontArabic}
                words={o.words}
                shownTranslations={wbwTranslations}
                highlightOn={[o.targetOrder]}
              />
            </ClippedContent>
          ))}
      </ScrollContainer>
    </>
  )
}

/**
 * Component to render the token word. If the font chosen is "for-learning" type
 * of font, we render the token twice side-by-side: in the original font vs in
 * the standard arabic.
 */
function Lexeme({
  token,
  transliteration,
  theme,
  scrolled,
  font,
}: {
  token: string
  transliteration: string | undefined
  theme: ThemeMode
  scrolled: boolean
  font: string
}) {
  const forLearningFont = isLearningFont(font)

  return (
    <TokenSection $theme={theme} $scrolled={scrolled}>
      <div style={{ display: "flex", flexDirection: "row", gap: "3px" }}>
        <ArabicToken $font={font} $theme={theme} $scrolled={scrolled}>
          {token}
        </ArabicToken>
        {forLearningFont && (
          <>
            <span
              style={{
                color: theme === "dark" ? "#3c3c4d" : "rgb(164 150 124)",
                fontSize: scrolled ? "2em" : "4em",
                lineHeight: scrolled ? "7vh" : "12vh",
                marginRight: "10px",
                marginLeft: "10px",
              }}
            >
              ·
            </span>
            <ArabicToken
              $font={ArabicFontId.DroidNaskh}
              $theme={theme}
              $scrolled={scrolled}
            >
              {token}
            </ArabicToken>
          </>
        )}
      </div>
      {transliteration && (
        <TransliterationCollapsible $scrolled={scrolled}>
          <Transliteration>{transliteration}</Transliteration>
        </TransliterationCollapsible>
      )}
    </TokenSection>
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
  color: ${({ $theme }) => ($theme === "dark" ? "#d8c7a3" : "#1f1f1f")};
  transition:
    font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    line-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: ${({ $scrolled }) => ($scrolled ? "32px" : "52px")};
  line-height: ${({ $scrolled }) => ($scrolled ? "1.2" : "1.4")};
  user-select: all;
  -webkit-user-select: all;
`

const TransliterationCollapsible = styled.div<{ $scrolled: boolean }>`
  overflow: hidden;
  transition:
    max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.25s ease;
  max-height: ${({ $scrolled }) => ($scrolled ? "0px" : "32px")};
  opacity: ${({ $scrolled }) => ($scrolled ? 0 : 1)};
`
