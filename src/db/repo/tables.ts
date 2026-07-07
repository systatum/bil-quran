import { ChapterPartDivision } from "@constants/records/ChapterRecord"
import { QuranPage } from "@constants/records/Pagination"
import { Locale } from "@constants/settings"
import {
  integer,
  primaryKey,
  sqliteTable as table,
  text,
  unique,
} from "drizzle-orm/sqlite-core"

export const chapters = table("chapters", {
  // starts from 1, the number of the surat
  id: integer({ mode: "number" }).primaryKey(),
  isMeccan: integer({ mode: "boolean" }).notNull(),
  partitioning: text({ mode: "json" }).$type<ChapterPartDivision[]>().notNull(),
  // name of the chapters in original arabic; mostly the same but some
  // countries might know of a chapter by a different name
  namings: text({ mode: "json" }).$type<Record<Locale, string>>().notNull(),
  transliterations: text({ mode: "json" })
    .$type<Record<Locale, string>>()
    .notNull(),
  // the meaning of the chapter in various locales
  meanings: text({ mode: "json" }).$type<Record<Locale, string>>().notNull(),
})

// quran has some "style" or "font" rendering ie ligatures
// etc; so we make sure that each entry use proper rendering
// habit or tradition (ie font size etc)
export const renderings = table("renderings", {
  id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text({ length: 20 }).notNull().unique(),
  createdAt: integer({ mode: "timestamp_ms" }).notNull(),
  updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
})

export const paginations = table("paginations", {
  id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text({ length: 20 }).notNull().unique(),
  pages: text({ mode: "json" }).$type<Array<QuranPage>>().notNull().default([]),
})

export const exegesis = table("exegesis", {
  // the folder name containing the exegesis
  id: text({ length: 15 }).notNull().primaryKey(),
  // the original name
  oriName: text({ length: 30 }).notNull().unique(),
  // local names
  locNames: text({ mode: "json" }).$type<Record<Locale, string>>().notNull(),
  // a short description
  description: text({ mode: "json" }).$type<Record<Locale, string>>().notNull(),
  author: text({ length: 30 }).notNull(),
  authorBio: text({ mode: "json" }).$type<Record<Locale, string>>().notNull(),
  // chapter IDs whose verse content has been fully fetched and stored locally
  downloadedChapters: text({ mode: "json" })
    .$type<number[]>()
    .notNull()
    .default([]),
})

export const exegesisContent = table(
  "exegesis_content",
  {
    exegesisId: text()
      .notNull()
      .references(() => exegesis.id, { onDelete: "cascade" }),
    chapterId: integer({ mode: "number" }).notNull(),
    verseNumber: integer({ mode: "number" }).notNull(),
    translation: text().notNull(),
    // footnote index → footnote text for this verse
    footnotes: text({ mode: "json" })
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
  },
  (t) => [primaryKey({ columns: [t.exegesisId, t.chapterId, t.verseNumber] })],
)

export const roots = table("roots", {
  id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  root: text({ length: 18 }).notNull(),
})

export const lexemes = table("lexemes", {
  id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  rootId: integer()
    .notNull()
    .references(() => roots.id, { onDelete: "cascade" }),
  token: text({ length: 25 }).notNull(),
  readings: text({ mode: "json" })
    .$type<Partial<Record<Locale, string>>>()
    .notNull()
    .default({}),
})

// representing sequence of word makeing up a verse
export const words = table(
  "words",
  {
    chapterId: integer({ mode: "number" })
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    renderingId: integer({ mode: "number" })
      .notNull()
      .references(() => renderings.id, { onDelete: "cascade" }),
    lexemeIds: text({ mode: "json" }).$type<number[]>().notNull().default([]),
    verse: integer().notNull(),
    partNumber: integer().notNull(),
  },
  (table) => [
    unique("surat_unique_word_rendering").on(
      table.chapterId,
      table.renderingId,
      table.verse,
    ),
  ],
)

export const wordTranslations = table(
  "word_translations",
  {
    locale: integer().notNull(),
    chapter: integer().notNull(),
    ayat: integer().notNull(),
    word: integer().notNull(),
    meaningSunni: text({ length: 255 }).notNull(),
    meaningShia: text({ length: 255 }),
  },
  (table) => [
    unique("unique_word_translation").on(
      table.locale,
      table.chapter,
      table.ayat,
      table.word,
    ),
  ],
)
