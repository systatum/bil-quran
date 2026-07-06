// Browser-side helpers injected via addInitScript in visitFresh.
// Declaring them here avoids (window as any) casts in page.evaluate callbacks.
interface Window {
  __isArabicWord: (s: Element) => boolean
}
