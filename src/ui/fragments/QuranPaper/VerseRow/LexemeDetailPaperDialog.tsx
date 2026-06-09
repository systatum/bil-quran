import { ArabicFontFamily } from "@constants/fonts"
import { WordOccurrence } from "@constants/records/WordRecord"
import { WordTranslationOption } from "@constants/records/WordTranslationRecord"
import { ThemeMode } from "@constants/theme"
import { repo } from "@db/repo"
import useUserSettingsState, {
  FontSetting,
} from "@hooks/states/UserSettingsState"
import { useWordTranslations } from "@hooks/tools/useWordTranslations"
import { unpackIPC } from "@services/Converter"
import LOGGER from "@services/Logger"
import { makeSnippet } from "@services/mutator"
import { Grid } from "@systatum/coneto/grid"
import { useCallback, useEffect, useRef, useState } from "react"
import styled from "styled-components"
import { Transliteration, WordCell } from "."
import InfoTile from "./InfoTile"
import InterlinearText from "./InterlinearText"

interface LexemeDetailPaperDialogProps {
  content: WordCell
  arabicFont: string
  theme: ThemeMode
}

export function LexemeDetailPaperDialog({
  content,
  arabicFont,
  theme,
}: LexemeDetailPaperDialogProps) {
  const {
    userSettings: { locale, wbwTranslations, font },
  } = useUserSettingsState()
  const corpora = useWordTranslations(wbwTranslations)

  const [occurrences, setOccurrences] = useState<
    Record<string, WordOccurrence>
  >({})
  requestAnimationFrame(() => {})
  useEffect(() => {
    const findWordsOccurrences = () => {
      repo.words
        .findOccurrences(content.lexemeId)
        .then((ipcResp) => {
          const rawVerses = unpackIPC(ipcResp)
          const verses = rawVerses.map((v) => {
            const targetIndex = v.words.findIndex(
              (w) => w.order === v.targetOrder,
            )

            // use a deterministic "random" based on the verse so same
            // occurrence to always display identically instead of
            // changing on every render
            const deterministicCounter = () =>
              ((v.chapterId * 31 + v.verse * 17 + v.targetOrder) % 5) + 1

            const shownWords = makeSnippet(
              v.words,
              targetIndex,
              deterministicCounter,
            ).map((word) => ({
              ...word,
              meanings: Object.fromEntries(
                wbwTranslations.map((locale) => [
                  locale,
                  corpora[locale]?.[word.chapterId]?.[word.verse]?.[word.order],
                ]),
              ),
            }))

            console.log(shownWords)

            return {
              ...v,
              words: shownWords,
            }
          })
          const obj: Record<string, WordOccurrence> = {}
          verses.forEach((v) => {
            const key = `${v.chapterId}:${v.verse}`
            obj[key] = v
          })
          setOccurrences(obj)
        })
        .catch((e) => LOGGER.error("Failed getting occurrences data", e))
    }

    const requestId = setTimeout(findWordsOccurrences, 700)
    return () => clearTimeout(requestId)
  }, [content.lexemeId])

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
          .map((o) => {
            return (
              <VerseWrapper>
                <InterlinearText
                  showMeaning
                  key={`${o.chapterId}:${o.verse}:${o.chapterId}`}
                  arabicFont={fontArabic}
                  theme={theme}
                  words={o.words}
                  shownTranslations={wbwTranslations}
                  highlightOn={[o.targetOrder]}
                />
              </VerseWrapper>
            )
          })}
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

const VerseWrapper = styled.div`
  padding: 10px 15px;
  background: #f6f2f0;
  border-radius: 8px;
`
