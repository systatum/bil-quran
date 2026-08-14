import styled from "styled-components"

export const Wrapper = styled.div<{ $theme: string }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid
    ${({ $theme }) => ($theme === "dark" ? "#303030" : "#e2d6c3")};

  &:last-child {
    border-bottom: none;
  }

  a.inline-marker {
    cursor: pointer;
  }

  a.marker-type-f {
    color: inherit;
    text-decoration: none;
    sup {
      font-size: 0.72em;
      font-weight: 700;
      vertical-align: super;
      color: ${({ $theme }) => ($theme === "dark" ? "#c8a96e" : "#8a6030")};
    }
  }

  a.marker-type-q {
    color: ${({ $theme }) => ($theme === "dark" ? "#9b9b9b" : "#886c36")};
    text-decoration: underline;
    text-decoration-style: dotted;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
    margin-left: 3px;
    margin-right: 3px;
  }
`

export const SourceLabel = styled.span<{ $theme: string }>`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ $theme }) => ($theme === "dark" ? "#7a7a7a" : "#999")};
`

export const VerseText = styled.div<{ $theme: string; $loaded: boolean }>`
  font-size: 0.95em;
  line-height: 1.8;
  margin: 0;
  color: ${({ $theme, $loaded }) =>
    $loaded
      ? $theme === "dark"
        ? "#ece0c8"
        : "#1f1f1f"
      : $theme === "dark"
        ? "#555"
        : "#bbb"};

  p {
    margin: 0 0 0.9em;
  }
  p:last-child {
    margin-bottom: 0;
  }
  em {
    color: ${({ $theme }) => ($theme === "dark" ? "#ccae6c" : "#3a5f8a")};
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.9em 0;
    font-size: 0.92em;
  }
  th,
  td {
    border: 1px solid
      ${({ $theme }) => ($theme === "dark" ? "#3a3226" : "#e2d6c3")};
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
  }
  th {
    font-weight: 600;
    background: ${({ $theme }) =>
      $theme === "dark"
        ? "rgba(200, 169, 110, 0.12)"
        : "rgba(138, 96, 48, 0.08)"};
  }
  tbody tr:nth-child(even) td {
    background: ${({ $theme }) =>
      $theme === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.015)"};
  }

  blockquote.scripture-quote {
    margin: 0.9em 0;
    padding: 10px 16px;
    border-radius: 6px;
    background: ${({ $theme }) =>
      $theme === "dark"
        ? "rgba(200, 169, 110, 0.07)"
        : "rgba(138, 96, 48, 0.06)"};
  }
  blockquote.scripture-quote p.scripture-arabic {
    font-family: "Times New Roman", serif;
    font-size: 1.25em;
    line-height: 2;
    text-align: right;
    margin: 0;
  }
  blockquote.scripture-quote hr.scripture-divider {
    border: none;
    border-top: 1px solid
      ${({ $theme }) =>
        $theme === "dark"
          ? "rgba(200, 169, 110, 0.25)"
          : "rgba(138, 96, 48, 0.2)"};
    margin: 0.6em 0;
  }
  blockquote.scripture-quote div.scripture-meaning {
    font-style: italic;
    opacity: 0.85;
    margin: 0;
  }

  /* Like RT but inline (IRT) */
  span.scripture-inline {
    padding: 1px 0px;
  }
  span.scripture-inline-arabic {
    font-family: "Times New Roman", serif;
  }
  span.scripture-inline-meaning {
    font-style: italic;
    opacity: 0.85;
  }

  /* If wider than a phone: show the Arabic and its meaning side by side
     instead of stacked. When side-by-side, there'll be a pseudo-element
     that is the divider */
  @media (min-width: 520px) {
    blockquote.scripture-quote:has(div.scripture-meaning) {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 20px;
      /* Top-align both columns so the shorter text (arabic/trans) not float-centered. */
      align-items: start;
      position: relative;
    }
    blockquote.scripture-quote:has(div.scripture-meaning)::before {
      content: "";
      position: absolute;
      left: calc(50% - 0.5px);
      top: 10px;
      bottom: 10px;
      width: 1px;
      background: ${({ $theme }) =>
        $theme === "dark"
          ? "rgba(200, 169, 110, 0.25)"
          : "rgba(138, 96, 48, 0.2)"};
    }
    blockquote.scripture-quote:has(div.scripture-meaning) hr.scripture-divider {
      display: none;
    }
    blockquote.scripture-quote:has(div.scripture-meaning) p.scripture-arabic {
      order: 2;
      padding-left: 20px;
    }
    blockquote.scripture-quote:has(div.scripture-meaning)
      div.scripture-meaning {
      order: 1;
    }
  }
`

export const TranslationText = styled.div<{ $theme: string }>`
  position: relative;
  overflow: hidden;
  padding: 24px 18px 14px 36px;
  border-radius: 8px;
  border-left: 3px solid
    ${({ $theme }) =>
      $theme === "dark"
        ? "rgba(200, 169, 110, 0.35)"
        : "rgba(138, 96, 48, 0.3)"};
  background: ${({ $theme }) =>
    $theme === "dark"
      ? "rgba(200, 169, 110, 0.05)"
      : "rgba(138, 96, 48, 0.05)"};

  &::before {
    content: "\\201C";
    position: absolute;
    z-index: 0;
    top: -0.1em;
    left: 8px;
    font-family: Georgia, "Times New Roman", serif;
    font-style: normal;
    font-size: 6em;
    line-height: 1;
    color: ${({ $theme }) =>
      $theme === "dark"
        ? "rgba(200, 169, 110, 0.2)"
        : "rgba(138, 96, 48, 0.16)"};
    pointer-events: none;
    user-select: none;
  }
`

export const TranslationTextContent = styled.div<{
  $theme: string
  $loaded: boolean
}>`
  position: relative;
  z-index: 1;
  font-size: 0.95em;
  line-height: 1.8;
  color: ${({ $theme, $loaded }) =>
    $loaded
      ? $theme === "dark"
        ? "#d8c7a3"
        : "#1f1f1f"
      : $theme === "dark"
        ? "#555"
        : "#bbb"};

  p {
    margin: 0 0 0.9em;
  }
  p:last-child {
    margin-bottom: 0;
  }
`
