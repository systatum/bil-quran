import { and, eq } from "drizzle-orm"
import { WbwTranslationRecord } from "@constants/records/wbwTranslations"
import { conditional, Repository } from "./repository"
import { wbwTranslations as schema } from "./tables"
import { withDb } from "../driver"
import { type IPCResponse } from "@constants/IPC"

class WbwTranslationRepo extends Repository<
  typeof schema,
  WbwTranslationRecord
> {
  constructor() {
    super(schema)
  }

  async findAllBy({
    surat,
  }: {
    surat: number
  }): Promise<IPCResponse<WbwTranslationRecord[]>> {
    return withDb(
      async (db) =>
        await this.findBy(
          db,
          and(...conditional(surat, eq(schema.surat, surat ?? -1))),
        ),
    )
  }
}

export const wbwTranslations = new WbwTranslationRepo()
