import { ThemeMode } from "@constants/theme"
import styled from "styled-components"

export default function BasmalaRow({ theme }: { theme: ThemeMode }) {
  return (
    <BasmalaContainer theme={theme}>
      <BasmalaFrame theme={theme}>
        <BasmalaText theme={theme} lang="ar">
          ﷽
        </BasmalaText>
      </BasmalaFrame>
    </BasmalaContainer>
  )
}

const BasmalaContainer = styled.div<{ theme: ThemeMode; $hidden?: boolean }>`
  --bg: ${({ theme }) => (theme === "dark" ? "#181818" : "#f6f1e7")};
  --panel-top: ${({ theme }) => (theme === "dark" ? "#211f1a" : "#f3ecdf")};
  --panel-bottom: ${({ theme }) => (theme === "dark" ? "#191714" : "#ebe0cb")};
  --line: ${({ theme }) => (theme === "dark" ? "#5f5644" : "#b8a27a")};
  --line-soft: ${({ theme }) => (theme === "dark" ? "#3b372f" : "#d8ccb7")};
  --gold-soft: ${({ theme }) => (theme === "dark" ? "#a8956c" : "#9b8157")};

  width: 100%;
  box-sizing: border-box;
  background: var(--bg);
  display: flex;
  justify-content: center;
`

const BasmalaFrame = styled.div<{ theme: ThemeMode }>`
  position: relative;
  width: 100%;
  padding: 14px 72px;

  background:
    radial-gradient(
      ellipse at center,
      ${({ theme }) =>
          theme === "dark"
            ? "rgba(216,204,176,0.03)"
            : "rgba(127,103,64,0.035)"}
        0%,
      transparent 75%
    ),
    linear-gradient(180deg, var(--panel-top), var(--panel-bottom));

  border: 1.5px solid var(--line);
  border-top: none;

  box-shadow:
    inset 0 0 0 2px var(--line-soft),
    ${({ theme }) =>
      theme === "dark"
        ? `
        0 8px 14px -10px rgba(0,0,0,0.55),
        2px 0 6px -4px rgba(0,0,0,0.18),
        -2px 0 6px -4px rgba(0,0,0,0.18)
      `
        : `
        0 8px 14px -10px rgba(90,70,40,0.18),
        2px 0 5px -4px rgba(90,70,40,0.08),
        -2px 0 5px -4px rgba(90,70,40,0.08)
      `};

  display: flex;
  justify-content: center;
  align-items: center;

  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 6px;
    left: 6px;
    right: 6px;
    bottom: 6px;

    border: 1px solid
      ${({ theme }) =>
        theme === "dark" ? "rgba(216,204,176,0.10)" : "rgba(127,103,64,0.12)"};

    pointer-events: none;
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    width: 220px;
    height: 1px;
    transform: translateX(-50%);

    background: linear-gradient(
      90deg,
      transparent,
      ${({ theme }) =>
          theme === "dark" ? "rgba(216,204,176,0.45)" : "rgba(127,103,64,0.38)"}
        20%,
      ${({ theme }) =>
          theme === "dark" ? "rgba(216,204,176,0.45)" : "rgba(127,103,64,0.38)"}
        80%,
      transparent
    );
  }
`

const BasmalaText = styled.p<{ theme: ThemeMode }>`
  margin: 0;
  direction: rtl;
  text-align: center;
  font-family: "Amiri", "Noto Naskh Arabic", serif;
  font-size: clamp(0.8rem, 1.4vw, 2.2rem);
  padding: 10px 0;
  line-height: 1.7;

  color: ${({ theme }) => (theme === "dark" ? "#f1e6c8" : "#4b3922")};

  text-shadow: ${({ theme }) =>
    theme === "dark"
      ? "0 1px 0 rgba(0,0,0,0.35)"
      : "0 1px 0 rgba(255,255,255,0.7)"};

  font-feature-settings:
    "calt" 1,
    "liga" 1,
    "dlig" 1;

  letter-spacing: 0.01em;

  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
`
