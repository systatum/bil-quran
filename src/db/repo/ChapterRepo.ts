import { IPCResponse } from "@constants/IPC"
import { ChapterRecord } from "@constants/records/ChapterRecord"
import { withDb } from "@db/driver"
import { and, eq } from "drizzle-orm"
import { conditional, Repository } from "./Repository"
import { chapters as schema } from "./tables"

/**
 * Repository for a chapter.
 */
class ChapterRepo extends Repository<typeof schema, ChapterRecord> {
  constructor() {
    super(schema)
  }

  findAllBy({
    id = undefined,
  }: {
    id?: number
  }): Promise<IPCResponse<ChapterRecord[]>> {
    return withDb(
      async (db) =>
        await this.findBy(db, and(...conditional(id, eq(schema.id, id ?? -1)))),
    )
  }
}

export const chapters = new ChapterRepo()
