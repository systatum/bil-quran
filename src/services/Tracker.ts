import posthog, { isPostHogConfigured } from "../posthog"

const Event = {
  VerseBookmarked: "verse.bookmarked",
  VerseNoteSaved: "verse.note_saved",
  VerseExegesisOpened: "verse.exegesis_opened",
  VerseHighlightApplied: "verse.highlight_applied",
  VerseHighlightRemoved: "verse.highlight_removed",
  SearchVerseSelected: "search.verse_selected",
  SearchJuzSelected: "search.juz_selected",
  BackupExportCopied: "backup.export_copied",
  BackupExportDownloaded: "backup.export_downloaded",
  BackupExportRestored: "backup.export_restored",
  SettingsReaderChanged: "settings.reader_changed",
} as const

type EventName = (typeof Event)[keyof typeof Event]

// Sole point of contact with the underlying analytics provider (currently
// PostHog), so swapping providers only means changing this file.
class TrackerService {
  readonly Event = Event

  track(name: EventName, properties?: Record<string, unknown>) {
    if (!isPostHogConfigured) return
    posthog.capture(name, properties)
  }

  captureException(error: unknown) {
    if (!isPostHogConfigured) return
    posthog.captureException(error)
  }
}

const Tracker = new TrackerService()
export default Tracker
