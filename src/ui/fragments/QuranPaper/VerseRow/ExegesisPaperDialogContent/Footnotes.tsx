import { ExegesisVerseContent } from "@constants/records/ExegesisRecord"
import { useTheme } from "@systatum/coneto/theme"
import { marked } from "marked"
import styled from "styled-components"
import { parseInlineMarkers } from "./inlineMarkers"

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
    <FootnoteList>
      {entries.map(([key, text]) => (
        <FootnoteItem
          key={key}
          id={`fn-${exegesisId}-${key}`}
          $theme={theme}
          $highlighted={highlightedFn === key}
        >
          <FootnoteMarker $theme={theme}>{key}</FootnoteMarker>
          <span
            dangerouslySetInnerHTML={{
              __html: String(marked.parseInline(parseInlineMarkers(text))),
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
