import { useLayoutEffect, useRef } from "react"

interface UseVirtualRowMeasurerOptions {
  index: number
  sizeMap: React.RefObject<Map<number, number>>
  virtualizer: any
  deps?: React.DependencyList
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
  deps = [],
}: UseVirtualRowMeasurerOptions) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    // It stores the current requestAnimationFrame ID so you can cancel stale
    // scheduled measurements. Without cancellation, rapid resize/orientation
    // events queue many measurements simultaneously, which can cause thrashing
    // as even stale measurements can race newer ones, rendering unwanted white gaps.
    let frame = 0

    const measure = () => {
      cancelAnimationFrame(frame)

      frame = requestAnimationFrame(() => {
        const height = el.getBoundingClientRect().height
        const cached = sizeMap.current.get(index)

        if (cached !== height) {
          sizeMap.current.set(index, height)

          virtualizer.resizeItem(index, height)
        }
      })
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(el)

    window.addEventListener("resize", measure)
    window.addEventListener("orientationchange", measure)

    return () => {
      cancelAnimationFrame(frame)

      observer.disconnect()

      window.removeEventListener("resize", measure)
      window.removeEventListener("orientationchange", measure)
    }
  }, [index, ...deps])

  return ref
}
