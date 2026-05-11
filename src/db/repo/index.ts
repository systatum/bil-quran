import { chapters } from "./chapters"
import { renderings } from "./renderings"
import { wbwTranslations } from "./wbwTranslations"
import { words } from "./words"

export const repo = {
  chapters,
  renderings,
  wbwTranslations,
  words,
}

export type IgnoredFields = "id" | "createdAt" | "updatedAt" | "lastUpdaterId"
