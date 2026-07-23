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
  bookmark: "bookmark",
  note: "note",
  highlight: "highlight",
  exegesis: "exegesis",
  about: "about",
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
  showPageIndicator: {
    title: "showPageIndicator.title",
    helper: "showPageIndicator.helper",
  },
  alphabeticalChaptersSorting: {
    title: "alphabeticalChaptersSorting.title",
    helper: "alphabeticalChaptersSorting.helper",
  },
  fontCategory: {
    shaddaStacked: "fontCategory.shaddaStacked",
    shaddaSeparable: "fontCategory.shaddaSeparable",
    helper: "fontCategory.helper",
  },
  fontOptions: {
    meQuranLearner: "fontOptions.meQuranLearner",
  },
  backup: {
    title: "backup.title",
    export: {
      title: "backup.export.title",
      description: "backup.export.description",
      copy: "backup.export.copy",
      download: "backup.export.download",
      copySuccess: "backup.export.copySuccess",
      copyFailed: "backup.export.copyFailed",
    },
    import: {
      title: "backup.import.title",
      description: "backup.import.description",
      import: "backup.import.import",
    },
  },
  searchSheet: {
    byChapter: "searchSheet.byChapter",
    byJuz: "searchSheet.byJuz",
    juz: "searchSheet.juz",
    pageAbbreviation: "searchSheet.pageAbbreviation",
  },
  dialog: {
    noteVerse: {
      title: "dialog.noteVerse.title",
      input: {
        placeholder: "dialog.noteVerse.input.placeholder",
      },
    },
    highlightVerse: {
      title: "dialog.highlightVerse.title",
      colorLabel: "dialog.highlightVerse.colorLabel",
    },
  },
  notice: {
    bookmark: {
      noDataYet: "notice.bookmark.noDataYet",
    },
  },
  highlightColor: {
    "1": "highlightColor.1",
    "2": "highlightColor.2",
    "3": "highlightColor.3",
  },
  highlightAction: "highlightAction",
  removeHighlight: "removeHighlight",
  errors: {
    bookmarkCreationFailed: "errors.bookmarkCreationFailed",
    bookmarkDataNotFound: "errors.bookmarkDataNotFound",
    bookmarkFetchFailed: "errors.bookmarkFetchFailed",
    highlightingFailed: "errors.highlightingFailed",
    verseNotFound: "errors.verseNotFound",
  },
} as const

export function isProperThemeValue(
  value: string,
): value is keyof typeof messages.theme {
  return value in messages.theme
}
