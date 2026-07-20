import {
  ArabicFontFamily,
  ArabicFontId,
  isLearningFont,
} from "@constants/fonts"
import { WordOccurrence } from "@constants/records/WordRecord"
import { WordTranslationOption } from "@constants/records/WordTranslationRecord"
import useChaptersState from "@hooks/states/ChaptersState"
import useUserSettingsState, {
  FontSetting,
} from "@hooks/states/UserSettingsState"
import { arabicLetterToLatin } from "@services/Converter"
import { Grid } from "@systatum/coneto/grid"
import { useTheme } from "@systatum/coneto/theme"
import { useCallback, useRef, useState } from "react"
import styled, { css } from "styled-components"
import { Transliteration, WordCell } from "."
import ClippedContent from "../../ClippedContent"
import InfoTile from "./InfoTile"
import InterlinearText from "./InterlinearText"
import usePaperDialogState, {
  LexemeDetailDialogContentProp,
} from "@hooks/states/PaperDialogState"

export function LexemeDetailPaperDialog() {
  const lexemeContent = usePaperDialogState.getState()
    ?.content as LexemeDetailDialogContentProp
  const { occurrences, word: content } = lexemeContent

  const { mode: theme } = useTheme()
  const {
    userSettings: { locale, wbwTranslations, font },
  } = useUserSettingsState()
  const arabicFont = font.arabic.family
  const { getChapterTransliteratedName, getChapterMeaning } = useChaptersState()

  const isTranslated =
    Array.isArray(wbwTranslations) && wbwTranslations.length > 0
  const rootReadings = content.root.root
    ? content.root.root
        .split(/\s+/)
        .filter(Boolean)
        .map((letter) => ({ letter, latin: arabicLetterToLatin(letter) }))
    : []
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
            value={
              rootReadings.length > 0 ? (
                <RootReadingRow>
                  {rootReadings.map(({ letter, latin }, i) => (
                    <RootPair key={i}>
                      <RootLetter $font={arabicFont}>{letter}</RootLetter>
                      <RootLatin $theme={theme}>{latin}</RootLatin>
                    </RootPair>
                  ))}
                </RootReadingRow>
              ) : (
                "—"
              )
            }
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
  theme: string
  scrolled: boolean
  font: string
}) {
  const forLearningFont = isLearningFont(font)

  return (
    <TokenSection
      $theme={theme}
      $scrolled={scrolled}
      $forLearningFont={forLearningFont}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "3px",
          textAlign: "center",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ArabicToken $font={font} $theme={theme} $scrolled={scrolled}>
          {token}
        </ArabicToken>
        {forLearningFont && (
          <>
            <span
              style={{
                color: theme === "dark" ? "#3c3c4d" : "rgb(164 150 124)",
                fontSize: scrolled ? "2em" : "4em",
                marginRight: "10px",
                marginLeft: "10px",
                transform: scrolled ? "translateY(0px)" : "translateY(-8px)",
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

// Root letters read right-to-left, same as the arabic script itself — the
// first root letter sits on the right, each followed by its own latin
// reading in a lighter, encircled badge.
const RootReadingRow = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  direction: rtl;
  gap: 12px;
  float: right;
`

const RootPair = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const RootLetter = styled.span<{ $font: string }>`
  font-family:
    "${({ $font }) => $font}",
    "${"NotoNaskhArabic" satisfies ArabicFontFamily}", serif;
  font-size: 18px;
`

const RootLatin = styled.span<{ $theme: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  border: 1px solid
    ${({ $theme }) => ($theme === "dark" ? "#5a5f59" : "#c9bda3")};
  font-size: 11px;
  font-weight: 400;
  color: ${({ $theme }) => ($theme === "dark" ? "#8f938f" : "#a09083")};
  direction: ltr;
`

const ScrollContainer = styled.div`
  overflow-y: auto;
  flex: 1;
  min-height: 0;
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

const TokenSection = styled.div<{
  $theme: string
  $scrolled: boolean
  $forLearningFont?: boolean
}>`
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
  padding: ${({ $scrolled }) =>
    $scrolled ? "0px 4px 24px" : "0 24px 24px 20px"};

  ${({ $forLearningFont }) =>
    $forLearningFont &&
    css`
      margin-top: 20px;
    `}
`

const ArabicToken = styled.span.attrs({ className: "arabic-lex" })<{
  $font: string
  $theme: string
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
