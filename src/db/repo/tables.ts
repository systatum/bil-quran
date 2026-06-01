import { ChapterPartDivision } from "@constants/records/ChapterRecord"
import { Locale } from "@constants/settings"
import {
  integer,
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

// a word that makes up a verse
export const words = table(
  "words",
  {
    chapterId: integer({ mode: "number" })
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    renderingId: integer({ mode: "number" })
      .notNull()
      .references(() => renderings.id, { onDelete: "cascade" }),
    lexemeId: integer({ mode: "number" })
      .notNull()
      .references(() => lexemes.id, { onDelete: "cascade" }),
    verse: integer().notNull(),
    order: integer().notNull(),
    partNumber: integer().notNull(),
  },
  (table) => [
    unique("surat_unique_word_rendering").on(
      table.chapterId,
      table.renderingId,
      table.lexemeId,
      table.verse,
      table.order,
    ),
  ],
)

export const word_translations = table(
  "word_translations",
  {
    locale: text({ length: 6 }).notNull(), // TODO: for space efficiency, use enum
    chapter: integer().notNull(),
    ayat: integer().notNull(),
    word: integer().notNull(),
    meaning: text({ length: 255 }).notNull(),
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
