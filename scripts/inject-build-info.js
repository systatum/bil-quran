const fs = require("fs")
const path = require("path")

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/** Formats a Date as "2 Dec, 2026". */
function formatReleaseDate(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`
}

const { version } = require("../package.json")
const releaseDate = formatReleaseDate(new Date())
const buildInfo = { version, releaseDate }

const indexHtmlPath = path.join(__dirname, "../build/index.html")
const html = fs.readFileSync(indexHtmlPath, "utf-8")

const injected = html.replace(
  "<head>",
  `<head>\n    <script>window.__systatum_bilquran = ${JSON.stringify(buildInfo)};</script>`,
)

fs.writeFileSync(indexHtmlPath, injected)
console.log(`Injected build info into ${indexHtmlPath}:`, buildInfo)
