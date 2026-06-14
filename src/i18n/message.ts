// This file defines typed localization keys, so components
// cannot refernece invalid translation keys. Withou this,
// translation drift becomes inevitable.

export const messages = {
  font: "font",
  lang: "lang",
  add: "add",
  cancel: "cancel",
  settings: "settings",
  bookmarks_and_notes: "bookmarks_and_notes",
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
  fontCategory: {
    shaddaStacked: "fontCategory.shaddaStacked",
    shaddaSeparable: "fontCategory.shaddaSeparable",
    helper: "fontCategory.helper",
  },
  fontOptions: {
    meQuranLearner: "fontOptions.meQuranLearner",
  },
  dialog: {
    noteVerse: {
      title: "dialog.noteVerse.title",
      input: {
        placeholder: "dialog.noteVerse.input.placeholder",
      },
    },
  },
  notice: {
    bookmark: {
      noDataYet: "notice.bookmark.noDataYet",
    },
  },
  tipMenu: {
    verseMarker: {
      bookmark: "tipMenu.verseMarker.bookmark",
      note: "tipMenu.verseMarker.note",
    },
  },
  errors: {
    bookmarkDataNotFound: "errors.bookmarkDataNotFound",
  },
} as const

export function isProperThemeValue(
  value: string,
): value is keyof typeof messages.theme {
  return value in messages.theme
}
