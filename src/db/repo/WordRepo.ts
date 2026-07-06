import { IPCResponse, newErrIPCResponse, newIPCResponse } from "@constants/IPC"
import {
  WordOccurrence,
  WordRecord,
  WordWithLexemeRecord,
} from "@constants/records/WordRecord"
import { withDb } from "@db/driver"
import { unpackIPC } from "@services/Converter"
import { and, eq, inArray } from "drizzle-orm"
import { conditional, Repository } from "./Repository"
import { lexemes, roots, words as schema } from "./tables"

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

        const lexemeList = await db
          .select({
            id: lexemes.id,
            token: lexemes.token,
            readings: lexemes.readings,
            root: { id: roots.id, root: roots.root },
          })
          .from(lexemes)
          .innerJoin(roots, eq(lexemes.rootId, roots.id))
          .where(inArray(lexemes.id, allIds))

        const lexemeMap = new Map(lexemeList.map((l) => [l.id, l]))

        const result: WordWithLexemeRecord[] = []
        for (const row of wordRows) {
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
