import { useLayoutEffect, useMemo, useState } from "react"

/**
 * Aligner helps preserve the visual rhythm of interlinear text where
 * every word may have a different translation height.
 *
 * Without alignment, the second translation row would begin immediately
 * after each individual word's first translation, causing neighboring
 * words to drift vertically and making the text difficult to scan.
 *
 * The naïve solution is to align all words in the entire verse, but this
 * creates another problem: a single unusually tall translation forces every
 * other word in the verse to inherit the same spacing, wasting vertical
 * space and producing large empty regions.
 *
 * Instead, this hook treats each visual row independently.
 *
 * Example:
 *
 * Row 0
 *
 *   word A      word B      word C
 *   English     English     English
 *   (18px)      (52px)      (20px)
 *
 * => every English block in row 0 receives min-height: 52px
 *
 * Row 1
 *
 *   word D      word E
 *   English     English
 *   (16px)      (18px)
 *
 * => every English block in row 1 receives min-height: 18px
 *
 * Therefore, each line develops its own local alignment rather than being
 * constrained by unusually tall words elsewhere in the verse.
 *
 * Lifecycle:
 *
 * Render
 *   ↓
 * Collect word refs
 *   ↓
 * Discover which words occupy the same visual row
 *   ↓
 * Measure translation layers inside each row
 *   ↓
 * rowLayerHeights = {
 *   row0: { 0: 52, 1: 20 },
 *   row1: { 0: 18, 1: 16 }
 * }
 *   ↓
 * Render again
 *   ↓
 * Apply row-specific min-heights
 *
 * This hook only performs measurement and bookkeeping. Applying the
 * resulting heights remains the responsibility of the caller.
 */
export default function useAligner({ key }: { key: string }): AlignerResult {
  const wordRefs = useMemo(() => ({ current: [] as HTMLElement[] }), [key])
  const [wordRows, setWordRows] = useState<Record<number, number>>({})
  const [rowLayerHeights, setRowLayerHeights] = useState<
    Record<RowId, Record<LayerId, number>>
  >({})

  // observe changes due to resizing of the window, etc
  useLayoutEffect(() => {
    /**
     * Reconstructs the visual geometry produced by the browser.
     *
     * Since line wrapping depends on font metrics, viewport width, language,
     * and translation visibility, row boundaries cannot be known beforehand.
     *
     * Therefore we observe the actual rendered positions of the words,
     * group words that share approximately the same vertical coordinate,
     * and then measure translation layers within those local groups.
     *
     * Layout changes due to resizing, font loading, orientation changes, or
     * translation updates will be handled as well by an observer.
     */
    function recompute() {
      /**
       * Visual rows where the key is the rounded top coordinate of the row,
       * while the value contains all word elements occupying that row.
       */
      const rows: Record<number, HTMLElement[]> = {}

      for (const word of wordRefs.current) {
        if (!word) continue

        const top = Math.round(word.getBoundingClientRect().top)

        // find an existing row within 1px tolerance
        const rowTop = Object.keys(rows)
          .map(Number)
          .find((t) => Math.abs(t - top) <= 1)

        if (rowTop !== undefined) {
          rows[rowTop].push(word)
        } else {
          rows[top] = [word]
        }
      }

      const sortedRows = Object.entries(rows)
        .map(([top, words]) => ({
          top: Number(top),
          words,
        }))
        .sort((a, b) => a.top - b.top)

      /**
       * Reverse lookup allowing the caller to ask:
       * "Which visual row does word #17 belong to?"
       * Rather than: "Which words belong to row #3?"
       */
      const wordToRow: Record<number, number> = {}

      sortedRows.forEach(({ words }, rowIndex) => {
        words.forEach((word) => {
          const idx = Number(word.dataset.wordIndex)
          wordToRow[idx] = rowIndex
        })
      })

      setWordRows(wordToRow)

      const result: Record<number, Record<number, number>> = {}
      sortedRows.forEach(({ words }, rowIndex) => {
        result[rowIndex] = {}

        // determine number of translation layers
        const firstWord = words[0]
        const meanings = firstWord.querySelectorAll("[data-layer]")
        const layerCount = meanings.length

        for (let layer = 0; layer < layerCount; layer++) {
          let maxHeight = 0

          for (const word of words) {
            const el = word.querySelector<HTMLElement>(
              `[data-layer="${layer}"]`,
            )

            if (!el) continue

            maxHeight = Math.max(maxHeight, el.getBoundingClientRect().height)
          }

          result[rowIndex][layer] = maxHeight
        }
      })

      setRowLayerHeights(result)
    }

    const observer = new ResizeObserver(recompute)

    wordRefs.current.forEach((el) => observer.observe(el))

    recompute()

    return () => observer.disconnect()
  }, [key])

  return {
    wordRefs,
    wordRows,
    rowLayerHeights,
  }
}

export interface AlignerResult {
  /**
   * Maps a word index to the visual row in which the word eventually
   * appears after browser layout.
   *
   * Example:
   *
   * word 0 → row 0
   * word 1 → row 0
   * word 2 → row 0
   * word 3 → row 1
   * word 4 → row 1
   *
   * This mapping allows the caller to determine which row a word belongs
   * to and therefore which row-specific layer heights should be used.
   */
  wordRows: Record<number, number>

  /**
   * References to the outer Word elements.
   *
   * Each word acts as an anchor from which its position and translation
   * layers can later be discovered.
   *
   * Rather than assuming where line breaks occur, the hook lets the browser
   * perform normal text wrapping and then reconstructs the visual rows by
   * examining the rendered vertical positions of these word elements.
   */
  wordRefs: { current: HTMLElement[] }

  /**
   * Maximum height of each translation layer inside each visual row.
   *
   * Example:
   *
   * rowLayerHeights = {
   *   0: {
   *     0: 52, // English row 0
   *     1: 18  // Indonesian row 0
   *   },
   *   1: {
   *     0: 20, // English row 1
   *     1: 16  // Indonesian row 1
   *   }
   * }
   *
   * Unlike the previous verse-wide strategy, heights are isolated per row,
   * allowing dense rows to remain compact while still preserving alignment
   * among neighboring words.
   */
  rowLayerHeights: Record<number, Record<number, number>>
}

export type LayerIdentifier = number

type LayerId = number
type RowId = number
