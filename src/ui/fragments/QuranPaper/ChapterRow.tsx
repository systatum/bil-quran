import { useEffect, useRef } from "react"

import { DEFAULT_LOCALE } from "@constants/locales"
import { ChapterRecord } from "@constants/records/ChapterRecord"
import { ThemeMode } from "@constants/theme"
import styled from "styled-components"

/**
 * Row for each chapter. Because it is a virtualized row, we still need
 * to report its height. If we don't report, then the difference will cause
 * offset drift, which makes scroll position restoration inaccurate.
 */
export default function ChapterRow({
  chapter,
  index,
  style,
  sizeMap,
  virtualizer,
  theme,
}: {
  chapter: ChapterRecord
  index: number
  style: React.CSSProperties
  sizeMap: React.RefObject<Map<number, number>>
  virtualizer: any
  theme: ThemeMode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const h = ref.current.getBoundingClientRect().height

    if (sizeMap.current.get(index) !== h) {
      sizeMap.current.set(index, h)
      virtualizer.measure()
    }
  }, [index, chapter, sizeMap, virtualizer])

  return (
    <ChapterHeaderContainer
      ref={ref}
      theme={theme}
      style={{ transform: style.transform }}
    >
      <ChapterPanel theme={theme}>
        <SideOrnament side="left" />

        <ChapterName>{chapter.namings[DEFAULT_LOCALE]}</ChapterName>
        <ChapterDescription>
          {chapter.transliterations[DEFAULT_LOCALE]}
          {" · "}
          {chapter.meanings[DEFAULT_LOCALE]}
        </ChapterDescription>

        <SideOrnament side="right" />
      </ChapterPanel>
    </ChapterHeaderContainer>
  )
}
const ChapterHeaderContainer = styled.div<{ theme: ThemeMode }>`
  --bg: ${({ theme }) => (theme === "dark" ? "#181818" : "#f6f1e7")};
  --panel-top: ${({ theme }) => (theme === "dark" ? "#26231d" : "#f4ede0")};
  --panel-bottom: ${({ theme }) => (theme === "dark" ? "#1d1b17" : "#e7dcc8")};
  --gold: ${({ theme }) => (theme === "dark" ? "#d8ccb0" : "#7f6740")};
  --gold-soft: ${({ theme }) => (theme === "dark" ? "#8b7b58" : "#9b8157")};
  --line: ${({ theme }) => (theme === "dark" ? "#5f5644" : "#b8a27a")};
  --line-soft: ${({ theme }) => (theme === "dark" ? "#3b372f" : "#d8ccb7")};
  --text: ${({ theme }) => (theme === "dark" ? "#f3ead7" : "#3f3120")};
  --subtext: ${({ theme }) => (theme === "dark" ? "#b7ab90" : "#7b6848")};

  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 18px;
  background: var(--bg);
  overflow: hidden;
`

const ChapterPanel = styled.div<{ theme: ThemeMode }>`
  position: relative;
  width: 100%;
  box-sizing: border-box;
  padding: 18px 88px;
  background: linear-gradient(180deg, var(--panel-top), var(--panel-bottom));
  border: 1.5px solid var(--line);

  box-shadow:
    inset 0 0 0 2px var(--line-soft),
    ${({ theme }) =>
      theme === "dark"
        ? "0 1px 3px rgba(0,0,0,0.45)"
        : "0 1px 2px rgba(90,70,40,0.10)"};

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 7px;
    border: 1px solid
      ${({ theme }) =>
        theme === "dark" ? "rgba(216,204,176,0.12)" : "rgba(127,103,64,0.16)"};
    pointer-events: none;
  }
`

const ChapterName = styled.div`
  position: relative;
  z-index: 2;
  margin: 0;
  direction: rtl;
  text-align: center;
  font-family: "Amiri", "Noto Naskh Arabic", serif;
  font-size: clamp(2rem, 4vw, 5rem);
  line-height: 1.15;
  color: var(--text);

  text-shadow: 0 1px 0
    ${({ theme }) =>
      theme === "dark" ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.55)"};

  font-feature-settings:
    "liga" 1,
    "rlig" 1,
    "calt" 1;
`

const ChapterDescription = styled.div`
  margin-top: 0px;
  text-align: center;
  font-size: 0.72rem;
  line-height: 1.2;
  color: var(--subtext);
  letter-spacing: 0.06em;
  font-family: "Ubuntu", "Noto Naskh Arabic", serif;
`

const SideOrnament = ({ side }: { side: "left" | "right" }) => {
  return (
    <SideOrnamentWrapper side={side}>
      <svg viewBox="0 0 100 100" fill="none">
        <path
          d="
            M50 10
            C58 22 78 42 90 50
            C78 58 58 78 50 90
            C42 78 22 58 10 50
            C22 42 42 22 50 10
            Z
          "
          stroke="currentColor"
          strokeWidth="2"
        />

        <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="2" />
      </svg>
    </SideOrnamentWrapper>
  )
}

const SideOrnamentWrapper = styled.div<{
  side: "left" | "right"
}>`
  position: absolute;
  ${({ side }) => side}: 22px;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  color: var(--gold-soft);
  opacity: 0.9;
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`
