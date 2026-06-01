const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

const quranDir = path.join(__dirname, "../public/quran")
const outputFile = path.join(quranDir, "fingerprints.json")
const fingerprints = {}

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })

  entries
    .sort((first, second) => first.name.localeCompare(second.name))
    .forEach((entry) => {
      const filePath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        walk(filePath)
        return
      }

      if (!entry.isFile() || filePath === outputFile) {
        return
      }

      const assetPath = path
        .relative(quranDir, filePath)
        .split(path.sep)
        .join("/")
      const checksum = crypto
        .createHash("md5")
        .update(fs.readFileSync(filePath))
        .digest("hex")

      fingerprints[assetPath] = checksum
    })
}

walk(quranDir)
fs.writeFileSync(outputFile, JSON.stringify(fingerprints, null, 2))
console.log(
  `Fingerprinted ${Object.keys(fingerprints).length} files, saved to: ${outputFile}`,
)
