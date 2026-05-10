import { pgTable, varchar, integer, unique } from "drizzle-orm/pg-core"

export const wbwTranslations = pgTable(
  "word_by_word_translations",
  {
    locale: varchar({ length: 6 }).notNull(),
    surat: integer().notNull(),
    ayat: integer().notNull(),
    word: integer().notNull(),
    meaning: varchar({ length: 255 }).notNull(),
  },
  (table) => ({
    suratAyatWordUnique: unique("unique_word_by_word_translation").on(
      table.locale,
      table.surat,
      table.ayat,
      table.word,
    ),
  }),
)
