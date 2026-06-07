import { ChapterRecord } from "@constants/records/ChapterRecord"
import { LexemeRecord, NewLexemeRecord } from "@constants/records/LexemeRecord"
import { Rendering, RenderingRecord } from "@constants/records/RenderingRecord"
import { NewRootRecord, RootRecord } from "@constants/records/RootRecord"
import { WordRecord } from "@constants/records/WordRecord"
import { WordTranslationOption } from "@constants/records/WordTranslationRecord"
import { Locale } from "@constants/settings"
import { repo } from "@db/repo/index"
import { unpackIPC } from "@services/Converter"
import { FingerprintedAsset, saveFingerprints } from "@services/fingerprinter"
import LOGGER from "@services/Logger"
import { ensureHasTranslation } from "@services/translations"
import { persistDb } from "./driver"

// This module handle adding data to the database, especially
// for the very first time. This should only be called after
// the database is freshly created, and migration scripts
// are executed against it.

// seed the app with minimal data so that it can work
export async function seedData() {
  const hasAnyChapter = unpackIPC(await repo.chapters.count()) > 0
  if (hasAnyChapter) return LOGGER.debug("Skip seeding, chapters exist")

  const chapters = await seedChapters()
  await seedVerses(chapters)
  await seedWordTranslations()
  await persistDb()
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

  const BATCH_SIZE = 1000
  const name = Rendering.Imlaei

  // if there's already an Imlaei rendering, no need to add verses
  const existing = unpackIPC(await repo.renderings.findAllBy({ name }))
  if (existing.length === 1) return

  const rendering = unpackIPC(await repo.renderings.create({ name }))

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

  for (const v of verseWords) {
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
  }

  // ------------------------------------------------------------
  // bulk SELECT existing roots
  // ------------------------------------------------------------

  const rootTokens = Object.keys(uniqueRoots)
  const existingRoots = unpackIPC(
    await repo.roots.findAllBy({ roots: rootTokens }),
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
  }

  // ------------------------------------------------------------
  // attach resolved roots to lexemes
  // ------------------------------------------------------------

  for (const v of verseWords) {
    const lexeme = uniqueLexemes[v.word]

    if (lexeme.rootId !== 0) continue

    const root = rootCache[v.root]
    lexeme.rootId = root.id
    lexeme.root = root
  }

  // ------------------------------------------------------------
  // bulk SELECT existing lexemes
  // ------------------------------------------------------------

  const tokens = Object.keys(uniqueLexemes)
  const existingLexemes = unpackIPC(
    await repo.lexemes.findAllBy({ tokens: tokens }),
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
    const renderingId = rendering.id
    let batch: Partial<WordRecord>[] = []
    async function flush() {
      if (batch.length === 0) return
      await repo.words.createBulk(batch)
      batch = []
    }

    const orderMap: Record<string, number> = {}
    for (const v of verseWords) {
      const [, verse] = v.id.split(":").map(Number)
      const verseKey = v.id
      const order = (orderMap[verseKey] ?? 0) + 1
      orderMap[verseKey] = order
      const chapter = chapters[chapterId]
      const partNumber = chapter.partitioning.find(
        (p) => verse >= p.start && verse <= p.end,
      )!.part
      batch.push({
        chapterId,
        verse,
        lexemeId: lexemeCache[v.word].id,
        order,
        partNumber,
        renderingId,
      })

      if (batch.length >= BATCH_SIZE) await flush()
    }

    await flush()
    LOGGER.debug(`Done inserting chapter: ${chapterId} (${rendering.name})`)
  }

  await Promise.all(
    chapterWords.map((words, index) =>
      insertChapterWords(words, index + 1, chapters, lexemeCache, rendering),
    ),
  )
}

export async function seedWordTranslations() {
  await ensureHasTranslation(WordTranslationOption.AmericanEnglish)
}
