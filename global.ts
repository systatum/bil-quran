import type { PostHog } from "@posthog/types"

interface Window {
  /** Etched into build/index.html by scripts/inject-build-info.js at build time. */
  __systatum_bilquran?: { version: string; releaseDate: string }
  posthog?: PostHog
}
