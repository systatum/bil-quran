import { Locale } from "@constants/locales"
import { ChapterPartDivision } from "@constants/records/chapters"
import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core"

export const chapters = pgTable("chapters", {
  // starts from 1, the number of the surat
  id: bigint({ mode: "number" }).primaryKey(),
  isMeccan: boolean().notNull(),
  partDivisions: jsonb().$type<ChapterPartDivision[]>().notNull(),
  // name of the chapters in arabic and other localities
  readings: jsonb().$type<Record<Locale, string>>().notNull().default({}),
  // the meaning of the chapter in various locales
  meanings: jsonb().$type<Record<Locale, string>>().notNull().default({}),
})

// quran has some "style" or "font" rendering ie ligatures
// etc; so we make sure that each entry use proper rendering
// habit or tradition (ie font size etc)
export const renderings = pgTable("renderings", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 20 }).notNull().unique(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
})

export const lexemes = pgTable("lexemes", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  token: varchar({ length: 25 }).notNull(),
  root: varchar({ length: 15 }).notNull(),
  readings: jsonb().$type<Record<Locale, string>>().notNull().default({}),
})

// a word that makes up a verse
export const words = pgTable(
  "words",
  {
    chapterId: bigint({ mode: "number" })
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    renderingId: bigint({ mode: "number" })
      .notNull()
      .references(() => renderings.id, { onDelete: "cascade" }),
    lexemeId: bigint({ mode: "number" })
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

export const wbwTranslations = pgTable(
  "word_by_word_translations",
  {
    locale: varchar({ length: 6 }).notNull(),
    chapter: integer().notNull(),
    ayat: integer().notNull(),
    word: integer().notNull(),
    meaning: varchar({ length: 255 }).notNull(),
  },
  (table) => [
    unique("unique_word_by_word_translation").on(
      table.locale,
      table.chapter,
      table.ayat,
      table.word,
    ),
  ],
)
