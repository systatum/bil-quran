import { newIPCResponse, type IPCResponse } from "@constants/IPC"
import {
  ExegesisContentRecord,
  ExegesisVerseContent,
} from "@constants/records/ExegesisRecord"
import { withDb } from "@db/driver"
import { unpackIPC } from "@services/Converter"
import { and, eq, inArray } from "drizzle-orm"
import { conditional, Repository } from "./Repository"
import { exegesisContent as schema } from "./tables"

/**
 * Repository for exegesis verse content — the per-verse translations and
 * footnotes that back a given exegesis work and chapter.
 */
class ExegesisContentRepo extends Repository<
  typeof schema,
  ExegesisContentRecord
> {
  constructor() {
    super(schema)
  }

  /**
   * Return verse content for a chapter, keyed by verse number.
   * If `verses` is given, only those verse numbers are returned.
   */
  async findByChapter(
    exegesisId: string,
    chapterId: number,
    verses?: number[],
  ): Promise<IPCResponse<Record<number, ExegesisVerseContent>>> {
    return withDb(async (db) => {
      const rows = unpackIPC(
        await this.findBy(
          db,
          and(
            eq(schema.exegesisId, exegesisId),
            eq(schema.chapterId, chapterId),
            ...conditional(
              verses && verses.length > 0,
              inArray(schema.verseNumber, verses ?? []),
            ),
          ),
        ),
      )

      const result: Record<number, ExegesisVerseContent> = {}
      for (const row of rows) {
        result[row.verseNumber] = {
          translation: row.translation,
          exegesis: row.exegesis,
          footnotes: row.footnotes,
        }
      }

      return newIPCResponse({ data: result })
    })
  }

  /** Delete all verse rows for a given exegesis + chapter. */
  async deleteChapter(
    exegesisId: string,
    chapterId: number,
  ): Promise<IPCResponse<void>> {
    return withDb(async (db) => {
      await db
        .delete(schema)
        .where(
          and(
            eq(schema.exegesisId, exegesisId),
            eq(schema.chapterId, chapterId),
          ),
        )
      return newIPCResponse({ data: undefined })
    })
  }
}

export const exegesisContent = new ExegesisContentRepo()
