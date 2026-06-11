// This file defines typed localization keys, so components
// cannot refernece invalid translation keys. Withou this,
// translation drift becomes inevitable.

export const messages = {
  font: "font",
  lang: "lang",
  add: "add",
  cancel: "cancel",
  lookup: {
    title: "lookup.title",
    go: "lookup.go",
  },
  locale: {
    "ar-IQ": "locale.ar-IQ",
    "en-US": "locale.en-US",
    "id-ID": "locale.id-ID",
  },
  theme: {
    title: "theme.title",
    light: "theme.light",
    dark: "theme.dark",
  },
  basmalaPosition: {
    title: "basmalaPosition.title",
    "0": "basmalaPosition.0",
    "1": "basmalaPosition.1",
  },
  dialog: {
    noteVerse: {
      title: "dialog.noteVerse.title",
      input: {
        placeholder: "dialog.noteVerse.input.placeholder",
      },
    },
  },
} as const

export function isProperThemeValue(
  value: string,
): value is keyof typeof messages.theme {
  return value in messages.theme
}
