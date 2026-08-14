import { Asset } from "@constants/assets"
import { ChapterRecord } from "@constants/records/ChapterRecord"
import { LexemeRecord, NewLexemeRecord } from "@constants/records/LexemeRecord"
import { PaginationStyle } from "@constants/records/Pagination"
import { Rendering, RenderingRecord } from "@constants/records/RenderingRecord"
import { NewRootRecord, RootRecord } from "@constants/records/RootRecord"
import { WordRecord } from "@constants/records/WordRecord"
import { WordTranslationOption } from "@constants/records/WordTranslationRecord"
import { Locale } from "@constants/settings"
import { repo } from "@db/repo/index"
import { unpackIPC } from "@services/Converter"
import { FingerprintedAsset, saveFingerprints } from "@services/fingerprinter"
import LOGGER from "@services/Logger"
import { pause } from "@services/mutator"
import { ensureHasTranslation } from "@services/translations"
import { persistDb } from "./driver"

// sql.js runs SQLite synchronously on the main thread with no worker, so a
// long loop here blocks input/paint for its full duration. Yielding every
// YIELD_EVERY iterations keeps the app responsive while seeding runs.
const YIELD_EVERY = 2000
const BATCH_SIZE = 1000

/**
 * Runs `queryChunk` over `items` in BATCH_SIZE-sized pieces, yielding between
 * each. A single query with thousands of `IN (...)` params is one atomic
 * sql.js call that can't be interrupted, so the chunking has to happen here
 * rather than around the call.
 */
async function queryInChunks<TItem, TResult>(
  items: TItem[],
  queryChunk: (chunk: TItem[]) => Promise<TResult[]>,
): Promise<TResult[]> {
  const results: TResult[] = []
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    results.push(...(await queryChunk(items.slice(i, i + BATCH_SIZE))))
    await pause(0)
  }
  return results
}

// This module handle adding data to the database, especially
// for the very first time. This should only be called after
// the database is freshly created, and migration scripts
// are executed against it.

type SeedProgress = "verses" | "paginations"

// seed the app with minimal data so that it can work
export async function seedData(callback: (progress: SeedProgress) => void) {
  const hasAnyChapter = unpackIPC(await repo.chapters.count()) > 0
  const hasAnyWords = unpackIPC(await repo.words.count()) > 0
  const needVerseSeeding = !(hasAnyChapter && hasAnyWords)
  LOGGER.debug(
    `Has any chapter? ${hasAnyChapter}, any words? ${hasAnyWords} => ${needVerseSeeding}`,
  )

  if (needVerseSeeding) {
    callback("verses")
    const chapters = await seedChapters()
    await seedVerses(chapters)
    await seedWordTranslations()
    await persistDb()
  }

  callback("paginations")
  const seededPaginations = await seedPaginations()
  if (seededPaginations) await persistDb()
  saveFingerprints()
  LOGGER.debug("Return from seeding: done")
}

/**
 * Create chapters if they don't exist yet
 */
async function seedChapters(): Promise<Record<number, ChapterRecord>> {
  const asDict = (chapters: ChapterRecord[]) =>
    Object.fromEntries(chapters.map((c) => [c.id, c]))

  const existingChapters = unpackIPC(await repo.chapters.findAllBy({}))
  console.debug("Number of registered chapters:", existingChapters.length)
  if (existingChapters.length > 0) return asDict(existingChapters)

  console.debug("Seeding chapters")
  const chaptersMetadata =
    await FingerprintedAsset.Quran.getChaptersMetadata<
      Record<string, Omit<ChapterRecord, "id">>
    >()
  const newChapters: ChapterRecord[] = Object.entries(chaptersMetadata).map(
    ([number, detail]) => ({ ...detail, id: parseInt(number) }),
  )

  const createdChapters = unpackIPC(await repo.chapters.createBulk(newChapters))
  return asDict(createdChapters)
}

async function seedVerses(chapters: Record<number, ChapterRecord>) {
  interface VerseWord {
    id: string
    word: string
    trans: string
    root: string
  }

  const name = Rendering.Imlaei

  // if there's already an Imlaei rendering, no need to create a new one
  const existing = unpackIPC(await repo.renderings.findAllBy({ name }))
  const rendering =
    existing.length === 1
      ? existing[0]
      : unpackIPC(await repo.renderings.create({ name }))

  const chapterWords = await Promise.all(
    Array.from({ length: 114 }, (_, i) =>
      FingerprintedAsset.Quran.getVerseRendering<VerseWord[]>(
        rendering.name,
        i + 1,
      ),
    ),
  )
  const verseWords = chapterWords.flat()

  // ------------------------------------------------------------
  // PASS 1
  // collect unique roots + lexemes
  // ------------------------------------------------------------

  const uniqueRoots: Record<string, RootRecord | NewRootRecord> = {}
  const uniqueLexemes: Record<string, NewLexemeRecord> = {}

  for (let i = 0; i < verseWords.length; i++) {
    const v = verseWords[i]

    if (uniqueRoots[v.root] == null)
      uniqueRoots[v.root] = {
        root: v.root,
      }

    if (uniqueLexemes[v.word] == null)
      uniqueLexemes[v.word] = {
        token: v.word,
        readings: { [Locale.IntEnglish]: v.trans },

        // temporary placeholder
        rootId: 0,
        root: {} as RootRecord,
      }

    if (i % YIELD_EVERY === 0) await pause(0)
  }

  // ------------------------------------------------------------
  // bulk SELECT existing roots
  // ------------------------------------------------------------

  const rootTokens = Object.keys(uniqueRoots)
  const existingRoots = await queryInChunks(rootTokens, async (chunk) =>
    unpackIPC(await repo.roots.findAllBy({ roots: chunk })),
  )

  const rootCache: Record<string, RootRecord> = {}
  for (const root of existingRoots) rootCache[root.root] = root as RootRecord

  // ------------------------------------------------------------
  // create missing roots
  // ------------------------------------------------------------

  const missingRoots: NewRootRecord[] = []

  for (const root of rootTokens)
    if (rootCache[root] == null) missingRoots.push({ root })

  // create the root words in bulk
  LOGGER.debug(`${missingRoots.length} root words to create in batch`)
  for (let i = 0; i < missingRoots.length; i += BATCH_SIZE) {
    const batch = missingRoots.slice(i, i + BATCH_SIZE)
    const created = unpackIPC(await repo.roots.createBulk(batch))
    for (const root of created) rootCache[root.root] = root
    await pause(0)
  }

  // ------------------------------------------------------------
  // attach resolved roots to lexemes
  // ------------------------------------------------------------

  for (let i = 0; i < verseWords.length; i++) {
    const v = verseWords[i]
    const lexeme = uniqueLexemes[v.word]

    if (lexeme.rootId === 0) {
      const root = rootCache[v.root]
      lexeme.rootId = root.id
      lexeme.root = root
    }

    if (i % YIELD_EVERY === 0) await pause(0)
  }

  // ------------------------------------------------------------
  // bulk SELECT existing lexemes
  // ------------------------------------------------------------

  const tokens = Object.keys(uniqueLexemes)
  const existingLexemes = await queryInChunks(tokens, async (chunk) =>
    unpackIPC(await repo.lexemes.findAllBy({ tokens: chunk })),
  )

  const lexemeCache: Record<string, LexemeRecord> = {}
  for (const lex of existingLexemes)
    lexemeCache[lex.token] = lex as LexemeRecord

  // ------------------------------------------------------------
  // create missing lexemes
  // ------------------------------------------------------------

  const missingLexemes: NewLexemeRecord[] = []

  for (const [token, lexeme] of Object.entries(uniqueLexemes))
    if (lexemeCache[token] == null) missingLexemes.push(lexeme)

  for (let i = 0; i < missingLexemes.length; i += BATCH_SIZE) {
    const batch = missingLexemes.slice(i, i + BATCH_SIZE)
    const created = unpackIPC(await repo.lexemes.createBulk(batch))
    for (const lex of created) lexemeCache[lex.token] = lex
    await pause(0)
  }

  // ------------------------------------------------------------
  // PASS 2
  // insert words
  // ------------------------------------------------------------

  async function insertChapterWords(
    verseWords: VerseWord[],
    chapterId: number,
    chapters: Record<number, ChapterRecord>,
    lexemeCache: Record<string, LexemeRecord>,
    rendering: RenderingRecord,
  ) {
    // All 114 calls are fired synchronously via `.map()` below; yielding
    // first means each call suspends immediately instead of running its
    // synchronous verseMap-building work back-to-back with the other 113.
    await pause(0)

    LOGGER.debug(`Chapter ${chapterId}: ${verseWords.length} source words`)
    const renderingId = rendering.id
    const chapter = chapters[chapterId]

    // Group source words by verse, preserving encounter order as word order.
    const verseMap = new Map<
      number,
      { lexemeIds: number[]; partNumber: number }
    >()
    for (const v of verseWords) {
      const [, verse] = v.id.split(":").map(Number)
      if (!verseMap.has(verse)) {
        const partNumber = chapter.partitioning.find(
          (p) => verse >= p.start && verse <= p.end,
        )!.part
        verseMap.set(verse, { lexemeIds: [], partNumber })
      }
      verseMap.get(verse)!.lexemeIds.push(lexemeCache[v.word].id)
    }

    const records: Partial<WordRecord>[] = Array.from(verseMap.entries()).map(
      ([verse, { lexemeIds, partNumber }]) => ({
        chapterId,
        verse,
        lexemeIds,
        partNumber,
        renderingId,
      }),
    )

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const result = await repo.words.createBulk(
        records.slice(i, i + BATCH_SIZE),
      )
      if (!result.succeed) {
        console.error(`Failed inserting chapter ${chapterId}`, result.errors)
        throw new Error(`Failed inserting chapter ${chapterId}`)
      }
      await pause(0)
    }

    LOGGER.debug(
      `Done inserting chapter ${chapterId} (${rendering.name}), ${verseMap.size} verses`,
    )
  }

  await Promise.all(
    chapterWords.map((words, index) =>
      insertChapterWords(words, index + 1, chapters, lexemeCache, rendering),
    ),
  )

  const statsByChapter = await repo.words.raw(`
    SELECT
      chapter_id,
      MAX(verse) AS max_verse,
      COUNT(DISTINCT verse) AS verse_count,
      SUM(json_array_length(lexeme_ids)) AS word_count
    FROM words
    GROUP BY chapter_id
    ORDER BY chapter_id
  `)
  console.log("Chapter statistics", statsByChapter)
}

export async function seedWordTranslations() {
  await ensureHasTranslation(WordTranslationOption.AmericanEnglish)
}

/** Returns whether any pagination style was actually (re-)seeded. */
async function seedPaginations(): Promise<boolean> {
  LOGGER.debug("Seeding paginations")
  const pgStyles: PaginationStyle[] = Object.keys(Asset.paginationStyles)
  let seededAny = false

  for (const style of pgStyles) {
    const existings = unpackIPC(
      await repo.paginations.findAllBy({ name: style }),
    )
    if (existings.length > 0) continue

    try {
      const pages = await FingerprintedAsset.Quran.getPaginationStyle(style)
      await repo.paginations.create({ name: style, pages })
      seededAny = true
    } catch (e) {
      LOGGER.error(`Failed seeding pagination style ${style}`, e)
    }

    await pause(0)
  }

  return seededAny
}
