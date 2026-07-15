import { marked } from "marked"

/**
 * Some source texts embed a blank line inside what should be a single list
 * item. And unfortunately, we didn't indent the 2nd paragraph belonging to
 * the continued line. Per CommonMark, a blank line not indented to the item's
 * content column ends the list, and a subsequent item marker that doesn't
 * start at 1 can't reopen it, so it falls back to plain, unindented text
 * instead of continuing the list.
 */
export function preserveListContinuations(markdown: string): string {
  const lines = markdown.split("\n")
  const listMarkerRe = /^\s*(?:[-*+]|\d+[.)])\s+/
  const blockBreakerRe = /^\s*(?:#{1,6}\s|>|\|)/

  const result: string[] = []
  let inList = false
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === "") {
      let j = i
      while (j < lines.length && lines[j].trim() === "") j++

      if (inList) {
        // Look past this blank run (and any further plain-prose lines) to
        // see whether the list resumes before a genuinely different block.
        let k = j
        let listResumes = false
        while (k < lines.length) {
          const peek = lines[k]
          if (peek.trim() === "") {
            k++
            continue
          }
          if (listMarkerRe.test(peek)) {
            listResumes = true
            break
          }
          if (blockBreakerRe.test(peek)) break
          k++
        }

        if (listResumes) {
          // Spurious internal blank line — drop it so marked() doesn't
          // treat it as the end of the list.
          i = j
          continue
        }
      }

      for (let n = i; n < j; n++) result.push("")
      inList = false
      i = j
      continue
    }

    if (listMarkerRe.test(line)) inList = true
    else if (blockBreakerRe.test(line)) inList = false

    result.push(line)
    i++
  }

  return result.join("\n")
}

/**
 * Parses inline markers of the form <{[type, ...args]}> embedded in
 * exegesis translation text:
 *   <{["F", 1]}>          — footnote
 *   <{["Q", "1:2"]}>      — verse ref
 *   <{["RT", "arabic"]}>  — a chunk of right-to-left (Arabic) text quoted
 *                           within the commentary — a Qur'an verse, a
 *                           Hadith, or anything else in Arabic. No attempt
 *                           is made to classify which, or to pair it with a
 *                           translation: reliably telling a Qur'an quote
 *                           from a Hadith quote, or extracting a gloss that
 *                           genuinely translates just that quote, turned out
 *                           not to be mechanically tractable from this
 *                           source's structure. It renders as its own RTL
 *                           block; any translation/paraphrase the source
 *                           gives stays as ordinary surrounding prose.
 *
 * "F" and "Q" are converted to an <a class="inline-marker"> element with:
 *   data-marker-type  — the type string ("F", "Q")
 *   data-marker       — the full JSON array, HTML-attribute–encoded
 *
 * The rendered label is type-specific:
 *   "F" → <sup>N</sup>  (footnote superscript)
 *   "Q" → "chapter:verse" plain text (verse reference)
 */
export function parseInlineMarkers(text: string): string {
  return text.replace(/<\{(\[.*?\])\}>/g, (match, json: string) => {
    let marker: unknown[]
    try {
      marker = JSON.parse(json)
    } catch {
      return match
    }

    const [type, ...args] = marker as [string, ...unknown[]]

    if (type === "RT") {
      const arabic = escHtml(String(args[0] ?? ""))
      return (
        `<blockquote class="scripture-quote">` +
        `<p class="scripture-arabic" dir="rtl" lang="ar">${arabic}</p>` +
        `</blockquote>`
      )
    }

    let label: string
    if (type === "F") {
      label = `<sup>${args[0]}</sup>`
    } else if (type === "Q") {
      label = String(args[0])
    } else {
      return match
    }

    const typeClass = `marker-type-${type.toLowerCase()}`
    return `<a class="inline-marker ${typeClass}" data-marker-type="${type}" data-marker="${encAttr(json)}">${label}</a>`
  })
}

/** Reads the marker array from a clicked <a class="inline-marker"> element. */
export function readMarker(el: Element): unknown[] | null {
  const raw = el.getAttribute("data-marker")
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown[]
  } catch {
    return null
  }
}

/**
 * Full render pipeline shared by every place that turns exegesis/translation
 * markdown into HTML: normalize list-breaking blank lines, resolve inline
 * F/Q markers, then run markdown -> HTML conversion.
 */
export function renderExegesisMarkdown(text: string): string {
  return String(
    marked(parseInlineMarkers(preserveListContinuations(text)), {
      breaks: true,
    }),
  )
}

function encAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}
