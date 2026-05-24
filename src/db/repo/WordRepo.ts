import { IPCResponse, newErrIPCResponse, newIPCResponse } from "@constants/IPC"
import { WordRecord, WordWithLexemeRecord } from "@constants/records/WordRecord"
import { withDb } from "@db/driver"
import { and, eq } from "drizzle-orm"
import { conditional, Repository } from "./Repository"
import { lexemes, words as schema } from "./tables"

class WordRepo extends Repository<typeof schema, WordRecord> {
  constructor() {
    super(schema)
  }

  async findAllBy({
    chapterId = undefined,
  }: {
    chapterId?: number
  } = {}): Promise<IPCResponse<WordWithLexemeRecord[]>> {
    try {
      const rows = await withDb(async (db) => {
        return await db
          .select({
            chapterId: schema.chapterId,
            verse: schema.verse,
            order: schema.order,
            partNumber: schema.partNumber,
            lexemeId: schema.lexemeId,
            renderingId: schema.renderingId,
            token: lexemes.token,
            root: lexemes.root,
            readings: lexemes.readings,
          })
          .from(schema)
          .innerJoin(lexemes, eq(schema.lexemeId, lexemes.id))
          .where(
            and(
              ...conditional(chapterId, eq(schema.chapterId, chapterId ?? -1)),
            ),
          )
      })

      return newIPCResponse({
        data: rows as WordWithLexemeRecord[],
      })
    } catch (e) {
      console.error("Record fetching failed", e)
      return newErrIPCResponse(e)
    }
  }
}

export const words = new WordRepo()
