import { type IPCResponse } from "@constants/IPC"
import { WbwTranslationRecord } from "@constants/records/wbwTranslations"
import { and, eq } from "drizzle-orm"
import { withDb } from "../driver"
import { conditional, Repository } from "./repository"
import { wbwTranslations as schema } from "./tables"

class WbwTranslationRepo extends Repository<
  typeof schema,
  WbwTranslationRecord
> {
  constructor() {
    super(schema)
  }

  async findAllBy({
    chapter = undefined,
    locale = undefined,
  }: {
    chapter?: number
    locale?: string
  }): Promise<IPCResponse<WbwTranslationRecord[]>> {
    return withDb(
      async (db) =>
        await this.findBy(
          db,
          and(
            ...conditional(chapter, eq(schema.chapter, chapter ?? -1)),
            ...conditional(locale, eq(schema.locale, locale ?? "")),
          ),
        ),
    )
  }
}

export const wbwTranslations = new WbwTranslationRepo()
