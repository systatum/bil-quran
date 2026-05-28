import { IPCResponse } from "@constants/IPC"
import { LexemeRecord } from "@constants/records/LexemeRecord"
import { withDb } from "@db/driver"
import { and, eq, inArray } from "drizzle-orm"
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

  /**
   * Find lexemes.
   * - if token is provided, will find one matching token
   * - if tokens[] is provided, will find those tokens
   */
  async findAllBy({
    token,
    tokens = [],
  }: {
    token?: string
    tokens?: string[]
  }): Promise<IPCResponse<LexemeRecord[]>> {
    return withDb(
      async (db) =>
        await this.findBy(
          db,
          and(
            ...conditional(token, eq(schema.token, token ?? "")),
            ...conditional(tokens.length > 0, inArray(schema.token, tokens)),
          ),
        ),
    )
  }
}

export const lexemes = new LexemeRepo()
