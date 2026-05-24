import { newIPCResponse, type IPCResponse } from "@constants/IPC"
import {
  WordTranslation,
  WordTranslationRecord,
} from "@constants/records/WordTranslationRecord"
import { unpackIPC } from "@services/Converter"
import { and, eq } from "drizzle-orm"
import { withDb } from "../driver"
import { conditional, Repository } from "./Repository"
import { word_translations as schema } from "./tables"

class WbwTranslationRepo extends Repository<
  typeof schema,
  WordTranslationRecord
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
  }): Promise<IPCResponse<WordTranslationRecord[]>> {
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

  async compile(locale: string): Promise<IPCResponse<WordTranslation>> {
    let translations: WordTranslation = {}
    const records = unpackIPC(await this.findAllBy({ locale: locale }))

    for (const record of records) {
      const { chapter, ayat, word } = record
      if (translations[chapter] == null) translations[chapter] = {}
      if (translations[chapter][ayat] == null) translations[chapter][ayat] = {}
      translations[chapter][ayat][word] = record.meaning
    }

    return newIPCResponse({ succeed: true, data: translations })
  }
}

export const wbwTranslations = new WbwTranslationRepo()
