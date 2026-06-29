import { newIPCResponse, type IPCResponse } from "@constants/IPC"
import {
  TranslationCorpus,
  WordTranslationOption,
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
    locale?: WordTranslationOption
  }): Promise<IPCResponse<WordTranslationRecord[]>> {
    return withDb(
      async (db) =>
        await this.findBy(
          db,
          and(
            ...conditional(chapter, eq(schema.chapter, chapter ?? -1)),
            ...conditional(
              locale,
              eq(
                schema.locale,
                locale ? WordTranslationOption.toNumber(locale) : -1,
              ),
            ),
          ),
        ),
    )
  }

  /**
   * Compile the translation corpus into a dictionary where the translation
   * can be found by delving into the chapter, the verse, and then the position
   * of the word of which translation is wanted to be known.
   */
  async compile(
    locale: WordTranslationOption,
  ): Promise<IPCResponse<TranslationCorpus>> {
    let translations: TranslationCorpus = {}
    const records = unpackIPC(await this.findAllBy({ locale }))

    for (const record of records) {
      const { chapter, ayat, word } = record
      if (translations[chapter] == null) translations[chapter] = {}
      if (translations[chapter][ayat] == null) translations[chapter][ayat] = {}
      translations[chapter][ayat][word] = record.meaningSunni
    }

    return newIPCResponse({ succeed: true, data: translations })
  }
}

export const wbwTranslations = new WbwTranslationRepo()
