import { IPCResponse } from "@constants/IPC"
import { LexemeRecord } from "@constants/records/LexemeRecord"
import { withDb } from "@db/driver"
import { and, eq } from "drizzle-orm"
import { conditional, Repository } from "./Repository"
import { lexemes as schema } from "./tables"

/**
 * A lexeme represents a unique word, and this repository handles
 * dealing with those lexemes.
 */
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
