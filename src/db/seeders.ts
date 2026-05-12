import { Asset } from "@constants/assets"
import { ChapterRecord } from "@constants/records/chapters"
import { LexemeRecord } from "@constants/records/lexemes"
import { Rendering } from "@constants/records/renderings"
import { repo } from "@db/repo/index"
import { unpackIPC } from "@services/Converter"

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
  /**
   * Represents a word in a verse
   */
  interface VerseWord {
    id: string
    word: string
    trans: string
    root: string
  }

  const name = Rendering.Standard
  let renderings = unpackIPC(await repo.renderings.findAllBy({ name }))
  if (renderings.length === 1) return

  // create rendering and seed all the verses, creating lexeme along the way
  const rendering = unpackIPC(await repo.renderings.create({ name }))
  const verseWords: VerseWord[] = await (
    await fetch(Asset.renderings[rendering.name])
  ).json()
  const lexemes: Record<string, LexemeRecord> = {}

  console.debug("Seeding verses")
  let lastChapter = 0
  let lastVerse = 0
  let wordOrder = 0
  for (const verseWordRecord of verseWords) {
    let lexeme = lexemes[verseWordRecord.word]
    if (lexeme == null) {
      lexeme = unpackIPC(
        await repo.lexemes.findAllBy({ token: verseWordRecord.word }),
      )[0]
      if (lexeme == null) {
        lexeme = unpackIPC(
          await repo.lexemes.create({
            root: verseWordRecord.root,
            enReading: verseWordRecord.trans,
            token: verseWordRecord.word,
          }),
        )
      }

      // cache lexeme occurrence
      lexemes[lexeme.token] = lexeme
    }

    const [chapterNumber, verseNumber] = verseWordRecord.id
      .split(":")
      .map((x) => parseInt(x))
    if (chapterNumber > lastChapter) {
      console.debug("Processing chapter: ", chapterNumber)
      wordOrder = 0
      lastChapter = chapterNumber
    }
    if (verseNumber > lastVerse) {
      wordOrder = 0
      lastVerse = verseNumber
    }
    unpackIPC(
      await repo.words.create({
        chapterId: chapterNumber,
        verse: verseNumber,
        lexemeId: lexeme.id,
        order: wordOrder,
        renderingId: rendering.id,
        partNumber: 0, // TODO: set part number correctly
      }),
    )
    wordOrder++
  }
}

async function seedWbwTranslations() {
  const defaultLocale = "en-US"
  let locales = unpackIPC(
    await repo.wbwTranslations.findAllBy({ locale: defaultLocale }),
  )
  if (locales.length > 0) return

  console.debug("Seeding word-by-word translations")
  const translations: Record<string, string> = await (
    await fetch(Asset.translations.wordByWord[defaultLocale].path)
  ).json()
  for (const [loc, meaning] of Object.entries(translations)) {
    const [chapter, verse, word] = loc.split(":")
    unpackIPC(
      await repo.wbwTranslations.create({
        locale: defaultLocale,
        chapter: parseInt(chapter),
        ayat: parseInt(verse),
        word: parseInt(word),
        meaning: meaning,
      }),
    )
  }
}
