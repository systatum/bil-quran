import { chapters } from "./ChapterRepo"
import { lexemes } from "./LexemeRepo"
import { renderings } from "./RenderingRepo"
import { words } from "./WordRepo"
import { wbwTranslations } from "./WordTranslationRepo"

export const repo = {
  chapters,
  lexemes,
  renderings,
  wbwTranslations,
  words,
}

export type IgnoredFields = "id" | "createdAt" | "updatedAt" | "lastUpdaterId"
