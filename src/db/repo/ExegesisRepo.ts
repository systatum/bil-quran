import { IPCResponse } from "@constants/IPC"
import { ExegesisRecord } from "@constants/records/ExegesisRecord"
import { Locale } from "@constants/settings"
import { withDb } from "@db/driver"
import { unpackIPC } from "@services/Converter"
import { sql } from "drizzle-orm"
import { and, eq, like, or } from "drizzle-orm/sql/expressions/conditions"
import { exegesisContent } from "./ExegesisContentRepo"
import { conditional, Repository } from "./Repository"
import { exegesis as schema } from "./tables"

/**
 * Repository for Exegesis, which maintains tafsirs and commentaries of the
 * Holy Quran.
 */
class ExegesisRepo extends Repository<typeof schema, ExegesisRecord> {
  constructor() {
    super(schema)
  }

  /** Record that a chapter's verse content has been fully fetched and stored. */
  async markChapter(exegesisId: string, chapterId: number): Promise<void> {
    const [record] = unpackIPC(await this.findAllBy({ id: exegesisId }))
    const current = record?.downloadedChapters ?? []
    if (!current.includes(chapterId)) {
      await this.updateBy(schema.id, exegesisId, {
        downloadedChapters: [...current, chapterId],
      })
    }
  }

  /** Delete stored verse content for a chapter and remove it from the downloaded list. */
  async unmarkChapter(exegesisId: string, chapterId: number): Promise<void> {
    await exegesisContent.deleteChapter(exegesisId, chapterId)
    const [record] = unpackIPC(await this.findAllBy({ id: exegesisId }))
    if (record) {
      await this.updateBy(schema.id, exegesisId, {
        downloadedChapters: record.downloadedChapters.filter(
          (id) => id !== chapterId,
        ),
      })
    }
  }

  async findAllBy({
    id,
    name,
  }: {
    id?: string
    name?: string
  }): Promise<IPCResponse<ExegesisRecord[]>> {
    return withDb(
      async (db) =>
        await this.findBy(
          db,
          and(
            ...conditional(id, eq(schema.id, id ?? "")),
            ...conditional(
              name,
              or(
                eq(schema.oriName, name ?? ""),
                ...Object.values(Locale).map((locale) =>
                  like(
                    sql`json_extract(${schema.locNames}, ${`$.${locale}`})`,
                    `%${name ?? ""}%`,
                  ),
                ),
              ),
            ),
          ),
        ),
    )
  }
}

export const exegesis = new ExegesisRepo()
