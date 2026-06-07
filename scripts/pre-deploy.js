const fs = require("fs")
const path = require("path")

/**
 * Copy important files ie the migration journal, the CNAME which is the barebone
 * of the site discovery in Github pages
 */
function copyImportantFiles() {
  function copy(source, destination, transform) {
    const raw = fs.readFileSync(source, "utf-8")
    const content = transform ? transform(raw) : raw
    fs.writeFileSync(destination, content)
    console.log(`Copied ${source} -> ${destination}`)
  }

  /*  this is done because otherwise github pages won't be able to read __meta.json
    as any file that starts with _ (underscore) is ignored causing 404 when reading
    that important file. this is jekyll behavior. */

  copy(
    path.join(__dirname, "../public/table_migrations/meta/_journal.json"),
    path.join(__dirname, "../build/table_migrations/meta/journal.json"),
    (originalContent) => {
      const parsed = JSON.parse(originalContent)
      const simplified = {
        entries: parsed.entries.map((entry) => ({
          tag: entry.tag,
        })),
      }

      return JSON.stringify(simplified, null, 2)
    },
  )

  // Second phase: copy CNAME (for Github)

  copy(path.join(__dirname, "../CNAME"), path.join(__dirname, "../build/CNAME"))
}

copyImportantFiles()
