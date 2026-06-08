import { RefObject, useEffect, useState } from "react"

/**
 * Observe an element to get its positioning information, ie its
 * height, x/y position, etc.
 *
 * @param ref to the element being observed
 * @returns DOMrect
 */
export default function usePositioningObserver<T extends HTMLElement>(
  ref: RefObject<T | null>,
) {
  const [rect, setRect] = useState<DOMRectReadOnly | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const update = () => {
      setRect(element.getBoundingClientRect())
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(element)

    window.addEventListener("resize", update)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [ref])

  return rect
}
