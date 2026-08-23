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
  about: {
    title: "about.title",
    version: "about.version",
    source: "about.source",
    released: "about.released",
  },
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
  readingStyle: {
    title: "readingStyle.title",
    det: "readingStyle.det",
    "st-mono": "readingStyle.st-mono",
    "st-dual": "readingStyle.st-dual",
    dualUnavailableTitle: "readingStyle.dualUnavailableTitle",
    dualUnavailableMessage: "readingStyle.dualUnavailableMessage",
  },
  showPageIndicator: {
    title: "showPageIndicator.title",
    helper: "showPageIndicator.helper",
  },
  alphabeticalChaptersSorting: {
    title: "alphabeticalChaptersSorting.title",
    helper: "alphabeticalChaptersSorting.helper",
  },
  showTransliteration: {
    title: "showTransliteration.title",
    helper: "showTransliteration.helper",
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
      selectFile: "backup.import.selectFile",
      invalid: "backup.import.invalid",
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
  thoughtSchool: {
    "100": "thoughtSchool.100",
    "200": "thoughtSchool.200",
    "210": "thoughtSchool.210",
    "220": "thoughtSchool.220",
  },
  sajdah: {
    title: "sajdah.title",
    wajib: "sajdah.wajib",
    mustahab: "sajdah.mustahab",
    about: {
      entryTitle: "sajdah.about.entryTitle",
      desc: {
        general: "sajdah.about.desc.general",
        generalSunni: "sajdah.about.desc.generalSunni",
        generalShia: "sajdah.about.desc.generalShia",
      },
    },
  },
  privacyPolicy: {
    title: "privacyPolicy.title",
  },
  contributors: {
    title: "contributors.title",
  },
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
