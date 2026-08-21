import { ExegesisVerseContent } from "@constants/records/ExegesisRecord"
import { renderFootnoteText } from "@services/markdown"
import { useTheme } from "@systatum/coneto/theme"
import styled from "styled-components"

export default function Footnotes({
  content,
  exegesisId,
  highlightedFn,
}: {
  content: ExegesisVerseContent
  exegesisId: string
  highlightedFn: string | null
}) {
  const { mode: theme } = useTheme()
  const entries = Object.entries(content.footnotes)
  if (entries.length === 0) return null
  return (
    <FootnoteList className="exegesis-footnotes">
      {entries.map(([key, text]) => (
        <FootnoteItem
          key={key}
          id={`fn-${exegesisId}-${key}`}
          className="exegesis-footnote-item"
          $theme={theme}
          $highlighted={highlightedFn === key}
        >
          <FootnoteMarker $theme={theme} className="exegesis-footnote-marker">
            {key}
          </FootnoteMarker>
          <span
            className="exegesis-footnote-text"
            dangerouslySetInnerHTML={{
              __html: renderFootnoteText(text),
            }}
          />
        </FootnoteItem>
      ))}
    </FootnoteList>
  )
}

const FootnoteList = styled.ol`
  margin: 4px 0 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  list-style: none !important;
`

const FootnoteItem = styled.li<{ $theme: string; $highlighted?: boolean }>`
  font-size: 0.85em;
  line-height: 1.5;
  color: ${({ $theme }) => ($theme === "dark" ? "#9a8f7a" : "#666")};
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: background 0.3s;

  ${({ $highlighted, $theme }) =>
    $highlighted &&
    `background: ${$theme === "dark" ? "rgba(200, 169, 110, 0.18)" : "rgba(138, 96, 48, 0.1)"};`}
`

const FootnoteMarker = styled.span<{ $theme: string }>`
  font-weight: 500;
  margin-right: 0.75em;
  color: ${({ $theme }) => ($theme === "dark" ? "#c8a96e" : "#8a6030")};
`
