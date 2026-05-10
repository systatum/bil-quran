const fs = require("fs")
const path = require("path")

/*  this is done because otherwise github pages won't be able to read __meta.json
    as any file that starts with _ (underscore) is ignored causing 404 when reading
    that important file. this is jekyll behavior. */

const sourcePath = path.join(
  __dirname,
  "../public/table_migrations/meta/_journal.json",
)

const targetPath = path.join(
  __dirname,
  "../public/table_migrations/meta/journal.json",
)

const raw = fs.readFileSync(sourcePath, "utf-8")

const parsed = JSON.parse(raw)

const simplified = {
  entries: parsed.entries.map((entry) => ({
    tag: entry.tag,
  })),
}

fs.writeFileSync(targetPath, JSON.stringify(simplified, null, 2))

console.log("Prepared simplified journal.json")
