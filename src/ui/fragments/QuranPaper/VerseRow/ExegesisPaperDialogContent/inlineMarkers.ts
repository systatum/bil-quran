/**
 * Parses inline markers of the form <{[type, ...args]}> embedded in
 * exegesis translation text (e.g. <{["F", 1]}> for footnote, <{["Q","1:2"]}> for a verse ref).
 *
 * Each marker is converted to an <a class="inline-marker"> element with:
 *   data-marker-type  — the type string ("F", "Q", …)
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

function encAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
}
