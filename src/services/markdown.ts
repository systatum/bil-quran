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
 *   <{["F", 1]}>
 *     - footnote
 *   <{["Q", "1:2"]}>
 *     - verse ref
 *   <{["RT", "arabic", meaning]}>
 *     - a chunk of right-to-left (Arabic) text quoted within the commentary, can be
 *       a Qur'an verse, a Hadith, or anything else in Arabic. The third argument
 *       `meaning` is optional aka left out when absent, attached to the RTL text.
 *       The `meaning` block itself can contain another RT-block, so RT can nest.
 *   <{["IRT", "arabic", meaning]}>
 *     - like RT, but sitting inline in the middle of an ordinary sentence
 *
 * "F" and "Q" are converted to an <a class="inline-marker"> element with:
 *   data-marker-type  — the type string ("F", "Q")
 *   data-marker       — the full JSON array, HTML-attribute–encoded
 *
 * The rendered label is type-specific:
 *   "F" → <sup>N</sup>  (footnote superscript)
 *   "Q" → "chapter:verse" plain text (verse reference)
 *
 * Markers can nest (an RT's `meaning` argument can itself contain a Q/F
 * marker's literal text), so this can't just be a single non-greedy regex
 * replace — `<\{(\[.*?\])\}>` stops at the *first* `]}>` it finds, which for
 * nested input is the inner marker's, not the outer one's, corrupting the
 * parse. Instead this walks the string, and for each `<{[` uses
 * `findArrayEnd` to locate the actual matching `]` (tracking `[`/`]` depth
 * while skipping over JSON string contents, so brackets inside a quoted
 * string don't count), then checks for `}>` right after.
 */
export function parseInlineMarkers(text: string): string {
  return scanMarkers(text, false)
}

/**
 * Returns the index right after the "]" that matches the "[" at `start`,
 * or -1 if it never balances. Tracks JSON string state so bracket
 * characters inside a quoted string (e.g. an already-rendered nested
 * marker's own literal text) don't affect the depth count.
 */
function findArrayEnd(text: string, start: number): number {
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i++) {
    const c = text[i]

    if (inString) {
      if (escaped) escaped = false
      else if (c === "\\") escaped = true
      else if (c === '"') inString = false
      continue
    }

    if (c === '"') inString = true
    else if (c === "[") depth++
    else if (c === "]") {
      depth--
      if (depth === 0) return i + 1
    }
  }

  return -1
}

/**
 * Shared scan used both at the top level (parseInlineMarkers) and
 * recursively for a marker argument that itself may contain markers (e.g.
 * RT's `meaning`). `escapePlainText` controls whether non-marker text gets
 * HTML-escaped as it's copied through:
 *  - top level: false — this text still goes through marked() afterward,
 *    which does its own escaping; double-escaping here would corrupt it.
 *  - nested (inside an argument): true — the returned HTML is spliced
 *    directly into a hand-built element (e.g. the RT blockquote) that
 *    bypasses marked() entirely, so this is the only escaping pass it gets.
 */
function scanMarkers(text: string, escapePlainText: boolean): string {
  let result = ""
  let plain = ""
  let i = 0

  const flushPlain = () => {
    if (plain) result += escapePlainText ? escHtml(plain) : plain
    plain = ""
  }

  while (i < text.length) {
    if (text.startsWith("<{[", i)) {
      const arrStart = i + 2
      const arrEnd = findArrayEnd(text, arrStart)

      if (arrEnd !== -1 && text.startsWith("}>", arrEnd)) {
        const json = text.slice(arrStart, arrEnd)
        const rendered = renderMarker(json)

        if (rendered != null) {
          flushPlain()
          result += rendered
          i = arrEnd + 2
          continue
        }
      }
    }

    plain += text[i]
    i++
  }

  flushPlain()
  return result
}

/** Renders a marker argument or null if malformed */
function renderMarker(json: string): string | null {
  let marker: unknown[]
  try {
    marker = JSON.parse(json)
  } catch {
    return null
  }

  const [type, ...args] = marker as [string, ...unknown[]]

  if (type === "RT") {
    const arabic = escHtml(String(args[0] ?? ""))
    const meaning = args[1] == null ? null : scanMarkers(String(args[1]), true)
    // `<p>` can't contain a nested block-level `<blockquote>`, so only fall
    // back to `<div>` when the meaning itself nests another RT block.
    const meaningTag = meaning?.includes("<blockquote") ? "div" : "p"
    const meaningBlock = meaning
      ? `<hr class="scripture-divider" /><${meaningTag} class="scripture-meaning">${meaning}</${meaningTag}>`
      : ""

    return (
      `<blockquote class="scripture-quote">` +
      `<p class="scripture-arabic" dir="rtl" lang="ar">${arabic}</p>` +
      meaningBlock +
      `</blockquote>`
    )
  }

  if (type === "IRT") {
    const arabic = escHtml(String(args[0] ?? ""))
    const meaning = args[1] == null ? null : scanMarkers(String(args[1]), true)
    // The "(" / ")" are added here for display only — `meaning` itself is
    // stored without them, same convention as RT's own `meaning` argument.
    const meaningSpan = meaning
      ? ` <span class="scripture-inline-meaning">(${meaning})</span>`
      : ""

    return (
      `<span class="scripture-inline">` +
      `<span class="scripture-inline-arabic" dir="rtl" lang="ar">${arabic}</span>` +
      meaningSpan +
      `</span>`
    )
  }

  let label: string
  if (type === "F") {
    label = `<sup>${args[0]}</sup>`
  } else if (type === "Q") {
    // args[1], when present, overrides the displayed label (still args[0]
    // — the "c:v" string — for navigation) e.g. a verse range like
    // "71:26-27" renders as two adjacent Q markers, the second one
    // showing just "27" rather than the redundant "71:27".
    label = args[1] != null ? String(args[1]) : String(args[0])
  } else {
    return null
  }

  const typeClass = `marker-type-${type.toLowerCase()}`
  return `<a class="inline-marker ${typeClass}" data-marker-type="${type}" data-marker="${encAttr(json)}">${label}</a>`
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
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
