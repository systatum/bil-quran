import { useCallback } from "react"

interface UseVirtualRowMeasurerOptions {
  index: number
  sizeMap: React.RefObject<Map<number, number>>
  virtualizer: any
}

/**
 * Essentially: prevents "white" gaps on screen resizing.
 *
 * When the font changes, view port changes, "re-render" so that
 * the height of the referenced row is calculated correctly, and
 * there is no empty region due to using old calculation
 */
export default function useVirtualRowMeasurer({
  index,
  sizeMap,
  virtualizer,
}: UseVirtualRowMeasurerOptions) {
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return

      const height = node.getBoundingClientRect().height
      const cached = sizeMap.current.get(index)

      if (cached !== height) {
        sizeMap.current.set(index, height)
        virtualizer.resizeItem(index, height)
      }
    },
    [index, sizeMap, virtualizer],
  )

  return ref
}
