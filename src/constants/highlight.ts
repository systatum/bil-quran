import { ThemeMode } from "./theme"

export enum HighlightColor {
  Primary = 1,
  Secondary = 2,
  Tertiary = 3,
}

export namespace HighlightColor {
  // Lighter shades in light mode, deeper/darker shades in dark mode so the
  // highlight stays legible against the verse text on either background.
  const HEX: Record<ThemeMode, Record<HighlightColor, string>> = {
    light: {
      [HighlightColor.Primary]: "#c8e6c9",
      [HighlightColor.Secondary]: "#fff3b0",
      [HighlightColor.Tertiary]: "#f9c6c6",
    },
    dark: {
      [HighlightColor.Primary]: "#2e4d32",
      [HighlightColor.Secondary]: "#5c4a12",
      [HighlightColor.Tertiary]: "#5c2323",
    },
  }

  /** @example HighlightColor.on(theme)[HighlightColor.Primary] */
  export function on(theme: ThemeMode): Record<HighlightColor, string> {
    return HEX[theme]
  }
}
