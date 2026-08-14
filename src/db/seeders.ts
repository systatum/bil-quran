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
import { pause, queryInChunks } from "@services/mutator"
import { ensureHasTranslation } from "@services/translations"
import { persistDb } from "./driver"

// sql.js runs SQLite synchronously on the main thread with no worker, so a
// long loop here blocks input/paint for its full duration. Yielding every
// YIELD_EVERY iterations keeps the app responsive while seeding runs.
const YIELD_EVERY = 2000
const BATCH_SIZE = 1000

// This module handle adding data to the database, especially
// for the very first time. This should only be called after
// the database is freshly created, and migration scripts
// are executed against it.

type SeedProgress = "verses" | "paginations"

/**
 * Seed the app with minimal data so that it can work. Seeds only
 * `priorityChapterId`'s verses before returning, so the caller can make the
 * app interactive without waiting for all 114 chapters; the remaining
 * chapters continue seeding in the background (not awaited here).
 *
 * `onChapterReady` fires once per chapter (priority chapter included) right
 * after its words are persisted, so the caller can merge them into UI state.
 */
export async function seedData(
  callback: (progress: SeedProgress) => void,
  priorityChapterId: number,
  onChapterReady: (chapterId: number) => void,
) {
  callback("verses")
  const chapters = await seedChapters()

  const totalChapters = Object.keys(chapters).length
  const seededChapterCount = await countSeededChapters()
  const needVerseSeeding = seededChapterCount < totalChapters
  LOGGER.debug(`Seeded chapters: ${seededChapterCount}/${totalChapters}`)

  if (needVerseSeeding) {
    const priorityWords = await fetchChapterVerseWords(priorityChapterId)
    await seedChapterVerses(priorityChapterId, chapters, priorityWords)
    onChapterReady(priorityChapterId)
    await persistDb()

    // Not awaited: the app becomes interactive once the priority chapter is
    // ready, and the rest seed in the background. Must stay sequential, never
    // Promise.all across chapters — seedChapterVerses's check-then-insert
    // pattern is only race-free when calls don't overlap.
    seedRemainingChapters(priorityChapterId, chapters, onChapterReady).catch(
      (e) => LOGGER.error("Failed seeding remaining chapters", e),
    )
  }

  callback("paginations")
  const seededPaginations = await seedPaginations()
  if (seededPaginations) await persistDb()
  saveFingerprints()
  LOGGER.debug("Return from seeding: done")
}

/**
 * Seeds every chapter except `priorityChapterId`, then the word-translation
 * corpus. Fetches all chapters' JSON concurrently (pure network I/O, safe to
 * parallelize) but writes to the DB one chapter at a time — seedChapterVerses's
 * check-then-insert pattern is only race-free when calls don't overlap.
 */
async function seedRemainingChapters(
  priorityChapterId: number,
  chapters: Record<number, ChapterRecord>,
  onChapterReady: (chapterId: number) => void,
): Promise<void> {
  const chapterIds = Object.keys(chapters)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((id) => id !== priorityChapterId)

  const fetched = await Promise.all(
    chapterIds.map(async (chapterId) => ({
      chapterId,
      verseWords: await fetchChapterVerseWords(chapterId),
    })),
  )

  for (const { chapterId, verseWords } of fetched) {
    await seedChapterVerses(chapterId, chapters, verseWords)
    onChapterReady(chapterId)
    await pause(0)
  }

  await seedWordTranslations()
  await persistDb()
  LOGGER.debug("Background chapter seeding complete")
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

/** How many distinct chapters currently have any seeded words. */
async function countSeededChapters(): Promise<number> {
  const rows = unpackIPC(
    await repo.words.raw<{ cnt: number }>(
      `SELECT COUNT(DISTINCT chapter_id) AS cnt FROM words`,
    ),
  )
  return rows[0]?.cnt ?? 0
}

async function chapterHasWords(chapterId: number): Promise<boolean> {
  const rows = unpackIPC(
    await repo.words.raw<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM words WHERE chapter_id = ${chapterId}`,
    ),
  )
  return (rows[0]?.cnt ?? 0) > 0
}

interface VerseWord {
  id: string
  word: string
  trans: string
  root: string
}

function fetchChapterVerseWords(chapterNumber: number): Promise<VerseWord[]> {
  return FingerprintedAsset.Quran.getVerseRendering<VerseWord[]>(
    Rendering.Imlaei,
    chapterNumber,
  )
}

/**
 * Seed one chapter's words (and any roots/lexemes it introduces). Idempotent
 * — a chapter that already has words is skipped, so this is safe to call
 * again for a chapter left over from an interrupted background seed.
 */
async function seedChapterVerses(
  chapterNumber: number,
  chapters: Record<number, ChapterRecord>,
  verseWords: VerseWord[],
): Promise<void> {
  if (verseWords.length === 0) return
  if (await chapterHasWords(chapterNumber)) return

  const name = Rendering.Imlaei
  const existingRendering = unpackIPC(await repo.renderings.findAllBy({ name }))
  const rendering =
    existingRendering.length === 1
      ? existingRendering[0]
      : unpackIPC(await repo.renderings.create({ name }))

  // ------------------------------------------------------------
  // PASS 1
  // collect unique roots + lexemes for this chapter
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
  const existingRoots = await queryInChunks(rootTokens, BATCH_SIZE, async (chunk) =>
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
  const existingLexemes = await queryInChunks(tokens, BATCH_SIZE, async (chunk) =>
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
  // insert this chapter's words
  // ------------------------------------------------------------

  await insertChapterWords(verseWords, chapterNumber, chapters, lexemeCache, rendering)
}

async function insertChapterWords(
  verseWords: VerseWord[],
  chapterId: number,
  chapters: Record<number, ChapterRecord>,
  lexemeCache: Record<string, LexemeRecord>,
  rendering: RenderingRecord,
) {
  LOGGER.debug(`Chapter ${chapterId}: ${verseWords.length} source words`)
  const renderingId = rendering.id
  const chapter = chapters[chapterId]

  // Group source words by verse, preserving encounter order as word order.
  const verseMap = new Map<
    number,
    { lexemeIds: number[]; partNumber: number }
  >()
  for (let i = 0; i < verseWords.length; i++) {
    const v = verseWords[i]
    const [, verse] = v.id.split(":").map(Number)
    if (!verseMap.has(verse)) {
      const partNumber = chapter.partitioning.find(
        (p) => verse >= p.start && verse <= p.end,
      )!.part
      verseMap.set(verse, { lexemeIds: [], partNumber })
    }
    verseMap.get(verse)!.lexemeIds.push(lexemeCache[v.word].id)

    if (i % YIELD_EVERY === 0) await pause(0)
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
