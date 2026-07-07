function normalizeTypography(text) {
  return text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
}

function normalizeWhitespace(text) {
  return normalizeTypography(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function indentationLevel(node) {
  if (!node.classList) {
    return 0
  }

  const match = Array.from(node.classList)
    .map((cls) => cls.match(/^n(\d+)$/))
    .find(Boolean)

  if (!match) {
    return 0
  }

  return Number(match[1])
}

function isIndentedBlock(node) {
  return indentationLevel(node) > 0
}

function childrenToMarkdown(node) {
  return Array.from(node.childNodes).map(nodeToMarkdown).join("")
}

function nodeToMarkdown(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ""
  }

  const tag = node.tagName.toLowerCase()
  const level = indentationLevel(node)

  if (isIndentedBlock(node)) {
    return "\n" + "\u00A0".repeat(level) + childrenToMarkdown(node)
  }

  switch (tag) {
    case "strong":
    case "b":
      return `**${childrenToMarkdown(node)}**`

    case "em":
    case "i":
      return `_${childrenToMarkdown(node)}_`

    case "br":
      return "\n"

    case "p":
      return childrenToMarkdown(node)

    case "div":
      return childrenToMarkdown(node)

    default:
      return childrenToMarkdown(node)
  }
}

function parseDescription() {
  const lead = document.querySelector(".lead")

  if (!lead) {
    return ""
  }

  return Array.from(lead.querySelectorAll("p"))
    .map((p) => normalizeWhitespace(nodeToMarkdown(p).replace(/[«»]/g, "")))
    .join("\n")
}

function extractFootnoteText(li) {
  const root = li.cloneNode(true)

  let currentSurah = null

  root.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href") || ""
    const text = a.textContent.trim()

    const match = href.match(/#(\d+):(\d+)/)

    if (match) {
      currentSurah = match[1]

      a.replaceWith(`<{["Q", "${match[1]}:${match[2]}"]}>`)

      return
    }

    if (currentSurah && /^\d+$/.test(text)) {
      a.replaceWith(`<{["Q", "${currentSurah}:${text}"]}>`)
    }
  })

  return normalizeWhitespace(nodeToMarkdown(root))
}

function parseTranslation(section) {
  const translationNode = Array.from(
    section.querySelectorAll(".trans-content-ltr"),
  ).find((node) => node.tagName !== "H2")

  if (!translationNode) {
    return {
      translation: "",
      footnotes: {},
    }
  }

  const root = translationNode.cloneNode(true)

  const commentary = root.querySelector(".trans-commentary")

  const verseFootnotes = {}

  let footnoteCounter = 0

  root.querySelectorAll("sup").forEach((sup) => {
    footnoteCounter += 1

    sup.replaceWith(`<{["F", ${footnoteCounter}]}>`)
  })

  if (commentary) {
    commentary.querySelectorAll("li").forEach((li, index) => {
      verseFootnotes[index + 1] = extractFootnoteText(li)
    })

    commentary.remove()
  }

  const translation = normalizeWhitespace(nodeToMarkdown(root))

  return {
    translation,
    footnotes: verseFootnotes,
  }
}

function parseChapter() {
  const chapterHeader = document.querySelector(".c-header h2")

  const chapterId = Number(chapterHeader?.textContent.match(/\d+/)?.[0])

  const description = parseDescription()

  const translations = {}
  const footnotes = {}

  document.querySelectorAll("article > section").forEach((section) => {
    const verseNode = section.querySelector(".verse-number")

    if (!verseNode) {
      return
    }

    const verseId = Number(verseNode.textContent.trim())

    const parsed = parseTranslation(section)

    translations[verseId] = parsed.translation

    if (Object.keys(parsed.footnotes).length > 0) {
      footnotes[verseId] = parsed.footnotes
    }
  })

  return {
    chapterId,
    description,
    footnotes,
    translations,
  }
}

function scrape() {
  const result = parseChapter()
  console.log(result)
  copy(JSON.stringify(result, null, 2))
}
