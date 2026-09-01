import { IPCResponse, newErrIPCResponse, newIPCResponse } from "@constants/IPC"
import {
  WordOccurrence,
  WordRecord,
  WordWithLexemeRecord,
} from "@constants/records/WordRecord"
import { withDb } from "@db/driver"
import { unpackIPC } from "@services/Converter"
import { pause, queryInChunks } from "@services/mutator"
import { and, eq, inArray } from "drizzle-orm"
import { conditional, Repository } from "./Repository"
import { lexemes, roots, words as schema } from "./tables"

// sql.js runs SQLite synchronously on the main thread with no worker, so a
// long loop or a query with thousands of `IN (...)` params blocks input and
// paint for its full duration.
//
// Yielding is row-based here (one `words` row per verse, ~12 lexemeIds each)
// rather than word-based, so the threshold is lower than seedVerses()'s
// per-word YIELD_EVERY to land on a similar number of words between yields.
const ROW_YIELD_EVERY = 200
const QUERY_CHUNK_SIZE = 1000

class WordRepo extends Repository<typeof schema, WordRecord> {
  constructor() {
    super(schema)
  }

  async findOccurrences(
    lexemeId: number,
  ): Promise<IPCResponse<WordOccurrence[]>> {
    type MatchRow = {
      chapterId: number
      verse: number
      lexemeIds: string
      partNumber: number
      renderingId: number
      targetIdx: number
    }

    try {
      // json_each exposes each array element; key is the 0-based index.
      const matchRows = unpackIPC(
        await this.raw<MatchRow>(`
          SELECT w.chapter_id     AS chapterId,
                 w.verse,
                 w.lexeme_ids     AS lexemeIds,
                 w.part_number    AS partNumber,
                 w.rendering_id   AS renderingId,
                 CAST(j.key AS INTEGER) AS targetIdx
          FROM words w, json_each(w.lexeme_ids) j
          WHERE CAST(j.value AS INTEGER) = ${lexemeId}
          ORDER BY w.chapter_id, w.verse, CAST(j.key AS INTEGER)
        `),
      )

      if (matchRows.length === 0) return newIPCResponse({ data: [] })

      const CONTEXT_BEFORE = 7
      const allNeededIds = new Set<number>()

      type ContextEntry = {
        chapterId: number
        verse: number
        partNumber: number
        renderingId: number
        lexemeIds: number[]
        targetIdx: number
        start: number
      }

      const contextEntries: ContextEntry[] = matchRows.map((row) => {
        const allIds: number[] = JSON.parse(row.lexemeIds)
        const start = Math.max(0, row.targetIdx - CONTEXT_BEFORE)
        allIds.slice(start).forEach((id) => allNeededIds.add(id))
        return {
          chapterId: row.chapterId,
          verse: row.verse,
          partNumber: row.partNumber,
          renderingId: row.renderingId,
          lexemeIds: allIds,
          targetIdx: row.targetIdx,
          start,
        }
      })

      const lexemeList = await withDb((db) =>
        db
          .select({
            id: lexemes.id,
            token: lexemes.token,
            readings: lexemes.readings,
            root: { id: roots.id, root: roots.root },
          })
          .from(lexemes)
          .innerJoin(roots, eq(lexemes.rootId, roots.id))
          .where(inArray(lexemes.id, Array.from(allNeededIds))),
      )

      const lexemeMap = new Map(lexemeList.map((l) => [l.id, l]))

      const grouped: Record<string, WordOccurrence> = {}

      for (const ctx of contextEntries) {
        const {
          chapterId,
          verse,
          partNumber,
          renderingId,
          lexemeIds,
          targetIdx,
          start,
        } = ctx
        const targetOrder = targetIdx + 1
        const key = `${chapterId}:${verse}:${targetOrder}`
        if (grouped[key]) continue

        grouped[key] = {
          chapterId,
          verse,
          targetOrder,
          words: lexemeIds
            .slice(start)
            .map((id, i) => {
              const lex = lexemeMap.get(id)
              if (!lex) return null
              return {
                chapterId,
                verse,
                order: start + i + 1,
                partNumber,
                lexemeId: id,
                renderingId,
                token: lex.token,
                root: lex.root,
                readings: lex.readings,
                meanings: {},
              }
            })
            .filter(Boolean) as WordOccurrence["words"],
        }
      }

      return newIPCResponse({ data: Object.values(grouped) })
    } catch (e) {
      console.error("Occurrence search failed", e)
      return newErrIPCResponse(e)
    }
  }

  /** Fetch all words, expanding each verse's lexemeIds array into individual records. */
  async all({
    chapterId,
    verseId,
  }: {
    chapterId?: number
    verseId?: number
  }): Promise<IPCResponse<WordWithLexemeRecord[]>> {
    try {
      return await withDb(async (db) => {
        const wordRowsResp = await this.findBy(
          db,
          and(
            ...conditional(chapterId, eq(schema.chapterId, chapterId ?? -1)),
            ...conditional(verseId, eq(schema.verse, verseId ?? -1)),
          ),
          { chapterId: "asc", verse: "asc" },
        )
        const wordRows = unpackIPC(wordRowsResp)

        if (wordRows.length === 0) return newIPCResponse({ data: [] })

        const allIds = Array.from(
          new Set(wordRows.flatMap((r) => r.lexemeIds)),
        )
        if (allIds.length === 0) return newIPCResponse({ data: [] })

        const lexemeList = await queryInChunks(
          allIds,
          QUERY_CHUNK_SIZE,
          async (chunk) =>
            db
              .select({
                id: lexemes.id,
                token: lexemes.token,
                readings: lexemes.readings,
                root: { id: roots.id, root: roots.root },
              })
              .from(lexemes)
              .innerJoin(roots, eq(lexemes.rootId, roots.id))
              .where(inArray(lexemes.id, chunk)),
        )

        const lexemeMap = new Map(lexemeList.map((l) => [l.id, l]))

        const result: WordWithLexemeRecord[] = []
        for (let i = 0; i < wordRows.length; i++) {
          const row = wordRows[i]
          row.lexemeIds.forEach((id, idx) => {
            const lex = lexemeMap.get(id)
            if (!lex) return
            result.push({
              chapterId: row.chapterId,
              verse: row.verse,
              order: idx + 1,
              partNumber: row.partNumber,
              lexemeId: id,
              renderingId: row.renderingId,
              token: lex.token,
              root: lex.root,
              readings: lex.readings,
            })
          })

          if (i % ROW_YIELD_EVERY === 0) await pause(0)
        }

        return newIPCResponse({ data: result })
      })
    } catch (e) {
      console.error("Record fetching failed", e)
      return newErrIPCResponse(e)
    }
  }
}

export const words = new WordRepo()
