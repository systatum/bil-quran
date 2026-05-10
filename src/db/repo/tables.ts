import {
  pgTable,
  varchar,
  integer,
  bigint,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

export const chapters = pgTable("chapters", {
  // starts from 1, the number of the surat
  id: bigint({ mode: "number" }).primaryKey(),
  // name transliterated from the original arabic
  ar: varchar({ length: 20 }).notNull(),
  // name transliterated in English
  en: varchar({ length: 15 }).notNull(),
  // the meaning of the chapter
  enMeaning: varchar({ length: 35 }).notNull(),
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

// a word that makes up a verse
export const word = pgTable(
  "words",
  {
    chapterId: bigint({ mode: "number " })
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    renderingId: bigint({ mode: "number" })
      .notNull()
      .references(() => renderings.id, { onDelete: "cascade" }),
    verse: integer().notNull(),
    word: varchar({ length: 13 }),
  },
  (table) => ({
    suratUniqueWordRendering: unique("surat_unique_word_rendering").on(
      table.chapterId,
      table.renderingId,
      table.verse,
    ),
  }),
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
  (table) => ({
    suratAyatWordUnique: unique("unique_word_by_word_translation").on(
      table.locale,
      table.chapter,
      table.ayat,
      table.word,
    ),
  }),
)
