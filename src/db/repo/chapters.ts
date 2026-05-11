import { IPCResponse } from "@constants/IPC"
import { ChapterRecord } from "@constants/records/chapters"
import { withDb } from "@db/driver"
import { and, eq } from "drizzle-orm"
import { conditional, Repository } from "./repository"
import { chapters as schema } from "./tables"

class ChapterRepo extends Repository<typeof schema, ChapterRecord> {
  constructor() {
    super(schema)
  }

  findAllBy({ id }: { id: number }): Promise<IPCResponse<ChapterRecord[]>> {
    return withDb(
      async (db) =>
        await this.findBy(db, and(...conditional(id, eq(schema.id, id ?? -1)))),
    )
  }
}

export const chapters = new ChapterRepo()
