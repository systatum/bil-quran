import { IPCResponse, newErrIPCResponse, newIPCResponse } from "@constants/IPC"
import {
  WordOccurrence,
  WordRecord,
  WordWithLexemeRecord,
} from "@constants/records/WordRecord"
import { withDb } from "@db/driver"
import { and, asc, eq, gte, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"
import { conditional, Repository } from "./Repository"
import { lexemes, roots, words as schema } from "./tables"

class WordRepo extends Repository<typeof schema, WordRecord> {
  constructor() {
    super(schema)
  }

  async findOccurrences(
    lexemeId: number,
  ): Promise<IPCResponse<WordOccurrence[]>> {
    const targets = alias(schema, "targets")
    const contexts = alias(schema, "contexts")
    try {
      const rows = await withDb(async (db) =>
        db
          .select({
            chapterId: targets.chapterId,
            verse: targets.verse,
            targetOrder: targets.order,

            order: contexts.order,
            partNumber: contexts.partNumber,
            lexemeId: contexts.lexemeId,
            renderingId: contexts.renderingId,

            token: lexemes.token,
            readings: lexemes.readings,

            root: {
              id: roots.id,
              root: roots.root,
            },
          })
          .from(targets)
          .innerJoin(
            contexts,
            and(
              eq(contexts.chapterId, targets.chapterId),
              eq(contexts.verse, targets.verse),
              gte(contexts.order, sql<number>`${targets.order} - 7`), // start from 7 words before
            ),
          )
          .innerJoin(lexemes, eq(contexts.lexemeId, lexemes.id))
          .innerJoin(roots, eq(lexemes.rootId, roots.id))
          .where(eq(targets.lexemeId, lexemeId))
          .orderBy(
            targets.chapterId,
            targets.verse,
            targets.order,
            contexts.order,
          ),
      )

      const grouped: Record<string, WordOccurrence> = {}

      for (const row of rows) {
        const key = `${row.chapterId}:${row.verse}:${row.targetOrder}`

        grouped[key] ??= {
          chapterId: row.chapterId,
          verse: row.verse,
          targetOrder: row.targetOrder,
          words: [],
        }

        grouped[key].words.push({
          chapterId: row.chapterId,
          verse: row.verse,
          order: row.order,
          partNumber: row.partNumber,
          lexemeId: row.lexemeId,
          renderingId: row.renderingId,
          token: row.token,
          readings: row.readings,
          root: row.root,
          meanings: {},
        })
      }

      return newIPCResponse({
        data: Object.values(grouped),
      })
    } catch (e) {
      console.error("Occurrence search failed", e)
      return newErrIPCResponse(e)
    }
  }

  /**
   * Efficiently get all words data.
   */
  async all(chapterId?: number): Promise<IPCResponse<WordWithLexemeRecord[]>> {
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
            root: {
              id: roots.id,
              root: roots.root,
            },
            readings: lexemes.readings,
          })
          .from(schema)
          .innerJoin(lexemes, eq(schema.lexemeId, lexemes.id))
          .innerJoin(roots, eq(lexemes.rootId, roots.id))
          .where(
            and(
              ...conditional(chapterId, eq(schema.chapterId, chapterId ?? -1)),
            ),
          )
          .orderBy(asc(schema.chapterId), asc(schema.verse), asc(schema.order))
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
