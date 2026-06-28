import { chapters } from "./ChapterRepo"
import { lexemes } from "./LexemeRepo"
import { paginations } from "./PaginationRepo"
import { renderings } from "./RenderingRepo"
import { roots } from "./RootRepo"
import { words } from "./WordRepo"
import { wbwTranslations } from "./WordTranslationRepo"

export const repo = {
  chapters,
  lexemes,
  paginations,
  renderings,
  roots,
  wbwTranslations,
  words,
}

export type IgnoredFields = "id" | "createdAt" | "updatedAt" | "lastUpdaterId"
