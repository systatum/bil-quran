import { repo } from "@db/repo"
import useChaptersState from "@hooks/states/ChaptersState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { messages } from "@i18n/message"
import { unpackIPC } from "@services/Converter"
import LOGGER from "@services/Logger"
import ClippedContent from "@ui/fragments/ClippedContent"
import { WordCell } from "@ui/fragments/QuranPaper/VerseRow"
import InterlinearText from "@ui/fragments/QuranPaper/VerseRow/InterlinearText"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useIntl } from "react-intl"

export default function BookmarkList({ height }: { height: number }) {
  const { formatMessage } = useIntl()
  const {
    userSettings: { bookmarks, font },
  } = useUserSettingsState()
  const { getChapterMeaning, getChapterTransliteratedName } = useChaptersState()
  const [verses, setVerses] = useState<Record<string, WordCell[]>>({})
  const hasNoBookmarks =
    bookmarks == null ||
    bookmarks.list == null ||
    Object.keys(bookmarks.list).length == 0

  // load the verses
  useEffect(() => {
    if (hasNoBookmarks) return
    ;(async function () {
      try {
        const bookmarksList = Object.values(bookmarks.list)
        LOGGER.debug(`Retrieving ${bookmarksList.length} bookmarks`)
        const versesIPC = await Promise.all(
          Object.values(bookmarks.list).map((bookmark) => {
            const [chapterId, verseId] = bookmark.key.split(":").map(Number)
            const retrievalPromise = repo.words.all({ chapterId, verseId })
            return retrievalPromise
          }),
        )

        const verseKeys = Object.keys(bookmarks.list)
        const verses: Record<string, WordCell[]> = Object.fromEntries(
          versesIPC.map((verseIPC, idx) => {
            const verseWords = unpackIPC(verseIPC)
            const wordCell: WordCell[] = verseWords.map((w) => ({
              ...w,
              meanings: {},
            }))
            return [verseKeys[idx], wordCell]
          }),
        )
        setVerses(verses)
      } catch (e) {
        toast.error("Failed getting all the bookmarked verses")
        LOGGER.error(e)
      }
    })()
  }, [bookmarks])

  if (hasNoBookmarks)
    return (
      <p style={{ padding: "20px 30px" }}>
        {formatMessage({ id: messages.notice.bookmark.noDataYet })}
      </p>
    )

  return (
    <div
      id="bookmark-list"
      style={{
        padding: "10px 15px",
        overflowY: "auto",
        maxHeight: `${height}px`,
      }}
    >
      {Object.entries(verses).map(([verseKey, verseWords]) => {
        if (bookmarks == null) return <></>

        // get the bookmark data
        const bookmark = bookmarks.list[verseKey]
        if (bookmark == null) {
          const verseKeyError = formatMessage({
            id: messages.errors.bookmarkDataNotFound,
          })
          LOGGER.error(`${verseKeyError}: ${verseKey}`)
          toast.error(`${verseKeyError}: ${verseKey}`)
        }

        const [chapterId, verseId] = verseKey.split(":").map(Number)
        const chapterLatinName = getChapterTransliteratedName(chapterId)
        const chapterMeaning = getChapterMeaning(chapterId)
        const label = `${chapterId} (${chapterLatinName} / ${chapterMeaning}) : ${verseId}`

        return (
          <ClippedContent
            key={bookmark.key}
            label={label}
            style={{ margin: "15px 0" }}
          >
            <InterlinearText
              id={bookmark.key}
              arabicFont={{ ...font.arabic, size: 30 }}
              showMeaning={false}
              isForLearning={false}
              words={verseWords}
            />
          </ClippedContent>
        )
      })}
    </div>
  )
}
