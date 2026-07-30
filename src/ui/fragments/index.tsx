import { ThemeMode } from "@constants/theme"
import { type BodyThemeConfig } from "@systatum/coneto/theme"
import styled, { type CSSProp } from "styled-components"

interface StyleProp {
  $style?: CSSProp
  $flexDirection?: "row" | "column"
  $theme?: ThemeMode
}

const Wrapper = styled.div<StyleProp>`
  width: 100%;
  height: 100dvh;
  display: flex;
  flex-direction: ${({ $flexDirection }) => $flexDirection ?? "column"};
  justify-content: center;
  align-items: center;
  gap: 20px;
  background: ${({ $theme }) => ($theme === "dark" ? "#202b24" : "#e1dfda")};
  position: relative;

  ${({ $style }) => $style}
`

const Item = styled.div<StyleProp>`
  width: 100%;
  display: flex;
  flex-direction: ${({ $flexDirection }) => $flexDirection ?? "column"};
  justify-content: center;
  align-items: center;
  gap: 4px;

  ${({ $style }) => $style}
`

const SubItem = styled.div<StyleProp>`
  width: fit-content;
  display: flex;
  flex-direction: ${({ $flexDirection }) => $flexDirection ?? "column"};

  ${({ $style }) => $style}
`

const Span = styled.span<StyleProp>`
  flex-direction: ${({ $flexDirection }) => $flexDirection ?? "column"};
  display: flex;
  gap: 4px;

  ${({ $style }) => $style}
`

const Text = styled.span<StyleProp & { $fontSize?: number }>`
  font-size: ${({ $fontSize }) => $fontSize ?? 14}px;

  ${({ $style }) => $style}
`

const Form = styled.form<StyleProp>`
  width: 100%;
  height: 100dvh;
  display: flex;
  flex-direction: ${({ $flexDirection }) => $flexDirection ?? "column"};
  justify-content: center;
  align-items: center;

  ${({ $style }) => $style}
`

const Divider = styled.div<{
  $size?: number
  $theme?: BodyThemeConfig
}>`
  width: 100%;
  border-bottom: ${({ $size = 1, $theme }) =>
    `${$size}px solid ${$theme?.borderColor ?? "black"}`};
`

export { Divider, Form, Item, Span, SubItem, Text, Wrapper }
