import { IPCResponse } from "@constants/IPC"
import { LexemeRecord } from "@constants/records/lexemes"
import { withDb } from "@db/driver"
import { and, eq } from "drizzle-orm"
import { conditional, Repository } from "./repository"
import { lexemes as schema } from "./tables"

class LexemeRepo extends Repository<typeof schema, LexemeRecord> {
  constructor() {
    super(schema)
  }

  async findAllBy({
    token,
  }: {
    token: string
  }): Promise<IPCResponse<LexemeRecord[]>> {
    return withDb(
      async (db) =>
        await this.findBy(
          db,
          and(...conditional(token, eq(schema.token, token ?? ""))),
        ),
    )
  }
}

export const lexemes = new LexemeRepo()
