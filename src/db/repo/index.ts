import { chapters } from "./chapters"
import { lexemes } from "./lexemes"
import { renderings } from "./renderings"
import { wbwTranslations } from "./wbwTranslations"
import { words } from "./words"

export const repo = {
  chapters,
  lexemes,
  renderings,
  wbwTranslations,
  words,
}

export type IgnoredFields = "id" | "createdAt" | "updatedAt" | "lastUpdaterId"
