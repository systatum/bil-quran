// this script split all-in-one chapters file (ie imlaei.json)
// so that it becomes chapter-by-chapter.

const fs = require("fs/promises")
const path = require("path")

const INPUT_DIR = path.resolve(__dirname, "../public/quran/verses")

async function main() {
  const files = await fs.readdir(INPUT_DIR)

  const jsonFiles = files.filter((f) => f.endsWith(".json"))

  for (const filename of jsonFiles) {
    const inputPath = path.join(INPUT_DIR, filename)

    console.log(`Processing ${filename}...`)

    const content = await fs.readFile(inputPath, "utf8")
    const words = JSON.parse(content)

    // split chapter by chapter
    const chapters = {}
    for (const word of words) {
      const [chapter] = String(word.id).split(":")

      chapters[chapter] ??= []
      chapters[chapter].push(word)
    }

    // create the base output directory
    const outputDir = path.join(INPUT_DIR, path.basename(filename, ".json"))
    await fs.mkdir(outputDir, { recursive: true })

    // write the chapter one-by-one
    for (let chapter = 1; chapter <= 114; chapter++) {
      const records = chapters[String(chapter)] ?? []
      const outputPath = path.join(outputDir, `${chapter}.json`)
      await fs.writeFile(outputPath, JSON.stringify(records, null, 0), "utf8")
      console.log(`  -> written to: ${outputPath}`)
    }
  }

  console.log("Done")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
