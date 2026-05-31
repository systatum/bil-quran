import { Asset } from "@constants/assets"
import { ChapterRecord } from "@constants/records/ChapterRecord"
import { LexemeRecord, NewLexemeRecord } from "@constants/records/LexemeRecord"
import { Rendering } from "@constants/records/RenderingRecord"
import { NewRootRecord, RootRecord } from "@constants/records/RootRecord"
import { WordRecord } from "@constants/records/WordRecord"
import { WordTranslationOption } from "@constants/records/WordTranslationRecord"
import { Locale } from "@constants/settings"
import { repo } from "@db/repo/index"
import { unpackIPC } from "@services/Converter"
import LOGGER from "@services/Logger"
import { ensureHasTranslation } from "@services/translations"

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
  const chaptersMetadata: ChapterRecord[] = await (
    await fetch(Asset.chaptersMetadata)
  ).json()
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
  const name = Rendering.Standard

  // if there's already a standard rendering, no need to add verses
  const existing = unpackIPC(await repo.renderings.findAllBy({ name }))
  if (existing.length === 1) return

  const rendering = unpackIPC(await repo.renderings.create({ name }))

  const verseWords: VerseWord[] = await (
    await fetch(Asset.renderings[rendering.name])
  ).json()

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

  const orderMap: Record<string, number> = {}
  let wordBatch: Partial<WordRecord>[] = []

  async function flushWords() {
    if (wordBatch.length === 0) return
    unpackIPC(await repo.words.createBulk(wordBatch))
    wordBatch = []
  }

  for (const v of verseWords) {
    const verseKey = v.id
    const [chapterId, verse] = verseKey.split(":").map(Number)
    const order = (orderMap[verseKey] ?? 0) + 1
    orderMap[verseKey] = order

    const chapter = chapters[chapterId]
    const lexeme = lexemeCache[v.word]
    const partNumber = chapter.partitioning.find(
      (p) => verse >= p.start && verse <= p.end,
    )!.part

    wordBatch.push({
      chapterId: chapterId,
      verse: verse,
      lexemeId: lexeme.id,
      order,
      partNumber,
      renderingId: rendering.id,
    })

    if (wordBatch.length >= BATCH_SIZE) await flushWords()
  }

  await flushWords()
}

export async function seedWordTranslations() {
  await ensureHasTranslation(WordTranslationOption.AmericanEnglish)
}
