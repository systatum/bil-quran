/**
 * @jest-environment node
 */

import {
  parseInlineMarkers,
  preserveListContinuations,
  renderExegesisMarkdown,
} from "../../src/services/markdown"

describe("preserveListContinuations", () => {
  it("collapses a blank line inside a list item when the list resumes afterward", () => {
    // Mirrors the real-world bug: an item's text embeds a blank line (e.g.
    // stitched from two source paragraphs), which — per CommonMark — ends
    // the list unless the following unindented line is collapsed away.
    const buggy = [
      "1. First item is fine.",
      "2. Second item has a stray blank line in its content.",
      "",
      " Continuation text that would otherwise break the list.",
      "3. Third item should still be item 3, not a new list.",
      "4. Fourth item follows normally.",
    ].join("\n")

    const fixed = preserveListContinuations(buggy)

    expect(fixed).toBe(
      [
        "1. First item is fine.",
        "2. Second item has a stray blank line in its content.",
        " Continuation text that would otherwise break the list.",
        "3. Third item should still be item 3, not a new list.",
        "4. Fourth item follows normally.",
      ].join("\n"),
    )
  })

  it("leaves a genuine paragraph break after the list ends untouched", () => {
    const text = [
      "1. First item.",
      "2. Second item.",
      "",
      "An unrelated closing paragraph with no further list items after it.",
    ].join("\n")

    expect(preserveListContinuations(text)).toBe(text)
  })

  it("leaves plain prose with no lists untouched", () => {
    const text = [
      "First paragraph of prose.",
      "",
      "Second paragraph of prose, entirely unrelated.",
    ].join("\n")

    expect(preserveListContinuations(text)).toBe(text)
  })

  it("stops collapsing once a heading follows the list", () => {
    const text = [
      "1. Item one.",
      "2. Item two.",
      "",
      "## A Heading",
      "",
      "Some text after.",
    ].join("\n")

    expect(preserveListContinuations(text)).toBe(text)
  })
})

describe("renderExegesisMarkdown", () => {
  it("renders a list whose item embeds a blank line as a single continuous list", () => {
    const buggy = [
      "15. First unaffected item.",
      "16. Item whose commentary continues past a stray blank line.",
      "",
      " This trailing aside lacks the indentation needed to stay part of",
      "item 16 under strict CommonMark rules.",
      "17. This item must still render as part of the same list.",
      "18. So must this one.",
    ].join("\n")

    const html = renderExegesisMarkdown(buggy)

    // Exactly one ordered list — not split into a list, a stray paragraph,
    // and (at best) a second, disconnected list.
    expect(html.match(/<ol/g)).toHaveLength(1)
    expect(html.match(/<li>/g)).toHaveLength(4)

    // Item 17's text must be wrapped in a real <li>, not left as loose
    // paragraph text with a literal "17." prefix.
    expect(html).toMatch(
      /<li>This item must still render as part of the same list\.<\/li>/,
    )
    expect(html).not.toMatch(/17\.\s*This item/)
  })

  it("still renders a genuine trailing paragraph outside the list", () => {
    const text = [
      "1. First item.",
      "2. Second item.",
      "",
      "A wholly unrelated closing paragraph.",
    ].join("\n")

    const html = renderExegesisMarkdown(text)

    expect(html.match(/<ol/g)).toHaveLength(1)
    expect(html.match(/<li>/g)).toHaveLength(2)
    expect(html).toMatch(/<p>A wholly unrelated closing paragraph\.<\/p>/)
  })
})

describe("parseInlineMarkers", () => {
  it("renders an RT marker as an RTL blockquote with just the Arabic text", () => {
    const html = parseInlineMarkers('<{["RT", "بِسْمِ اللَّهِ"]}>')

    expect(html).toBe(
      '<blockquote class="scripture-quote">' +
        '<p class="scripture-arabic" dir="rtl" lang="ar">بِسْمِ اللَّهِ</p>' +
        "</blockquote>",
    )
  })

  it("escapes HTML-significant characters inside RT text", () => {
    const html = parseInlineMarkers('<{["RT", "A < B & C"]}>')

    expect(html).toContain("A &lt; B &amp; C")
  })
})
