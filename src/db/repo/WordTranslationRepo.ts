import { newIPCResponse, type IPCResponse } from "@constants/IPC"
import {
  TranslationCorpus,
  WordTranslationOption,
  WordTranslationRecord,
} from "@constants/records/WordTranslationRecord"
import { unpackIPC } from "@services/Converter"
import { pause } from "@services/mutator"
import { and, eq } from "drizzle-orm"
import { withDb } from "../driver"
import { conditional, Repository } from "./Repository"
import { wordTranslations as schema } from "./tables"

// The English corpus alone covers ~77k words, so building the nested lookup
// below without yielding blocks the main thread for seconds.
const YIELD_EVERY = 2000

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

    for (let i = 0; i < records.length; i++) {
      const { chapter, ayat, word } = records[i]
      if (translations[chapter] == null) translations[chapter] = {}
      if (translations[chapter][ayat] == null) translations[chapter][ayat] = {}
      translations[chapter][ayat][word] = records[i].meaningSunni

      if (i % YIELD_EVERY === 0) await pause(0)
    }

    return newIPCResponse({ succeed: true, data: translations })
  }
}

export const wbwTranslations = new WbwTranslationRepo()
