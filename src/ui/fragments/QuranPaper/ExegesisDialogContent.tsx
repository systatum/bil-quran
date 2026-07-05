import { Asset } from "@constants/assets"
import { ExegesisVerseContent } from "@constants/records/ExegesisRecord"
import useExegesisState from "@hooks/states/ExegesisState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import LOGGER from "@services/Logger"
import { useTheme } from "@systatum/coneto/theme"
import { useEffect } from "react"
import styled from "styled-components"

export default function ExegesisDialogContent({
  chapterId,
  verseNumber,
}: {
  chapterId: number
  verseNumber: number
}) {
  const { mode: theme } = useTheme()
  const { userSettings } = useUserSettingsState()
  const { loadChapter, getVerseExegesis } = useExegesisState()

  const activeIds = userSettings.exegesis

  useEffect(() => {
    for (const exegesisId of activeIds) {
      loadChapter(exegesisId, chapterId).catch((e) =>
        LOGGER.error(`Failed loading exegesis chapter: ${exegesisId}`, e),
      )
    }
  }, [chapterId, activeIds.join(",")])

  if (activeIds.length === 0) {
    return (
      <Empty $theme={theme}>
        No exegesis selected — enable one in Settings.
      </Empty>
    )
  }

  return (
    <Container>
      {activeIds.map((exegesisId) => {
        const source = Asset.exegesisOf(exegesisId)
        const content = getVerseExegesis(exegesisId, chapterId, verseNumber)
        return (
          <Entry key={exegesisId} $theme={theme}>
            <SourceLabel $theme={theme}>
              {source?.name ?? exegesisId}
            </SourceLabel>
            <VerseText $theme={theme} $loaded={content != null}>
              {content ? content.translation : "Loading…"}
            </VerseText>
            {content && <Footnotes content={content} theme={theme} />}
          </Entry>
        )
      })}
    </Container>
  )
}

function Footnotes({
  content,
  theme,
}: {
  content: ExegesisVerseContent
  theme: string
}) {
  const entries = Object.entries(content.footnotes)
  if (entries.length === 0) return null
  return (
    <FootnoteList>
      {entries.map(([key, text]) => (
        <FootnoteItem key={key} $theme={theme}>
          <FootnoteMarker $theme={theme}>{key}</FootnoteMarker>
          {text}
        </FootnoteItem>
      ))}
    </FootnoteList>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
  overflow-y: auto;
  padding: 16px;

  scrollbar-width: thin;
  scrollbar-color: rgba(150, 150, 150, 0.5) transparent;
`

const Entry = styled.div<{ $theme: string }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid
    ${({ $theme }) => ($theme === "dark" ? "#303030" : "#e2d6c3")};

  &:last-child {
    border-bottom: none;
  }
`

const SourceLabel = styled.span<{ $theme: string }>`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ $theme }) => ($theme === "dark" ? "#7a7a7a" : "#999")};
`

const VerseText = styled.p<{ $theme: string; $loaded: boolean }>`
  font-size: 16px;
  line-height: 1.7;
  margin: 0;
  color: ${({ $theme, $loaded }) =>
    $loaded
      ? $theme === "dark"
        ? "#d8c7a3"
        : "#1f1f1f"
      : $theme === "dark"
        ? "#555"
        : "#bbb"};
`

const FootnoteList = styled.ol`
  margin: 4px 0 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const FootnoteItem = styled.li<{ $theme: string }>`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ $theme }) => ($theme === "dark" ? "#9a8f7a" : "#666")};
`

const FootnoteMarker = styled.span<{ $theme: string }>`
  font-weight: 600;
  margin-right: 4px;
  color: ${({ $theme }) => ($theme === "dark" ? "#c8a96e" : "#8a6030")};
`

const Empty = styled.p<{ $theme: string }>`
  padding: 24px;
  font-size: 15px;
  text-align: center;
  color: ${({ $theme }) => ($theme === "dark" ? "#666" : "#999")};
`
