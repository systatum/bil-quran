import useChaptersState from "@hooks/states/ChaptersState"
import { useEffect, useRef, useState } from "react"

/** Returns the chapterId:verse key of the first verse currently in the viewport. */
export default function useFirstVisibleVerse() {
  const { chapters } = useChaptersState()
  const [verseKey, setVerseKey] = useState<string | null>(null)

  const findTopRef = useRef<() => void>(() => {})
  findTopRef.current = () => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-verse]"),
    )
    if (els.length === 0) return

    let topEl: HTMLElement | null = null
    let topY = Infinity
    for (const el of els) {
      const rect = el.getBoundingClientRect()
      if (rect.bottom > 0 && rect.top < topY) {
        topY = rect.top
        topEl = el
      }
    }

    const key = topEl?.getAttribute("data-verse")
    if (key) setVerseKey(key)
  }

  useEffect(() => {
    const handler = () => findTopRef.current()
    window.addEventListener("scroll", handler, { capture: true, passive: true })
    return () =>
      window.removeEventListener("scroll", handler, { capture: true })
  }, [])

  // Re-check whenever chapters load so the bar shows without requiring a scroll.
  useEffect(() => {
    if (Object.keys(chapters).length > 0)
      requestAnimationFrame(() => findTopRef.current())
  }, [chapters])

  if (!verseKey) return { chapter: null, verse: null }
  const [ch, v] = verseKey.split(":").map(Number)
  return { chapter: chapters[ch] ?? null, verse: v ?? null }
}
