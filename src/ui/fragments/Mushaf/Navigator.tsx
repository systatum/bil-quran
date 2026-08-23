import { QuranPage } from "@constants/records/Pagination"
import { ThemeMode } from "@constants/theme"
import useChaptersState from "@hooks/states/ChaptersState"
import usePaginationState from "@hooks/states/PaginationState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { RiArrowLeftLine, RiArrowRightLine } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { SearchSheet } from "@ui/fragments/AppNavbar/SearchSheet"
import { useState } from "react"
import styled, { css } from "styled-components"

interface NavigatorProps {
  mushaf: string
  currentPage: number
  totalPages: number
  /** Chapter shown in the pill's center; the page's first chapter. */
  chapterId: number | null
  visible: boolean
}

/** Finds which mushaf page contains a given chapter/verse, 1-indexed. */
function findMushafPageNumber(
  pages: QuranPage[],
  chapterId: number,
  verse: number,
): number | null {
  for (let i = 0; i < pages.length; i++) {
    const chapterIndex = pages[i].chapterIds.indexOf(chapterId)
    if (chapterIndex === -1) continue
    const [start, end] = pages[i].verseNumbers[chapterIndex]
    if (verse >= start && verse <= end) return i + 1
  }
  return null
}

export default function Navigator({
  mushaf,
  currentPage,
  totalPages,
  chapterId,
  visible,
}: NavigatorProps) {
  const navigate = useNavigate()
  const {
    userSettings: { theme },
  } = useUserSettingsState()
  const {
    getChapterArabicName,
    getChapterTransliteratedName,
    getChapterMeaning,
  } = useChaptersState()
  const { juzPages } = usePaginationState()
  const [searchOpen, setSearchOpen] = useState(false)

  function goToPage(target: number) {
    if (target < 1 || target > totalPages) return
    navigate({
      to: "/m/$mushaf/$page",
      params: { mushaf, page: String(target) },
    })
  }

  function goToPageContaining(pickedChapterId: number, verse: number) {
    const pageNumber = findMushafPageNumber(
      juzPages.flat(),
      pickedChapterId,
      verse,
    )
    if (pageNumber != null) goToPage(pageNumber)
  }

  return (
    <>
      <Pill $theme={theme} $visible={visible}>
        <NavButton
          aria-label="previous page"
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
        >
          <RiArrowRightLine size={13} />
        </NavButton>

        <ChapterInfo
          aria-label="navigator-chapter-info"
          onClick={() => setSearchOpen((open) => !open)}
        >
          <ChapterArabicName>
            {chapterId != null ? getChapterArabicName(chapterId) : null}
          </ChapterArabicName>
          <ChapterSubInfo>
            <span>
              {chapterId != null
                ? getChapterTransliteratedName(chapterId)
                : null}
            </span>
            <Dot />
            <span>{chapterId != null ? getChapterMeaning(chapterId) : null}</span>
          </ChapterSubInfo>
        </ChapterInfo>

        <NavButton
          aria-label="next page"
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(currentPage + 1)}
        >
          <RiArrowLeftLine size={13} />
        </NavButton>
      </Pill>

      {searchOpen && (
        <SearchBackdrop
          aria-label="navigator-search-backdrop"
          onClick={() => setSearchOpen(false)}
        />
      )}
      <SearchSheet
        isOpen={searchOpen}
        anchor="bottom"
        onAfterSearch={() => setSearchOpen(false)}
        onPick={goToPageContaining}
        containerStyle={css`
          padding-bottom: 20px;
        `}
      />
    </>
  )
}

const Pill = styled.div<{ $theme: ThemeMode; $visible: boolean }>`
  position: absolute;
  bottom: 6em;
  left: 50%;
  transform: translateX(-50%);
  width: 64%;
  max-width: 336px;
  direction: ltr;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 8px;
  border-radius: 999px;

  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};
  transition: opacity 0.25s ease-in-out;

  background: ${({ $theme }) =>
    $theme === "dark" ? "rgba(30, 30, 30, 0.55)" : "rgba(255, 255, 255, 0.55)"};
  border: 1px solid
    ${({ $theme }) =>
      $theme === "dark"
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(255, 255, 255, 0.6)"};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  color: ${({ $theme }) => ($theme === "dark" ? "#e8ddc7" : "#2b2b2b")};
`

/** Catches clicks outside the search sheet to dismiss it - sits just below
 * the sheet's own z-index (9992999) so the sheet's own content still wins. */
const SearchBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9992998;
`

const NavButton = styled.button`
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: rgba(128, 128, 128, 0.2);
  color: inherit;
  cursor: pointer;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  &:not(:disabled):hover {
    background: rgba(128, 128, 128, 0.35);
  }
`

const ChapterInfo = styled.div`
  flex: 1;
  min-width: 0;
  height: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`

const ChapterArabicName = styled.div`
  flex: 1.7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  font-family: "NotoNaskhArabic", serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`

const ChapterSubInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 9px;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
`

const Dot = styled.span`
  flex-shrink: 0;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
`
