import { Asset, ExegesisSource } from "@constants/assets"
import {
  ExegesisChapterAsset,
  ExegesisVerseContent,
} from "@constants/records/ExegesisRecord"
import { Rendering } from "@constants/records/RenderingRecord"
import { DEFAULT_LOCALE, Locale } from "@constants/settings"
import useUserSettingsState, {
  FontSetting,
} from "@hooks/states/UserSettingsState"
import { FingerprintedAsset } from "@services/fingerprinter"
import { renderExegesisMarkdown } from "@services/markdown"
import { useEffect, useState } from "react"
import styled from "styled-components"
import Footnotes from "../QuranPaper/VerseRow/ExegesisPaperDialogContent/Footnotes"
import {
  pulse,
  skeletonColor,
  SourceLabel,
  TranslationText,
  TranslationTextContent,
  VerseText,
  WordsSkeleton,
  Wrapper,
} from "../QuranPaper/VerseRow/ExegesisPaperDialogContent/ExegesisEntryStyles"
import InterlinearText from "../QuranPaper/VerseRow/InterlinearText"
import type { WordCell } from "../QuranPaper/VerseRow"

/** Raw shape of a per-chapter Imlaei rendering asset entry. */
interface ImlaeiWord {
  id: string
  word: string
  trans: string
  root: string
}

export interface ExegesisPreviewShellProps {
  chapterId: number
  verseNumber: number
  exegesisIdOverride?: string
  showTransliterationOverride?: boolean
}

/** Reads exegesis assets; swap the implementation to run outside the browser. */
export interface ExegesisAssetReader {
  getVerseRendering: <T>(rendering: Rendering, chapterId: number) => Promise<T>
  readJson: <T>(url: string) => Promise<T>
}

const browserAssetReader: ExegesisAssetReader = {
  getVerseRendering: FingerprintedAsset.Quran.getVerseRendering,
  readJson: FingerprintedAsset.readJson,
}

/** Fetches and shapes the interlinear words for one verse. Empty for a chapter intro. */
export async function loadInterlinearWords(
  reader: ExegesisAssetReader,
  chapterId: number,
  verseNumber: number,
  isChapterIntro: boolean,
): Promise<WordCell[]> {
  if (isChapterIntro) return []

  const all = await reader.getVerseRendering<ImlaeiWord[]>(
    Rendering.Imlaei,
    chapterId,
  )
  const verseKey = `${chapterId}:${verseNumber}`

  return all
    .filter((w) => w.id === verseKey)
    .map((w, i) => ({
      chapterId,
      verse: verseNumber,
      order: i + 1,
      partNumber: 0,
      lexemeId: 0,
      renderingId: 0,
      token: w.word,
      root: { id: 0, root: w.root },
      readings: { [DEFAULT_LOCALE]: w.trans },
      meanings: {},
    }))
}

/** Fetches and shapes the tafsir content for one verse (or a chapter's intro). */
export async function loadExegesisContent(
  reader: ExegesisAssetReader,
  exegesisId: string | undefined,
  chapterId: number,
  verseNumber: number,
  isChapterIntro: boolean,
): Promise<ExegesisVerseContent | null> {
  if (!exegesisId) return null

  const [, locale] = exegesisId.split("/")
  const url = Asset.exegesisAssetUrlOf(exegesisId, locale as Locale, chapterId)
  const data = await reader.readJson<ExegesisChapterAsset>(url)

  if (isChapterIntro) {
    return data.description
      ? { translation: data.description, exegesis: null, footnotes: {} }
      : null
  }

  const verseKey = String(verseNumber)
  const translation = data.translations?.[verseKey]

  return translation != null
    ? {
        translation,
        exegesis: data.exegesis?.[verseKey] ?? null,
        footnotes: data.footnotes?.[verseKey] ?? {},
      }
    : null
}

/**
 * The shell's actual content: tafsir text + interlinear Arabic, fed by
 * direct asset fetches instead of the seeded DB. Kept apart from the
 * PaperDialog chrome (see ./index.tsx) so it can be unit-tested on its own.
 */
export function ExegesisPreviewContent({
  chapterId,
  verseNumber,
  exegesisIdOverride,
  showTransliterationOverride,
}: ExegesisPreviewShellProps) {
  const userSettings = useUserSettingsState((s) => s.userSettings)
  const theme = userSettings.theme
  const isChapterIntro = verseNumber === 0

  const exegesisId =
    exegesisIdOverride ??
    userSettings.exegesis[0] ??
    Asset.defaultExegesisId(userSettings.locale) ??
    undefined
  const showTransliteration =
    showTransliterationOverride ?? userSettings.showTransliteration

  const [words, setWords] = useState<WordCell[] | null>(null)
  useEffect(() => {
    let cancelled = false
    setWords(null)

    loadInterlinearWords(
      browserAssetReader,
      chapterId,
      verseNumber,
      isChapterIntro,
    )
      .then((result) => {
        if (!cancelled) setWords(result)
      })
      .catch(() => {
        if (!cancelled) setWords([])
      })

    return () => {
      cancelled = true
    }
  }, [chapterId, verseNumber, isChapterIntro])

  const [content, setContent] = useState<ExegesisVerseContent | null | undefined>(
    undefined,
  )
  useEffect(() => {
    setContent(undefined)

    let cancelled = false

    loadExegesisContent(
      browserAssetReader,
      exegesisId,
      chapterId,
      verseNumber,
      isChapterIntro,
    )
      .then((result) => {
        if (!cancelled) setContent(result)
      })
      .catch(() => {
        if (!cancelled) setContent(null)
      })

    return () => {
      cancelled = true
    }
  }, [exegesisId, chapterId, verseNumber, isChapterIntro])

  const source = exegesisId ? Asset.exegesisOf(exegesisId) : null

  return (
    <ExegesisPreviewContentView
      chapterId={chapterId}
      verseNumber={verseNumber}
      isChapterIntro={isChapterIntro}
      theme={theme}
      exegesisId={exegesisId}
      source={source}
      showTransliteration={showTransliteration}
      arabicFont={userSettings.font.arabic}
      words={words}
      content={content}
    />
  )
}

export interface ExegesisPreviewViewProps {
  chapterId: number
  verseNumber: number
  isChapterIntro: boolean
  theme: string
  exegesisId: string | undefined
  source: ExegesisSource | null
  showTransliteration: boolean
  arabicFont: FontSetting
  words: WordCell[] | null
  content: ExegesisVerseContent | null | undefined
}

/** Pure render, no hooks or fetching; takes already-resolved data so it renders the same anywhere. */
export function ExegesisPreviewContentView({
  chapterId,
  verseNumber,
  isChapterIntro,
  theme,
  exegesisId,
  source,
  showTransliteration,
  arabicFont,
  words,
  content,
}: ExegesisPreviewViewProps) {
  return (
    <Outer>
      {!isChapterIntro && (
        <InterlinearCell>
          {words == null ? (
            <WordsSkeleton $theme={theme} />
          ) : words.length > 0 ? (
            <InterlinearText
              id={`exegesis-shell-${chapterId}-${verseNumber}`}
              arabicFont={arabicFont}
              words={words}
              showTransliteration={showTransliteration}
              compact
              smaller
            />
          ) : null}
        </InterlinearCell>
      )}
      <ExegesisCell>
        {!exegesisId ? (
          <Empty $theme={theme}>
            No exegesis selected — enable one in Settings.
          </Empty>
        ) : content == null ? (
          <TextSkeleton $theme={theme} />
        ) : (
          <Wrapper $theme={theme}>
            <SourceLabel $theme={theme}>
              Tafsir {source?.name ?? exegesisId}
              {isChapterIntro && " — Introduction"}
            </SourceLabel>
            {isChapterIntro ? (
              <VerseText
                $theme={theme}
                $loaded
                dangerouslySetInnerHTML={{
                  __html: renderExegesisMarkdown(content.translation),
                }}
              />
            ) : (
              <TranslationText $theme={theme}>
                <TranslationTextContent
                  $theme={theme}
                  $loaded
                  dangerouslySetInnerHTML={{
                    __html: renderExegesisMarkdown(content.translation),
                  }}
                />
              </TranslationText>
            )}
            {content.exegesis && (
              <VerseText
                $theme={theme}
                $loaded
                dangerouslySetInnerHTML={{
                  __html: renderExegesisMarkdown(content.exegesis),
                }}
              />
            )}
            <Footnotes
              content={content}
              exegesisId={exegesisId}
              highlightedFn={null}
            />
          </Wrapper>
        )}
      </ExegesisCell>
    </Outer>
  )
}

const Outer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
`

const InterlinearCell = styled.div`
  flex: 0.3;
  overflow: auto;
  display: flex;
  flex-direction: row;
  justify-content: end;
  padding-left: 1em;
`

const ExegesisCell = styled.div`
  flex: 0.7;
  overflow: auto;
  padding: 12px 16px 16px;
`

const Empty = styled.p<{ $theme: string }>`
  flex: 1;
  padding: 24px;
  font-size: 0.95em;
  text-align: center;
  color: ${({ $theme }) => ($theme === "dark" ? "#666" : "#999")};
`

const TextSkeleton = styled.div<{ $theme: string }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 0;

  &::before,
  &::after {
    content: "";
    height: 12px;
    border-radius: 4px;
    background: ${({ $theme }) => skeletonColor($theme)};
    animation: ${pulse} 1.4s ease-in-out infinite;
  }
  &::before {
    width: 90%;
  }
  &::after {
    width: 70%;
  }
`
