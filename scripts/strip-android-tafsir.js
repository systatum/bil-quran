const fs = require("fs")
const path = require("path")

/**
 * build/tafsir is SSG output for web deep-link previews only (~300MB+).
 * cap sync copies the whole webDir into android assets with no exclude option,
 * so this bloats the AAB/APK unless we prune it right after every sync.
 */
function stripAndroidTafsir() {
  const target = path.join(__dirname, "../android/app/src/main/assets/public/tafsir")

  if (!fs.existsSync(target)) {
    console.log(`No tafsir folder found at ${target}, nothing to strip`)
    return
  }

  fs.rmSync(target, { recursive: true, force: true })
  console.log(`Removed ${target} from android assets`)
}

stripAndroidTafsir()
