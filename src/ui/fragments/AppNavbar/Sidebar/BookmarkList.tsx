import { repo } from "@db/repo"
import useChaptersState from "@hooks/states/ChaptersState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import useToast from "@hooks/tools/useToast"
import { messages } from "@i18n/message"
import { unpackIPC } from "@services/Converter"
import LOGGER from "@services/Logger"
import ClippedContent from "@ui/fragments/ClippedContent"
import { WordCell } from "@ui/fragments/QuranPaper/VerseRow"
import InterlinearText from "@ui/fragments/QuranPaper/VerseRow/InterlinearText"
import { useEffect, useState } from "react"
import { useIntl } from "react-intl"
import styled from "styled-components"

export default function BookmarkList({ height }: { height: number }) {
  const { formatMessage } = useIntl()
  const { errorToast } = useToast()
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
        errorToast(
          formatMessage({ id: messages.errors.bookmarkFetchFailed }),
          formatMessage({ id: messages.bookmarks_and_notes }),
        )
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
          errorToast(
            verseKeyError,
            formatMessage({ id: messages.bookmarks_and_notes }),
          )
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
              compact={true}
            />
            {bookmark.note && <BookmarkNote>{bookmark.note}</BookmarkNote>}
          </ClippedContent>
        )
      })}
    </div>
  )
}

const BookmarkNote = styled.p`
  border-top: 1px solid #daccb4;
  padding: 4px;
  padding-bottom: 0;
  user-select: text;
`
