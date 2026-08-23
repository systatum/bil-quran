// Rebuilds public/quran/paginations/madinah.json from the source markup in
// scripts/assets/madinah.html (custom <jz>/<ch>/<v>/<pg> tags marking juz,
// chapter, verse, and page boundaries).
//
// Usage: node scripts/paginator.js [sourceHtmlPath] [outputJsonPath]

const fs = require("fs")
const path = require("path")
const cheerio = require("cheerio")

const sourcePath = path.resolve(
  process.argv[2] ?? path.join(__dirname, "assets/madinah.html"),
)
const outputPath = path.resolve(
  process.argv[3] ??
    path.join(__dirname, "../public/quran/paginations/madinah.json"),
)

// Convert Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) to Western numerals (0123456789)
const arabicToWestern = (str) => {
  const map = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  }

  return str.replace(/[٠-٩]/g, (d) => map[d])
}

// Extract the final Arabic number from a verse
// Example:
// "... الرَّحِيمِ ٧" => 7
const extractVerseNumber = (text) => {
  const match = text.trim().match(/([٠-٩]+)\s*$/)

  if (!match) {
    return null
  }

  return parseInt(arabicToWestern(match[1]), 10)
}

// Extract the number from a <jz> tag
// Example:
// "جُزْءْ - ٢" => 2
const extractJuzNumber = (text) => {
  const western = arabicToWestern(text)
  const match = western.match(/\d+/)

  return match ? parseInt(match[0], 10) : null
}

function paginate($) {
  const pages = []

  // Current juz (part)
  let currentPart = 1

  // Internal chapter numbering starts from 1
  let currentChapterId = 0

  // Used to detect whether a <ch> is really a new chapter
  let currentChapterName = null

  // Current page being built
  let currentPage = {
    part: null,
    chapterIds: [],
    verseNumbers: [],
  }

  // Current chapter inside the page
  let currentPageChapterId = null

  // Current chapter's verse range within the page
  let currentVerseStart = null
  let currentVerseEnd = null

  // Iterate through every element in document order
  $("body *").each((_, node) => {
    const tag = node.tagName
    const text = $(node).text().trim()

    // -----------------------------------
    // JUZ
    // -----------------------------------
    if (tag === "jz") {
      const part = extractJuzNumber(text)

      if (part !== null) {
        currentPart = part
      }
    }

    // -----------------------------------
    // CHAPTER
    // -----------------------------------
    else if (tag === "ch") {
      // If we were already collecting verses for another chapter
      // on the same page, save its range first.
      if (currentPageChapterId !== null && currentVerseStart !== null) {
        currentPage.chapterIds.push(currentPageChapterId)
        currentPage.verseNumbers.push([currentVerseStart, currentVerseEnd])
      }

      // Same chapter as previous page?
      // Don't increment chapter ID.
      if (text !== currentChapterName) {
        currentChapterId++
        currentChapterName = text
      }

      currentPageChapterId = currentChapterId

      // Reset verse range for this chapter
      currentVerseStart = null
      currentVerseEnd = null
    }

    // -----------------------------------
    // VERSE
    // -----------------------------------
    else if (tag === "v") {
      const verseNumber = extractVerseNumber(text)

      if (verseNumber === null) {
        return
      }

      // Some pages may begin with verses without repeating <ch>.
      // In that case, continue using the previous chapter.
      if (currentPageChapterId === null) {
        currentPageChapterId = currentChapterId
      }

      if (currentVerseStart === null) {
        currentVerseStart = verseNumber
      }

      currentVerseEnd = verseNumber
    }

    // -----------------------------------
    // PAGE END
    // -----------------------------------
    else if (tag === "pg") {
      // Save current chapter range to page
      if (currentPageChapterId !== null && currentVerseStart !== null) {
        currentPage.chapterIds.push(currentPageChapterId)
        currentPage.verseNumbers.push([currentVerseStart, currentVerseEnd])
      }

      // Assign current juz
      currentPage.part = currentPart

      // Store page
      pages.push(currentPage)

      // Create a new page
      currentPage = {
        part: null,
        chapterIds: [],
        verseNumbers: [],
      }

      // Preserve chapter for the next page
      // because pages usually continue the same chapter.
      currentVerseStart = null
      currentVerseEnd = null
    }
  })

  return pages
}

const html = fs.readFileSync(sourcePath, "utf-8")
const $ = cheerio.load(html)
const pages = paginate($)

fs.writeFileSync(outputPath, JSON.stringify(pages, null) + "\n")
console.log(`Wrote ${pages.length} pages to ${outputPath}`)
