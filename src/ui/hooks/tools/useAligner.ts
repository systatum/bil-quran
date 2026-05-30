import { useLayoutEffect, useMemo, useState } from "react"

/**
 * Aligner helps align different rows where each cell in the row might
 * have different height. Even with such differences, by using this aligner,
 * it is possible that the next row has all of its cell aligned nicely,
 * creating a proper visual separation between rows. It has this steps for
 * it to work:
 *
 * Render
 *  ↓
 * Collect refs
 *  ↓
 * Measure heights
 *  ↓
 * layerHeights = {
 *  0: 52,
 *  1: 18,
 * }
 *  ↓
 * Render again
 *  ↓
 * Apply min-height
 *
 * This hook is responsible at the measuring-level, the last level, which is
 * applying the minimum height, is at the responsibility of the hook's user.
 */
export default function useAligner({ key }: { key: string }) {
  /**
   * refs for all (translation) elements; (translation) layers must stay vertically
   * aligned (across all words in a verse). We measure every rendered (translation)
   * layer and keep the maximum height for each such layer.
   *
   * Example:
   * layer 0 (English)
   *   word A = 36px
   *   word B = 18px
   *   word C = 52px
   *
   * => all English blocks get min-height: 52px
   *
   * It's possible user select another language, so in that case, could be, layer
   * 0 is English, layer 1 is Indonesian
   *
   *   0 -> all English Meaning elements
   *   1 -> all Indonesian Meaning elements
   *
   * all in layer 1 must line up exactly after layer 0, even if layer 0 height varied.
   */
  const refs = useMemo(
    () => ({ current: {} as Record<LayerIdentifier, HTMLElement[]> }),
    [key],
  )

  /**
   * Maximum measured height per translation layer.
   */
  const [layerHeights, setLayerHeights] = useState<
    Record<LayerIdentifier, number>
  >({})

  // observe changes due to resizing of the window, etc
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => {
      const heights: Record<number, number> = {}

      for (const [layer, elements] of Object.entries(refs.current)) {
        heights[Number(layer)] = Math.max(
          0,
          ...elements.map((el) => el.getBoundingClientRect().height),
        )
      }

      setLayerHeights(heights)
    })

    Object.values(refs.current)
      .flat()
      .forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [key])

  return {
    refs,
    layerHeights,
  }
}

export type LayerIdentifier = number
