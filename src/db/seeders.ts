import { Asset } from "@constants/assets"
import { ChapterRecord } from "@constants/records/chapters"
import { LexemeRecord } from "@constants/records/lexemes"
import { Rendering } from "@constants/records/renderings"
import { WbwTranslationRecord } from "@constants/records/wbwTranslations"
import { WordRecord } from "@constants/records/words"
import { repo } from "@db/repo/index"
import { unpackIPC } from "@services/Converter"
import { inArray } from "drizzle-orm"
import { withDb } from "./driver"

// seed the app with minimal data so that it can work
export async function seedData() {
  await seedChapters()
  await seedVerses()
  await seedWbwTranslations()
  console.debug("Return from seeding: done")
}

async function seedChapters() {
  const numberOfRecords = unpackIPC(await repo.chapters.count())
  console.debug("Number of registered chapters:", numberOfRecords)
  if (numberOfRecords > 0) return

  console.debug("Seeding chapters")
  const chaptersMetadata: ChapterRecord[] = await (
    await fetch(Asset.chaptersMetadata)
  ).json()
  for (const chapter of Object.entries(chaptersMetadata)) {
    const [number, detail] = chapter
    await repo.chapters.create({ ...detail, id: parseInt(number) })
  }
}

async function seedVerses() {
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
  // collect unique lexemes
  // ------------------------------------------------------------

  const uniqueLexemes: Record<string, Omit<LexemeRecord, "id">> = {}

  for (const v of verseWords)
    if (uniqueLexemes[v.word] == null)
      uniqueLexemes[v.word] = {
        token: v.word,
        root: v.root,
        enReading: v.trans,
      }

  const tokens = Object.keys(uniqueLexemes)

  // ------------------------------------------------------------
  // bulk SELECT existing lexemes
  // ------------------------------------------------------------

  const existingLexemes = await withDb(async (db) => {
    return await db
      .select()
      .from(repo.lexemes.schema)
      .where(inArray(repo.lexemes.schema.token, tokens))
  })

  // do not create any existing lexeme
  const lexemeCache: Record<string, LexemeRecord> = {}
  for (const lex of existingLexemes) {
    lexemeCache[lex.token] = lex as LexemeRecord
  }

  // push missing lexeme, before doing batch creation
  const missing: {
    token: string
    root: string
    enReading: string
  }[] = []

  for (const [token, lexeme] of Object.entries(uniqueLexemes))
    if (lexemeCache[token] == null) missing.push(lexeme)

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE)
    const created = unpackIPC(await repo.lexemes.createBulk(batch))
    for (const lex of created) lexemeCache[lex.token] = lex
  }

  // ------------------------------------------------------------
  // PASS 2
  // words insertion, streamed
  // ------------------------------------------------------------

  const orderMap = new Map<string, number>()
  let wordBatch: Partial<WordRecord>[] = []

  async function flushWords() {
    if (wordBatch.length === 0) return
    unpackIPC(await repo.words.createBulk(wordBatch))
    wordBatch = []
  }

  for (const v of verseWords) {
    const verseKey = v.id
    const [chapterId, verse] = verseKey.split(":")
    const order = (orderMap.get(verseKey) ?? 0) + 1
    orderMap.set(verseKey, order)

    const lexeme = lexemeCache[v.word]

    wordBatch.push({
      chapterId: parseInt(chapterId),
      verse: parseInt(verse),
      lexemeId: lexeme.id,
      order,
      renderingId: rendering.id,
      partNumber: 0,
    })

    if (wordBatch.length >= BATCH_SIZE) await flushWords()
  }

  await flushWords()
}

async function seedWbwTranslations() {
  const defaultLocale = "en-US"

  const locales = unpackIPC(
    await repo.wbwTranslations.findAllBy({
      locale: defaultLocale,
    }),
  )

  if (locales.length > 0) return

  console.debug("Seeding word-by-word translations")

  const translations: Record<string, string> = await (
    await fetch(Asset.translations.wordByWord[defaultLocale].path)
  ).json()

  const BATCH_SIZE = 1200

  let batch: Partial<WbwTranslationRecord>[] = []

  async function flushBatch() {
    if (batch.length === 0) return
    unpackIPC(await repo.wbwTranslations.createBulk(batch))
    batch = []
  }

  for (const [loc, meaning] of Object.entries(translations)) {
    // skip verse markers like "(1)"
    if (
      meaning.length >= 2 &&
      meaning[0] == "(" &&
      meaning[meaning.length - 1] == ")"
    )
      continue

    const [chapter, verse, word] = loc.split(":")
    batch.push({
      locale: defaultLocale,
      chapter: parseInt(chapter),
      ayat: parseInt(verse),
      word: parseInt(word),
      meaning,
    })

    if (batch.length >= BATCH_SIZE) await flushBatch()
  }

  await flushBatch()
}
